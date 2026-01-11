import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Lock, KeyRound, CheckCircle, LogOut } from 'lucide-react';

export default function TrocaSenhaObrigatoria() {
    const { api, logout, user } = useAuth();
    const { notify } = useNotification();
    const navigate = useNavigate();
    
    const [senha, setSenha] = useState('');
    const [confirmar, setConfirmar] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (senha.length < 6) return notify.warning("A senha deve ter no mínimo 6 caracteres.");
        if (senha !== confirmar) return notify.warning("As senhas não coincidem.");

        setLoading(true);
        try {
            // Usa a rota que criamos no views.py
            await api.post('operadores/trocar-senha/', { nova_senha: senha });
            
            notify.success("Senha atualizada! Você já pode usar o sistema.");
            
            // Força um reload da página para atualizar o contexto (e a flag force_password_change sumir)
            window.location.href = '/dashboard'; 
            
        } catch (error) {
            console.error(error);
            notify.error("Erro ao alterar senha.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
                <div className="text-center mb-8">
                    <div className="bg-red-50 dark:bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} className="text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Troca de Senha Obrigatória</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                        Olá, <b>{user?.first_name || user?.username}</b>. Por segurança, você precisa definir uma nova senha antes de continuar.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nova Senha</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-3 text-slate-400" size={18}/>
                            <input 
                                type="password" 
                                className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                                placeholder="Mínimo 6 caracteres"
                                value={senha}
                                onChange={e => setSenha(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirmar Senha</label>
                        <div className="relative">
                            <CheckCircle className="absolute left-3 top-3 text-slate-400" size={18}/>
                            <input 
                                type="password" 
                                className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                                placeholder="Repita a senha"
                                value={confirmar}
                                onChange={e => setConfirmar(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 mt-4"
                    >
                        {loading ? 'Salvando...' : 'Definir Nova Senha'}
                    </button>
                </form>

                <div className="mt-6 text-center border-t border-slate-100 dark:border-slate-700 pt-4">
                    <button onClick={logout} className="text-sm text-slate-500 hover:text-red-500 flex items-center justify-center gap-2 w-full">
                        <LogOut size={14}/> Sair da conta
                    </button>
                </div>
            </div>
        </div>
    );
}
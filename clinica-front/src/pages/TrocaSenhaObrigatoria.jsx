import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Lock, KeyRound, CheckCircle, LogOut, Loader2, ShieldAlert, Eye, EyeOff } from 'lucide-react';

export default function TrocaSenhaObrigatoria() {
    const { api, logout, user } = useAuth();
    const { notify, confirmDialog } = useNotification();
    
    const [senha, setSenha] = useState('');
    const [confirmar, setConfirmar] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (senha.length < 6) return notify.warning("A nova senha deve ter no mínimo 6 caracteres.");
        if (senha !== confirmar) return notify.warning("A confirmação de senha não coincide.");

        setLoading(true);
        try {
            await api.post('operadores/trocar-senha/', { nova_senha: senha });
            
            notify.success("Segurança atualizada! Redirecionando...");
            
            // Pequeno delay para o usuário ler a notificação de sucesso
            setTimeout(() => {
                window.location.href = '/dashboard'; 
            }, 1000);
            
        } catch (error) {
            const msg = error.response?.data?.error || "Erro ao processar a troca de senha.";
            notify.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        const confirm = await confirmDialog(
            "Deseja realmente sair? Você precisará trocar sua senha no próximo acesso.",
            "Sair do Sistema",
            "Sair agora",
            "Permanecer",
            "warning"
        );
        if (confirm) logout();
    };

    const isMatch = senha && confirmar && senha === confirmar;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 selection:bg-red-100 dark:selection:bg-red-900/30">
            <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-[32px] shadow-2xl p-10 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-500">
                
                <div className="text-center mb-10">
                    <div className="bg-red-50 dark:bg-red-900/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-red-100 dark:border-red-900/30">
                        <ShieldAlert size={40} className="text-red-600 animate-pulse" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Ação Obrigatória</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-3 text-sm font-medium leading-relaxed">
                        Olá, <span className="text-slate-900 dark:text-white font-bold">{user?.first_name || user?.username}</span>.<br/> 
                        Sua senha expirou ou foi resetada. Por favor, defina uma nova credencial para continuar.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="relative">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nova Senha</label>
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-3.5 text-slate-400" size={18}/>
                            <input 
                                type={showPassword ? "text" : "password"}
                                className={`w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl dark:text-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold placeholder:font-normal ${senha.length > 0 && senha.length < 6 ? 'border-orange-300' : 'border-slate-100 dark:border-slate-700 focus:border-red-500'}`}
                                placeholder="Crie uma senha forte"
                                value={senha}
                                onChange={e => setSenha(e.target.value)}
                                required
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Confirmar Nova Senha</label>
                        <div className="relative">
                            <CheckCircle className={`absolute left-4 top-3.5 transition-colors ${isMatch ? 'text-emerald-500' : 'text-slate-400'}`} size={18}/>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl dark:text-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold placeholder:font-normal ${confirmar.length > 0 ? (isMatch ? 'border-emerald-500/50' : 'border-red-500/50') : 'border-slate-100 dark:border-slate-700 focus:border-red-500'}`}
                                placeholder="Repita a nova senha"
                                value={confirmar}
                                onChange={e => setConfirmar(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || !isMatch}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs tracking-widest py-4 rounded-2xl shadow-xl shadow-red-500/20 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed mt-6"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin" size={18}/>
                                <span>Processando...</span>
                            </div>
                        ) : 'Atualizar Credenciais'}
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-slate-100 dark:border-slate-700 pt-6">
                    <button 
                        onClick={handleLogout} 
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center gap-2 w-full"
                    >
                        <LogOut size={14}/> Sair da conta atual
                    </button>
                </div>
            </div>
        </div>
    );
}
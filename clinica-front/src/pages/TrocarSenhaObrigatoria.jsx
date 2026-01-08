import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';

export default function TrocarSenhaObrigatoria() {
  const { api, logout } = useAuth();
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (senha !== confirmar) return alert('Senhas não conferem.');
    if (senha.length < 6) return alert('Mínimo 6 caracteres.');
    setLoading(true);
    try {
      await api.post('operadores/trocar-senha/', { nova_senha: senha });
      alert('Sucesso! Entre novamente.');
      logout();
      navigate('/');
    } catch (e) { alert('Erro ao alterar.'); } 
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden border border-slate-200 p-8">
        <div className="text-center mb-6">
            <KeyRound size={40} className="text-orange-600 mx-auto mb-2" />
            <h1 className="text-xl font-bold text-slate-800">Troca de Senha Obrigatória</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)} className="w-full border p-3 rounded" placeholder="Nova Senha" required/>
            <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} className="w-full border p-3 rounded" placeholder="Confirmar Senha" required/>
            <button disabled={loading} className="w-full bg-slate-800 text-white font-bold py-3 rounded">{loading ? '...' : 'Atualizar Senha'}</button>
            <button type="button" onClick={()=>{logout(); navigate('/')}} className="w-full text-sm text-slate-400">Cancelar e Sair</button>
        </form>
      </div>
    </div>
  );
}
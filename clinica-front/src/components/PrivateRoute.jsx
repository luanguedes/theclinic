import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-400">Carregando...</div>;
    }

    // 1. Se não está logado, manda pro login
    if (!user) {
        return <Navigate to="/" />;
    }

    // 2. Lógica de Troca de Senha Obrigatória
    // Se a flag estiver TRUE e o usuário NÃO estiver na tela de troca, força o redirecionamento
    if (user.force_password_change && location.pathname !== '/trocasenhaobrigatoria') {
        return <Navigate to="/trocasenhaobrigatoria" />;
    }

    return children;
}
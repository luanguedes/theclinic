import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Carregando...</div>;
    }

    if (!user) {
        return <Navigate to="/" />;
    }

    // Normaliza removendo barra no final (ex: /trocasenha/ vira /trocasenha)
    const path = location.pathname.replace(/\/+$/, "");

    // Se a flag estiver TRUE e não estivermos já na página certa, redireciona
    if (user.force_password_change && path !== '/trocasenhaobrigatoria') {
        return <Navigate to="/trocasenhaobrigatoria" />;
    }

    return children;
}
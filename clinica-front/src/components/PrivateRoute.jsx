import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Loader2 } from 'lucide-react';
import { hasRouteAccess } from '../config/navigation';

/**
 * Componente de Protecao de Rota
 * Verifica autenticacao e regras de seguranca (como troca de senha)
 */
export default function PrivateRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();
    const { notify } = useNotification();
    const lastDeniedPathRef = useRef(null);
    const path = location.pathname.replace(/\/+$/, "").toLowerCase();
    const accessDenied = !loading && !!user && !user.is_superuser && !hasRouteAccess(user, path);

    useEffect(() => {
        if (!accessDenied) return;
        if (lastDeniedPathRef.current === path) return;
        notify?.warning?.("O operador nao tem acesso a esta pagina. Solicite o acesso ao administrador do sistema.");
        lastDeniedPathRef.current = path;
    }, [accessDenied, notify, path]);

    // 1. Estado de Carregamento Profissional
    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-slate-50 dark:bg-slate-950 text-slate-400">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                <span className="font-black uppercase tracking-widest text-[10px]">Autenticando...</span>
            </div>
        );
    }

    // 2. Redirecionamento para Login (Salvando a rota de origem)
    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // 3. Bloqueio de Seguranca: Troca de Senha Obrigatoria
    if (user.force_password_change && path !== '/trocasenhaobrigatoria') {
        return <Navigate to="/trocasenhaobrigatoria" replace />;
    }

    // 4. Prevencao de acesso a troca de senha se nao for mais necessario
    if (!user.force_password_change && path === '/trocasenhaobrigatoria') {
        return <Navigate to="/dashboard" replace />;
    }

    // 5. Controle de acesso por rota
    if (accessDenied) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

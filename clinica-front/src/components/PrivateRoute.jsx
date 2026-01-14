import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { MENU_ITEMS, hasRouteAccess } from '../config/navigation';

/**
 * Componente de Proteção de Rota
 * Verifica autenticação e regras de segurança (como troca de senha)
 */
export default function PrivateRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

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

    // 3. Normalização de Path para verificação de segurança
    const path = location.pathname.replace(/\/+$/, "").toLowerCase();

    // 4. Bloqueio de Segurança: Troca de Senha Obrigatória
    // Se a flag estiver ativa, o usuário só pode acessar a página de troca de senha
    if (user.force_password_change && path !== '/trocasenhaobrigatoria') {
        return <Navigate to="/trocasenhaobrigatoria" replace />;
    }

    // 5. Prevenção de acesso à troca de senha se não for mais necessário
    if (!user.force_password_change && path === '/trocasenhaobrigatoria') {
        return <Navigate to="/dashboard" replace />;
    }

    // 6. Controle de acesso por rota
    if (!user.is_superuser) {
        const allowedByRoute = hasRouteAccess(user, path);
        if (!allowedByRoute) {
            const moduleMatch = MENU_ITEMS.find((m) =>
                m.items.some((item) => path === item.to || path.startsWith(`${item.to}/`))
            );
            if (moduleMatch && !moduleMatch.access(user)) {
                return <Navigate to="/dashboard" replace />;
            }
            if (!moduleMatch && path !== '/dashboard') {
                return <Navigate to="/dashboard" replace />;
            }
        }
    }

    return children;
}

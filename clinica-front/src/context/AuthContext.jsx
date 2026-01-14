import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { getPrivilegeModules } from '../config/navigation';

const AuthContext = createContext();

// Instância da API
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/',
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncPrivileges = async () => {
    const modules = getPrivilegeModules().map((m) => ({
      key: m.key,
      label: m.label,
      items: m.items.map((i) => ({ path: i.to, label: i.label }))
    }));

    try {
      await api.post('operadores/privilegios/sync/', { modules });
    } catch (error) {
      // Sync é best-effort para manter o catálogo atualizado.
    }
  };

  // --- INTERCEPTADOR GLOBAL DE ERROS ---
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Se a API retornar 401 (Não autorizado), forçamos o logout
        if (error.response && error.response.status === 401) {
          logout();
          if (!window.location.pathname.includes('/login')) {
              // Poderíamos usar o notify aqui, mas como o context de Notificação 
              // está dentro do Auth, usamos um alerta simples ou redirecionamento
              window.location.href = '/login?session=expired';
          }
        }
        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptor);
  }, []);

  useEffect(() => {
    const recoveryToken = async () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          try {
              const res = await api.get('me/');
              setUser(res.data);
              if (res.data?.is_superuser) {
                await syncPrivileges();
              }
          } catch (err) {
              logout();
          }
        }
        setLoading(false);
    };

    recoveryToken();
  }, []);

  const login = async (username, password, remember) => {
    try {
      const response = await api.post('token/', { username, password });
      const { access } = response.data;

      // Persistência baseada na escolha "Lembrar-me"
      if (remember) {
        localStorage.setItem('token', access);
      } else {
        sessionStorage.setItem('token', access);
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      const userResponse = await api.get('me/');
      setUser(userResponse.data);
      if (userResponse.data?.is_superuser) {
        await syncPrivileges();
      }
      return { success: true };
    } catch (error) {
      return { 
          success: false, 
          error: error.response?.data?.detail || "Usuário ou senha inválidos." 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, api }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export default api;

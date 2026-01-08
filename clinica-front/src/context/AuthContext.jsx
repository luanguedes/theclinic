import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Defina a URL da sua API aqui
const api = axios.create({
    // Se existir a variável de ambiente (Railway), usa ela. Se não, usa localhost.
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/',
});

export default api;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Tenta recuperar de ambos os lugares (Local ou Session)
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('me/')
        .then(res => setUser(res.data))
        .catch(() => {
          logout(); // Se o token for inválido, limpa tudo
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // 2. Agora o login aceita o parâmetro 'remember'
  const login = async (username, password, remember) => {
    try {
      const response = await api.post('token/', { username, password });
      const { access } = response.data;

      // LÓGICA DO LEMBRAR-ME:
      if (remember) {
        localStorage.setItem('token', access); // Salva pra sempre (até limpar cache)
      } else {
        sessionStorage.setItem('token', access); // Salva só enquanto a aba estiver aberta
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      const userResponse = await api.get('me/');
      setUser(userResponse.data);
      return true;
    } catch (error) {
      return false;
    }
  };

  const logout = () => {
    // Limpa dos dois lugares para garantir
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
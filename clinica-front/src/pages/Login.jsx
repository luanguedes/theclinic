import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext'; // Importado
import { useNavigate } from 'react-router-dom';
import { HeartPulse, Lock, User, Activity, Loader2 } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();
  const { notify } = useNotification(); // Hook instanciado
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
        return notify.warning("Por favor, preencha todos os campos.");
    }

    setIsLoading(true);
    
    try {
        const success = await login(username, password, rememberMe);
        if (success) {
            navigate('/dashboard');
        } else {
            notify.error('Usuário ou senha incorretos.');
        }
    } catch (err) {
        notify.error("Erro de conexão com o servidor. Tente novamente mais tarde.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-slate-100 relative overflow-hidden">
      
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-blue-500/10 mix-blend-multiply" />
        <div className="h-full w-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
      </div>

      <div className="bg-white w-full max-w-4xl h-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10 m-4 relative">
        
        {/* Lado Esquerdo (Design) */}
        <div className="w-full md:w-1/2 bg-blue-600 relative flex flex-col justify-center items-center text-center p-12 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-50"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516549655169-df83a092dd14?q=80&w=1000&auto=format&fit=crop')" }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 to-blue-600/80"></div>

          <div className="relative z-10">
            <div className="bg-white/10 p-5 rounded-full inline-block mb-6 backdrop-blur-md shadow-inner border border-white/20">
              <HeartPulse size={56} className="text-white animate-pulse" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-wide">TheClinic</h1>
            <div className="h-1 w-20 bg-blue-300 mx-auto mb-4 rounded-full"></div>
            <p className="text-blue-100 text-lg font-light leading-relaxed">
              Gestão clínica inteligente, <br/> segura e eficiente.
            </p>
          </div>

          <div className="absolute bottom-8 text-blue-200/80 text-xs flex items-center gap-2">
            <Activity size={14} />
            <span>Ambiente Seguro & Criptografado</span>
          </div>
        </div>

        {/* Lado Direito (Formulário) */}
        <div className="w-full md:w-1/2 bg-white p-10 flex flex-col justify-center relative">
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Área Restrita</h2>
            <p className="text-slate-500 text-sm mt-1">Insira suas credenciais de operador.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Usuário</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                  id="username"
                  name="username"
                  autoComplete="username" 
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  placeholder="ID do Operador" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Senha</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={e => setPassword(e.target.value)} 
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 bg-white border border-slate-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                />
                <span className="text-sm text-slate-500 group-hover:text-slate-700 transition-colors">Lembrar-me</span>
              </label>

              <button 
                type="button"
                onClick={() => notify.info("Contate o administrador para resetar sua senha.")}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors bg-transparent border-none"
              >
                Esqueceu a senha?
              </button>
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 flex justify-center items-center gap-2"
              >
                {isLoading ? (
                    <>
                        <Loader2 className="animate-spin" size={20} />
                        Acessando...
                    </>
                ) : 'Entrar no Sistema'}
              </button>
            </div>
          </form>

          <p className="absolute bottom-6 left-0 w-full text-center text-xs text-slate-300">
            © 2026 TheClinic Tecnologia
          </p>
        </div>
      </div>
    </div>
  );
}
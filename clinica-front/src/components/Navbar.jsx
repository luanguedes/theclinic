import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Stethoscope, CalendarDays, DollarSign, Settings, LogOut, 
  ChevronDown, Moon, Sun, Building2, ShieldCheck, 
  Menu, X, User as UserIcon, Bell, LayoutDashboard
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Efeito para adicionar sombra ao rolar a página
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  // Verifica se o link atual está ativo para estilização
  const isActive = (path) => location.pathname.startsWith(path);

  const NavItem = ({ icon: Icon, title, children, activePath }) => (
    <div className="relative group h-full flex items-center">
      <button className={`
        flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-300
        ${isActive(activePath) 
          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'}
      `}>
        <Icon size={18} />
        <span>{title}</span>
        <ChevronDown size={14} className="opacity-40 group-hover:rotate-180 transition-transform duration-300" />
      </button>
      
      {/* Dropdown Menu */}
      <div className="absolute top-[calc(100%-10px)] left-0 w-64 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 transform origin-top translate-y-2 group-hover:translate-y-0">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-2 space-y-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  const DropdownLink = ({ to, text, icon: Icon }) => (
    <Link to={to} className={`
      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
      ${location.pathname === to 
        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}
    `}>
      <div className={`p-1.5 rounded-lg ${location.pathname === to ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
        <Icon size={16} />
      </div>
      {text}
    </Link>
  );

  return (
    <nav className={`
      sticky top-0 w-full z-[100] transition-all duration-300 border-b
      ${scrolled 
        ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md h-16 border-slate-200 dark:border-slate-800 shadow-lg' 
        : 'bg-white dark:bg-slate-900 h-20 border-transparent'}
    `}>
      <div className="container mx-auto px-4 md:px-6 h-full flex justify-between items-center">
        
        {/* LADO ESQUERDO: LOGO */}
        <div className="flex items-center gap-8 h-full">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-2.5 rounded-2xl shadow-xl group-hover:scale-110 transition-transform duration-500">
              <Stethoscope size={24} strokeWidth={2.5} />
            </div>
            <div className="hidden lg:block">
              <span className="text-xl font-black tracking-tighter text-slate-800 dark:text-white block leading-none uppercase">TheClinic</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-black tracking-[0.2em] uppercase">Control</span>
                <div className="h-1 w-1 rounded-full bg-slate-300 animate-pulse"></div>
              </div>
            </div>
          </Link>

          {/* MENU CENTRAL (DESKTOP) */}
          <div className="hidden md:flex items-center gap-1 h-full">
            <Link to="/dashboard" className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${location.pathname === '/dashboard' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
               <LayoutDashboard size={18} />
               <span>Painel</span>
            </Link>

            {(user?.acesso_atendimento || user?.is_superuser) && (
              <NavItem icon={Stethoscope} title="Atendimento" activePath="/atendimento">
                <DropdownLink to="/prontuarios" text="Prontuário" icon={UserIcon} />
                <DropdownLink to="/triagem" text="Triagem Médica" icon={Bell} />
              </NavItem>
            )}

            {(user?.acesso_agendamento || user?.is_superuser) && (
              <NavItem icon={CalendarDays} title="Agenda" activePath="/agenda">
                <DropdownLink to="/recepcao" text="Recepção" icon={Users} />
                <DropdownLink to="/agenda/marcar" text="Novo Agendamento" icon={Plus} />
                <DropdownLink to="/agenda/bloqueios" text="Bloqueios" icon={X} />
              </NavItem>
            )}

            {(user?.acesso_cadastros || user?.is_superuser) && (
              <NavItem icon={Settings} title="Sistema" activePath="/sistema">
                <DropdownLink to="/pacientes" text="Pacientes" icon={Users} />
                <DropdownLink to="/profissionais" text="Corpo Clínico" icon={Stethoscope} />
                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2"></div>
                <DropdownLink to="/clinica" text="Unidade" icon={Building2} />
              </NavItem>
            )}
          </div>
        </div>

        {/* LADO DIREITO: AÇÕES E PERFIL */}
        <div className="flex items-center gap-2 md:gap-4">
          
          <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-blue-500 hover:text-white transition-all duration-300">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

          {/* PERFIL DROPDOWN */}
          <div className="relative group">
            <button className="flex items-center gap-3 p-1 pr-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-500/20">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">{user?.first_name || user?.username}</p>
                <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">{user?.is_superuser ? 'Admin' : 'Operador'}</p>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {/* Menu de Perfil */}
            <div className="absolute top-full right-0 w-56 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 transform origin-top-right translate-y-2 group-hover:translate-y-0">
               <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden font-bold">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-700">
                    <p className="text-[10px] uppercase text-slate-400 tracking-widest">Sessão ativa</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{user?.email || user?.username}</p>
                  </div>
                  <div className="p-2 space-y-1">
                    {user?.is_superuser && (
                      <Link to="/configuracoes" className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <Settings size={14} /> Configurações
                      </Link>
                    )}
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <LogOut size={14} /> Encerrar Sessão
                    </button>
                  </div>
               </div>
            </div>
          </div>

          {/* MOBILE TOGGLE */}
          <button className="md:hidden p-2 text-slate-600 dark:text-slate-300" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-20 bg-white dark:bg-slate-900 z-[90] md:hidden animate-in fade-in slide-in-from-top-5 duration-300">
           <div className="p-4 space-y-4">
              {/* Aqui você repetiria os links de forma simplificada para mobile */}
              <p className="text-center text-slate-400 text-xs">Acesse os módulos pelo desktop para uma experiência completa.</p>
              <button onClick={handleLogout} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold flex items-center justify-center gap-2">
                <LogOut size={18}/> Sair do Sistema
              </button>
           </div>
        </div>
      )}
    </nav>
  );
}

const Users = (props) => <UserIcon {...props} />;
const Plus = (props) => <CalendarDays {...props} />; // Placeholder para o Plus do Lucide
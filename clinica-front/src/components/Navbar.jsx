import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Stethoscope, CalendarDays, DollarSign, Settings, LogOut, 
  ChevronDown, Moon, Sun, Building2, ShieldCheck, 
  Menu, X, User as UserIcon, Bell, LayoutDashboard,
  Users, Plus, History, ClipboardList, Briefcase, Heart
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };
  const isActive = (path) => location.pathname.startsWith(path);

  // Componente de Item de Menu com Dropdown
  const NavItem = ({ icon: Icon, title, children, activePaths = [] }) => {
    const isCurrent = activePaths.some(path => location.pathname.startsWith(path));
    return (
      <div className="relative group h-full flex items-center">
        <button className={`
          flex items-center space-x-2 px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-300
          ${isCurrent 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
        `}>
          <Icon size={16} strokeWidth={2.5} />
          <span>{title}</span>
          <ChevronDown size={14} className={`opacity-40 group-hover:rotate-180 transition-transform duration-300 ${isCurrent ? 'text-white' : ''}`} />
        </button>
        
        <div className="absolute top-[calc(100%-5px)] left-0 w-64 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[100] transform origin-top translate-y-2 group-hover:translate-y-0">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
            <div className="p-2 space-y-1">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DropdownLink = ({ to, text, icon: Icon }) => (
    <Link to={to} className={`
      flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all
      ${location.pathname === to 
        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' 
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}
    `}>
      <Icon size={16} className={location.pathname === to ? 'text-blue-600' : 'text-slate-400'} />
      {text}
    </Link>
  );

  return (
    <nav className={`
      sticky top-0 w-full z-[100] transition-all duration-300 border-b
      ${scrolled 
        ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md h-16 border-slate-200 dark:border-slate-800 shadow-lg' 
        : 'bg-white dark:bg-slate-900 h-20 border-transparent'}
    `}>
      <div className="container mx-auto px-4 md:px-6 h-full flex justify-between items-center">
        
        <div className="flex items-center gap-6 h-full">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="bg-blue-600 text-white p-2 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform">
              <Stethoscope size={24} strokeWidth={3} />
            </div>
            <div className="hidden lg:block">
              <span className="text-xl font-black tracking-tighter text-slate-800 dark:text-white block leading-none uppercase">TheClinic</span>
              <span className="text-[9px] text-blue-600 font-black tracking-[0.3em] uppercase">Security PLus</span>
            </div>
          </Link>

          {/* MENU CENTRAL - Verificação de Superuser ou Permissões */}
          <div className="hidden md:flex items-center gap-2 h-full">
            
            {/* ATENDIMENTO */}
            {(user?.is_superuser || user?.acesso_atendimento) && (
              <NavItem icon={Stethoscope} title="Atendimento" activePaths={['/prontuarios', '/triagem']}>
                <DropdownLink to="/prontuarios" text="Prontuários" icon={ClipboardList} />
                <DropdownLink to="/triagem" text="Triagem" icon={Bell} />
              </NavItem>
            )}

            {/* AGENDAMENTO - RECUPERADO CRIAR AGENDA E BLOQUEIOS */}
            {(user?.is_superuser || user?.acesso_agendamento) && (
              <NavItem icon={CalendarDays} title="Agenda" activePaths={['/recepcao', '/agenda']}>
                <DropdownLink to="/recepcao" text="Recepção" icon={Users} />
                <DropdownLink to="/agenda/marcar" text="Marcar Consulta" icon={Plus} />
                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2"></div>
                <DropdownLink to="/agenda/configurar" text="Configurar Agendas" icon={Settings} />
                <DropdownLink to="/agenda/bloqueios" text="Bloqueios e Feriados" icon={X} />
              </NavItem>
            )}

            {/* SISTEMA - RECUPERADO ESPECIALIDADES, OPERADORES, CONVENIOS */}
            {(user?.is_superuser || user?.acesso_cadastros) && (
              <NavItem icon={Settings} title="Sistema" activePaths={['/pacientes', '/operadores', '/profissionais', '/especialidades', '/convenios', '/clinica']}>
                <DropdownLink to="/pacientes" text="Pacientes" icon={Users} />
                <DropdownLink to="/operadores" text="Operadores" icon={ShieldCheck} />
                <DropdownLink to="/profissionais" text="Profissionais" icon={Briefcase} />
                <DropdownLink to="/especialidades" text="Especialidades" icon={Heart} />
                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2"></div>
                <DropdownLink to="/convenios" text="Convênios" icon={ShieldCheck} />
                <DropdownLink to="/clinica" text="Dados da Clínica" icon={Building2} />
              </NavItem>
            )}

            {/* AUDITORIA - NOVA TELA */}
            {user?.is_superuser && (
               <Link to="/auditoria" className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${location.pathname === '/auditoria' ? 'bg-amber-500 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'}`}>
                 <History size={16} />
                 <span>Auditoria</span>
               </Link>
            )}
          </div>
        </div>

        {/* LADO DIREITO */}
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-blue-600 hover:text-white transition-all">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

          {/* PERFIL */}
          <div className="relative group">
            <button className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase leading-none">{user?.first_name || user?.username}</p>
                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-1">{user?.is_superuser ? 'Diretor' : 'Operador'}</p>
              </div>
            </button>

            <div className="absolute top-full right-0 w-48 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[110]">
               <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2">
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors">
                    <LogOut size={14} /> Encerrar Sessão
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
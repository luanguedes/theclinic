import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Stethoscope, CalendarDays, DollarSign, Settings, LogOut, ChevronDown, Moon, Sun, Building2, ShieldCheck
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  const NavItem = ({ icon: Icon, title, children }) => (
    <div className="relative group h-full flex items-center">
      <button className="flex items-center space-x-2 bg-transparent text-slate-700 dark:text-slate-200 font-semibold px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
        <Icon size={18} className="text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
        <span>{title}</span>
        <ChevronDown size={14} className="mt-0.5 opacity-50 group-hover:rotate-180 transition-transform" />
      </button>
      <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top translate-y-2 group-hover:translate-y-0 overflow-hidden">
        <div className="py-2">
          {children}
        </div>
      </div>
    </div>
  );

  const DropdownLink = ({ to, text, icon: Icon }) => (
    <Link to={to} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-white transition-colors border-l-2 border-transparent hover:border-blue-500">
      {Icon && <Icon size={16} className="opacity-70" />}
      {text}
    </Link>
  );

  const topButtonClass = "p-2 rounded-lg bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors";

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm h-20 relative z-40 transition-colors duration-300">
      <div className="container mx-auto px-6 h-full flex justify-between items-center">
        
        {/* LOGO */}
        <Link to="/dashboard" className="flex items-center space-x-2 group">
          <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md group-hover:bg-blue-700 transition-colors">
            <Stethoscope size={24} />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white block leading-none">TheClinic</span>
            <span className="text-xs text-slate-400 font-medium tracking-wider">SYSTEM</span>
          </div>
        </Link>

        {/* MENU CENTRAL */}
        <div className="hidden md:flex items-center space-x-1 h-full">
          {(user?.acesso_atendimento || user?.is_superuser) && (
            <NavItem icon={Stethoscope} title="Atendimento">
              <DropdownLink to="/prontuarios" text="Prontuário Eletrônico" />
              <DropdownLink to="/triagem" text="Triagem" />
            </NavItem>
          )}

          {(user?.acesso_agendamento || user?.is_superuser) && (
            <NavItem icon={CalendarDays} title="Agendamento">
              <DropdownLink to="/recepcao" text="Recepção" />
              <DropdownLink to="/agenda/marcar" text="Marcar Consulta" />
              <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
              <DropdownLink to="/agenda/bloqueios" text="Bloqueios e Feriados" />
              <DropdownLink to="/agenda/configurar" text="Configurar Horários" />
            </NavItem>
          )}

          {(user?.acesso_faturamento || user?.is_superuser) && (
             <NavItem icon={DollarSign} title="Financeiro">
              <DropdownLink to="/faturamento" text="Emitir Nota Fiscal" />
              <DropdownLink to="/relatorios" text="Relatórios Financeiros" />
            </NavItem>
          )}

          {user?.is_superuser && (
            <NavItem icon={Settings} title="Sistema">
              <DropdownLink to="/pacientes" text="Pacientes" />
              <DropdownLink to="/operadores" text="Operadores" />
              <DropdownLink to="/profissionais" text="Profissionais" />
              <DropdownLink to="/especialidades" text="Especialidades" />
              
              {/* NOVOS LINKS ADICIONADOS AQUI */}
              <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
              <DropdownLink to="/convenios" text="Convênios" icon={ShieldCheck} />
              <DropdownLink to="/clinica" text="Dados da Clínica" icon={Building2} />
              
              <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
              <DropdownLink to="/configuracoes" text="Configurações Gerais" />
            </NavItem>
          )}
        </div>

        {/* ÁREA DIREITA */}
        <div className="flex items-center space-x-3">
          <button onClick={toggleTheme} className={topButtonClass}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden lg:block"></div>

          <div className="text-right hidden lg:block">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{user?.first_name || user?.username}</p>
            <p className="text-xs text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 inline-block px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              {user?.is_superuser ? 'Administrador' : 'Operador'}
            </p>
          </div>
          
          <button onClick={handleLogout} className={`${topButtonClass} hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`}>
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
}
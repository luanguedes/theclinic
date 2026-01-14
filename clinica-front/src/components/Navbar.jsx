import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Stethoscope, CalendarDays, Settings, LogOut, 
  ChevronDown, Moon, Sun, Building2, ShieldCheck, 
  Menu, X, User as UserIcon, Bell, LayoutDashboard,
  Users, Plus, History, ClipboardList, Briefcase, Heart,
  MessageCircle, QrCode, Loader2
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, api } = useAuth();
  const { notify } = useNotification();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState({ loading: true, connected: null, state: 'carregando', error: null });
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrImage, setQrImage] = useState('');
  const [qrError, setQrError] = useState('');

  // --- CORREÇÃO DO TREMOR (MANTIDA) ---
  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      if (!scrolled && currentScroll > 60) setScrolled(true);
      else if (scrolled && currentScroll < 40) setScrolled(false);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  useEffect(() => {
    if (user?.is_superuser && api) {
      loadWhatsappStatus();
    }
  }, [user?.is_superuser, api]);

  useEffect(() => {
    if (waModalOpen) {
      loadWhatsappStatus();
    }
  }, [waModalOpen]);

  const handleLogout = () => { logout(); navigate('/'); };

  const loadWhatsappStatus = async () => {
    setWhatsappStatus(prev => ({ ...prev, loading: true }));
    try {
      const res = await api.get('configuracoes/sistema/whatsapp_status/');
      const data = res.data || {};
      setWhatsappStatus({
        loading: false,
        connected: data.connected,
        state: data.state || 'desconhecido',
        error: data.error || null
      });
    } catch (error) {
      setWhatsappStatus({
        loading: false,
        connected: null,
        state: 'erro',
        error: 'Falha ao consultar status do WhatsApp.'
      });
    }
  };

  const carregarQrCode = async () => {
    setQrLoading(true);
    setQrError('');
    setQrImage('');
    try {
      const res = await api.get('configuracoes/sistema/whatsapp_qrcode/');
      const dataUri = res.data?.data_uri;
      if (!dataUri) throw new Error('QR Code indisponivel.');
      setQrImage(dataUri);
    } catch (error) {
      const rawMessage = error?.response?.data?.error || 'Erro ao carregar QR Code.';
      const message = typeof rawMessage === 'string' ? rawMessage : 'Erro ao carregar QR Code.';
      setQrError(message);
      notify?.error?.(message);
    } finally {
      setQrLoading(false);
    }
  };

  const getWhatsappBadge = () => {
    if (whatsappStatus.loading) return { label: 'Verificando', className: 'bg-slate-200 text-slate-500' };
    if (whatsappStatus.connected === true) return { label: 'Conectado', className: 'bg-emerald-500 text-white' };
    if (whatsappStatus.connected === false) return { label: 'Desconectado', className: 'bg-rose-500 text-white' };
    return { label: 'Indefinido', className: 'bg-slate-400 text-white' };
  };

  const NavItem = ({ icon: Icon, title, children, activePaths = [] }) => {
    const isCurrent = activePaths.some(path => location.pathname.startsWith(path));
    return (
      <div className="relative group h-full flex items-center">
        <button className={`
          flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-300
          ${isCurrent 
            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
        `}>
          <Icon size={14} strokeWidth={2.5} />
          <span>{title}</span>
          <ChevronDown size={12} className={`opacity-40 group-hover:rotate-180 transition-transform duration-300 ${isCurrent ? 'text-white' : ''}`} />
        </button>
        
        {/* Z-Index aumentado aqui para garantir que o dropdown sobreponha conteúdo, mas não modais */}
        <div className="absolute top-[95%] left-0 w-56 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[60] transform origin-top translate-y-1 group-hover:translate-y-0">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden backdrop-blur-xl">
            <div className="p-1.5 space-y-0.5">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DropdownLink = ({ to, text, icon: Icon }) => (
    <Link to={to} className={`
      flex items-center gap-2.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all
      ${location.pathname === to 
        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' 
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}
    `}>
      <Icon size={14} className={location.pathname === to ? 'text-blue-600' : 'text-slate-400'} />
      {text}
    </Link>
  );

  return (
    <nav className={`
      sticky top-0 w-full transition-all duration-500 ease-in-out border-b
      /* AQUI ESTÁ A CORREÇÃO GLOBAL: Z-INDEX 40 (Modais usam 50+) */
      z-40
      /* AQUI ESTÁ A REDUÇÃO DE TAMANHO: h-16 (64px) normal, h-14 (56px) scroll */
      ${scrolled 
        ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md h-14 border-slate-200 dark:border-slate-800 shadow-sm' 
        : 'bg-white dark:bg-slate-900 h-16 border-transparent'}
    `}>
      <div className="container mx-auto px-4 md:px-6 h-full flex justify-between items-center">
        
        <div className="flex items-center gap-6 h-full">
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <div className={`bg-blue-600 text-white rounded-xl shadow-md group-hover:rotate-12 transition-all duration-500 ${scrolled ? 'p-1.5' : 'p-2'}`}>
              <Stethoscope size={scrolled ? 18 : 22} strokeWidth={3} />
            </div>
            <div className="hidden lg:block transition-all duration-300">
              <span className={`font-black tracking-tighter text-slate-800 dark:text-white block leading-none uppercase ${scrolled ? 'text-base' : 'text-lg'}`}>TheClinic</span>
              <span className={`text-blue-600 font-black tracking-[0.3em] uppercase ${scrolled ? 'text-[7px]' : 'text-[8px]'}`}>Gestão</span>
            </div>
          </Link>

          {/* MENU CENTRAL */}
          <div className="hidden md:flex items-center gap-1 h-full">
            {(user?.is_superuser || user?.acesso_atendimento) && (
              <NavItem icon={Stethoscope} title="Atendimento" activePaths={['/prontuarios', '/triagem']}>
                <DropdownLink to="/prontuarios" text="Prontuários" icon={ClipboardList} />
                <DropdownLink to="/triagem" text="Triagem" icon={Bell} />
              </NavItem>
            )}

            {(user?.is_superuser || user?.acesso_agendamento) && (
              <NavItem icon={CalendarDays} title="Agenda" activePaths={['/recepcao', '/agenda']}>
                <DropdownLink to="/recepcao" text="Recepção" icon={Users} />
                <DropdownLink to="/agenda/marcar" text="Marcar Consulta" icon={Plus} />
                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2"></div>
                <DropdownLink to="/agenda/configurar" text="Criar Agendas" icon={CalendarDays} />
                <DropdownLink to="/agenda/bloqueios" text="Bloqueios e Feriados" icon={X} />
              </NavItem>
            )}

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
          </div>
        </div>

        {/* LADO DIREITO */}
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-blue-600 hover:text-white transition-all">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {user?.is_superuser && (
            <>
              <button
                onClick={() => setWaModalOpen(true)}
                className="group flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-600 hover:text-white transition-all overflow-hidden"
                title="Conexão WhatsApp"
              >
                <div className="relative">
                  <MessageCircle size={16} />
                  <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white ${getWhatsappBadge().className}`}></span>
                </div>
                <span className="max-w-0 group-hover:max-w-[140px] transition-all duration-300 overflow-hidden text-[9px] font-black uppercase tracking-widest">
                  {getWhatsappBadge().label}
                </span>
              </button>

              <Link to="/configuracoes" className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-900 hover:text-white transition-all" title="Configurações Globais">
                <Settings size={16} />
              </Link>
            </>
          )}

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

          <div className="relative group">
            <button className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-md">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase leading-none">{user?.first_name || user?.username}</p>
                <p className="text-[8px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{user?.is_superuser ? 'Diretor' : 'Operador'}</p>
              </div>
            </button>

            <div className="absolute top-full right-0 w-48 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[60]">
               <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1.5 backdrop-blur-xl">
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors">
                    <LogOut size={14} /> Encerrar Sessão
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>

      {waModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[28px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/10">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <h3 className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
                <MessageCircle size={16} className="text-emerald-400"/> Conexão WhatsApp
              </h3>
              <button onClick={() => setWaModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getWhatsappBadge().className}`}>
                    {getWhatsappBadge().label}
                  </span>
                  {whatsappStatus.error && (
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                      {whatsappStatus.error}
                    </span>
                  )}
                </div>
                <button
                  onClick={loadWhatsappStatus}
                  disabled={whatsappStatus.loading}
                  className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-slate-900 text-white hover:bg-black transition-all disabled:opacity-40"
                >
                  {whatsappStatus.loading ? <Loader2 className="animate-spin" size={14}/> : 'Atualizar'}
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex items-center justify-center min-h-[220px]">
                {qrLoading ? (
                  <Loader2 className="animate-spin text-blue-600" size={36}/>
                ) : qrImage ? (
                  <img src={qrImage} alt="QR Code WhatsApp" className="w-52 h-52 object-contain"/>
                ) : (
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{qrError || 'QR Code indisponivel.'}</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={carregarQrCode}
                  disabled={qrLoading}
                  className="flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <QrCode size={14}/> Conectar
                </button>
                <button
                  onClick={carregarQrCode}
                  disabled={qrLoading}
                  className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-slate-900 text-white hover:bg-black transition-all disabled:opacity-40"
                >
                  {qrLoading ? 'Carregando...' : 'Atualizar QR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

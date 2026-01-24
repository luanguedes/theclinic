import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import TabsBar from './TabsBar';
import { 
  Stethoscope, Settings, LogOut, 
  Moon, Sun, 
  X,
  MessageCircle, QrCode, Loader2,
  UserCircle, KeyRound, Save
} from 'lucide-react';
import WhatsappChatDrawer from './WhatsappChatDrawer';

export default function Navbar() {
  const { user, logout, api, refreshUser } = useAuth();
  const { notify } = useNotification();
  const { theme, setThemePreference } = useTheme();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState({ loading: true, connected: null, state: 'carregando', error: null });
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [whatsappUnread, setWhatsappUnread] = useState(0);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrImage, setQrImage] = useState('');
  const [qrError, setQrError] = useState('');
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountForm, setAccountForm] = useState({
    first_name: '',
    username: '',
    theme_preference: 'light',
    senha_atual: '',
    nova_senha: '',
    confirmacao: ''
  });

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
    if ((user?.is_superuser || user?.acesso_whatsapp) && api) {
      loadWhatsappStatus();
    }
  }, [user?.is_superuser, user?.acesso_whatsapp, api]);

  useEffect(() => {
    if (!(user?.is_superuser || user?.acesso_whatsapp) || !api) return;
    let active = true;
    const fetchUnread = async () => {
      try {
        const res = await api.get('whatsapp/conversas/?nopage=true');
        const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        const totalUnread = data.reduce((acc, item) => acc + (item.unread_count || 0), 0);
        if (active) setWhatsappUnread(totalUnread);
      } catch (error) {
        if (active) setWhatsappUnread(0);
      }
    };
    fetchUnread();
    const intervalId = setInterval(fetchUnread, 5000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [user?.is_superuser, user?.acesso_whatsapp, api]);

  useEffect(() => {
    if (waModalOpen) {
      loadWhatsappStatus();
    }
  }, [waModalOpen]);

  useEffect(() => {
    if (!accountModalOpen || !user) return;
    setAccountForm({
      first_name: user.first_name || '',
      username: user.username || '',
      theme_preference: user.theme_preference || 'light',
      senha_atual: '',
      nova_senha: '',
      confirmacao: ''
    });
  }, [accountModalOpen, user]);

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

  const handleThemeToggle = async () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setThemePreference(nextTheme);
    if (!user) return;
    try {
      await api.put('operadores/minha-conta/', { theme_preference: nextTheme });
      await refreshUser();
    } catch (error) {
      notify?.error?.('Nao foi possivel salvar o tema. Tente novamente.');
      setThemePreference(theme);
    }
  };

  const handleAccountChange = (event) => {
    const { name, value } = event.target;
    setAccountForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAccountSave = async () => {
    if (!user || !api) return;
    if (!accountForm.first_name.trim()) {
      return notify?.warning?.('Informe o nome do operador.');
    }
    if (!accountForm.username.trim()) {
      return notify?.warning?.('Informe o nome de acesso.');
    }

    const wantsPasswordChange = !!(accountForm.senha_atual || accountForm.nova_senha || accountForm.confirmacao);
    if (wantsPasswordChange) {
      if (!accountForm.senha_atual) return notify?.warning?.('Informe a senha atual.');
      if (!accountForm.nova_senha) return notify?.warning?.('Informe a nova senha.');
      if (accountForm.nova_senha.length < 6) return notify?.warning?.('A nova senha deve ter no minimo 6 caracteres.');
      if (accountForm.confirmacao !== accountForm.nova_senha) {
        return notify?.warning?.('A confirmacao de senha nao coincide.');
      }
    }

    setAccountSaving(true);
    try {
      await api.put('operadores/minha-conta/', {
        first_name: accountForm.first_name,
        username: accountForm.username,
        theme_preference: accountForm.theme_preference
      });

      if (wantsPasswordChange) {
        await api.post('operadores/trocar-senha/', {
          senha_atual: accountForm.senha_atual,
          nova_senha: accountForm.nova_senha,
          confirmacao: accountForm.confirmacao
        });
      }

      await refreshUser();
      setThemePreference(accountForm.theme_preference);
      notify?.success?.('Conta atualizada com sucesso.');
      setAccountModalOpen(false);
    } catch (error) {
      const message = error?.response?.data?.error || error?.response?.data?.detail || 'Erro ao atualizar conta.';
      notify?.error?.(message);
    } finally {
      setAccountSaving(false);
    }
  };

  return (
    <nav className={`
      sticky top-0 w-full transition-all duration-500 ease-in-out border-b
      /* AQUI ESTÁ A CORREÇÃO GLOBAL: Z-INDEX 90 (Sidebar usa 80, modais 120+) */
      z-[90]
      /* AQUI ESTÁ A REDUÇÃO DE TAMANHO: h-16 (64px) normal, h-14 (56px) scroll */
      ${scrolled 
        ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md h-14 border-slate-200 dark:border-slate-800 shadow-sm' 
        : 'bg-white dark:bg-slate-900 h-16 border-transparent'}
    `}>
      <div className="w-full px-3 md:px-4 h-full flex items-center">
        <div className="flex items-center gap-4 h-full min-w-[180px] mr-2">
          <Link to="/dashboard" className="flex items-center gap-2 group pr-2">
            <div className={`bg-blue-600 text-white rounded-xl shadow-md group-hover:rotate-12 transition-all duration-500 ${scrolled ? 'p-1.5' : 'p-2'}`}>
              <Stethoscope size={scrolled ? 18 : 22} strokeWidth={3} />
            </div>
            <div className="hidden lg:block transition-all duration-300">
              <span className={`font-black tracking-tighter text-slate-800 dark:text-white block leading-none uppercase ${scrolled ? 'text-base' : 'text-lg'}`}>TheClinic</span>
              <span className={`text-blue-600 font-black tracking-[0.3em] uppercase ${scrolled ? 'text-[7px]' : 'text-[8px]'}`}>Gestão</span>
            </div>
          </Link>

        </div>

        <div className="flex-1 hidden md:flex justify-start px-3 min-w-0">
          <TabsBar />
        </div>

        {/* LADO DIREITO */}
        <div className="flex items-center gap-2 ml-auto min-w-[220px] justify-end">
          <button onClick={handleThemeToggle} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-blue-600 hover:text-white transition-all">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {(user?.is_superuser || user?.acesso_whatsapp) && (
            <>
              <div className="relative group">
                <button
                  onClick={() => setChatOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-600 hover:text-white transition-all"
                  title="Conexao WhatsApp"
                >
                  <div className="relative">
                    <MessageCircle size={16} />
                    <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white ${getWhatsappBadge().className}`}></span>
                    {whatsappUnread > 0 && (
                      <span className="absolute -bottom-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                        {whatsappUnread > 99 ? '99+' : whatsappUnread}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    {getWhatsappBadge().label}
                  </span>
                </button>

                <div className="absolute right-0 top-full mt-3 w-60 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[120]">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status</div>
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getWhatsappBadge().className}`}>
                        {getWhatsappBadge().label}
                      </span>
                    </div>
                    <button
                      onClick={() => setWaModalOpen(true)}
                      className="w-full h-9 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] bg-slate-900 text-white hover:bg-black transition-all"
                    >
                      Gerenciar Conexao
                    </button>
                    <button
                      onClick={() => setChatOpen(true)}
                      className="w-full h-9 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-all"
                    >
                      Abrir Chat
                    </button>
                  </div>
                </div>
              </div>

              {user?.is_superuser && (
                <Link to="/configuracoes" className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-900 hover:text-white transition-all" title="Configuracoes Globais">
                  <Settings size={16} />
                </Link>
              )}
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
                  <button onClick={() => setAccountModalOpen(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <UserCircle size={14} /> Conta
                  </button>
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
      {accountModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[28px] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/10">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <h3 className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
                <UserCircle size={16} className="text-blue-300"/> Conta do Operador
              </h3>
              <button onClick={() => setAccountModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Operador</label>
                  <input
                    name="first_name"
                    value={accountForm.first_name}
                    onChange={handleAccountChange}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10"
                    placeholder="Digite seu nome"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome de Acesso</label>
                  <input
                    name="username"
                    value={accountForm.username}
                    onChange={handleAccountChange}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10"
                    placeholder="Digite seu usuario"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Modo de Visualizacao</label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountForm((prev) => ({ ...prev, theme_preference: 'light' }))}
                    className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${accountForm.theme_preference === 'light' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    Modo Claro
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountForm((prev) => ({ ...prev, theme_preference: 'dark' }))}
                    className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${accountForm.theme_preference === 'dark' ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    Modo Escuro
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <KeyRound size={16} className="text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Trocar Senha</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Senha Atual</label>
                    <input
                      name="senha_atual"
                      type="password"
                      value={accountForm.senha_atual}
                      onChange={handleAccountChange}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-amber-500/10"
                      placeholder="********"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nova Senha</label>
                    <input
                      name="nova_senha"
                      type="password"
                      value={accountForm.nova_senha}
                      onChange={handleAccountChange}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-amber-500/10"
                      placeholder="********"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Confirmar Senha</label>
                    <input
                      name="confirmacao"
                      type="password"
                      value={accountForm.confirmacao}
                      onChange={handleAccountChange}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-amber-500/10"
                      placeholder="********"
                    />
                  </div>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">A troca exige senha atual.</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-6 pb-6">
              <button
                onClick={() => setAccountModalOpen(false)}
                className="flex-1 h-11 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleAccountSave}
                disabled={accountSaving}
                className="flex-1 h-11 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] bg-slate-900 text-white hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {accountSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
      <WhatsappChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        onUnreadChange={setWhatsappUnread}
      />
    </nav>
  );
}












import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { MessageCircle, Search, Send, X, Loader2, Image as ImageIcon, Plus, Phone, Trash2 } from 'lucide-react';

const EMPTY_STATE = {
  selectedId: null,
  search: '',
  texto: ''
};

const formatHour = (value) => {
  if (!value) return '';
  try {
    const date = new Date(value);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export default function WhatsappChatDrawer({ open, onClose, onUnreadChange }) {
  const { api, user } = useAuth();
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversas, setConversas] = useState([]);
  const [mensagens, setMensagens] = useState([]);
  const [state, setState] = useState(EMPTY_STATE);
  const [novoChatOpen, setNovoChatOpen] = useState(false);
  const [novoChatForm, setNovoChatForm] = useState({ telefone: '', nome: '' });
  const [novoChatLoading, setNovoChatLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const canAccess = useMemo(() => !!(user?.is_superuser || user?.acesso_whatsapp), [user]);

  const selectedConversa = useMemo(
    () => conversas.find((c) => c.id === state.selectedId) || null,
    [conversas, state.selectedId]
  );

  const loadConversas = async (silent = false) => {
    if (!api || !canAccess) return;
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (state.search) params.append('search', state.search);
      params.append('nopage', 'true');
      const res = await api.get(`whatsapp/conversas/?${params.toString()}`);
      const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setConversas(data);
      if (onUnreadChange) {
        const totalUnread = data.reduce((acc, item) => acc + (item.unread_count || 0), 0);
        onUnreadChange(totalUnread);
      }
      if (!state.selectedId && data.length > 0) {
        setState((prev) => ({ ...prev, selectedId: data[0].id }));
      }
    } catch (error) {
      notify?.error?.('Erro ao carregar conversas.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadMensagens = async (conversaId, silent = false) => {
    if (!api || !conversaId) return;
    if (!silent) setLoadingMsgs(true);
    try {
      const res = await api.get(`whatsapp/conversas/${conversaId}/mensagens/?nopage=true`);
      const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setMensagens(data);
    } catch (error) {
      notify?.error?.('Erro ao carregar mensagens.');
    } finally {
      if (!silent) setLoadingMsgs(false);
    }
  };

  const handleDeleteConversa = async (conversaId) => {
    if (!api || !conversaId) return;
    try {
      await api.delete(`whatsapp/conversas/${conversaId}/apagar/`);
      setConversas((prev) => prev.filter((c) => c.id !== conversaId));
      if (state.selectedId === conversaId) {
        setState((prev) => ({ ...prev, selectedId: null }));
        setMensagens([]);
      }
      notify?.success?.('Conversa removida da tela.');
    } catch (error) {
      notify?.error?.('Nao foi possivel remover a conversa.');
    }
  };

  useEffect(() => {
    if (!open) return;
    loadConversas();
  }, [open, state.search]);

  useEffect(() => {
    if (!open || !state.selectedId) return;
    loadMensagens(state.selectedId);
  }, [open, state.selectedId]);

  useEffect(() => {
    if (!open) return;
    const intervalId = setInterval(() => {
      loadConversas(true);
      if (state.selectedId) {
        loadMensagens(state.selectedId, true);
      }
    }, 5000);
    return () => clearInterval(intervalId);
  }, [open, state.selectedId, state.search]);

  const handleSelectConversa = (id) => {
    setState((prev) => ({ ...prev, selectedId: id }));
  };

  const handleSend = async () => {
    if (!api || !state.selectedId || !state.texto.trim()) return;
    setSending(true);
    try {
      await api.post(`whatsapp/conversas/${state.selectedId}/enviar/`, { texto: state.texto.trim() });
      setState((prev) => ({ ...prev, texto: '' }));
      await loadConversas();
      await loadMensagens(state.selectedId);
    } catch (error) {
      const message = error?.response?.data?.error || 'Nao foi possivel enviar.';
      notify?.error?.(message);
    } finally {
      setSending(false);
    }
  };

  const handleNovoChat = async () => {
    if (!api || !novoChatForm.telefone.trim()) return;
    setNovoChatLoading(true);
    try {
      const res = await api.post('whatsapp/conversas/novo_chat/', {
        telefone: novoChatForm.telefone,
        nome: novoChatForm.nome
      });
      const conversa = res.data;
      setConversas((prev) => {
        const exists = prev.some((c) => c.id === conversa.id);
        return exists ? prev : [conversa, ...prev];
      });
      setState((prev) => ({ ...prev, selectedId: conversa.id }));
      setNovoChatForm({ telefone: '', nome: '' });
      setNovoChatOpen(false);
      await loadMensagens(conversa.id);
    } catch (error) {
      const message = error?.response?.data?.error || 'Nao foi possivel criar o chat.';
      notify?.error?.(message);
    } finally {
      setNovoChatLoading(false);
    }
  };

  if (!open || !canAccess) return null;

  return (
    <>
      <div className="fixed top-0 right-0 h-screen w-full sm:w-[420px] lg:w-[460px] z-[110]">
      <div className="h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <MessageCircle size={18} className="text-emerald-400" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest">WhatsApp</p>
              <p className="text-[11px] font-bold text-emerald-200">Atendimento em tempo real</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNovoChatOpen(true)}
              className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-all"
              title="Novo chat"
            >
              <Plus size={16} />
            </button>
            <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={state.search}
              onChange={(e) => setState((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Buscar conversa..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200"
            />
          </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-full sm:w-40 lg:w-44 border-r border-slate-100 dark:border-slate-800 overflow-y-auto">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : (
              conversas.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectConversa(c.id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-800 transition-all ${state.selectedId === c.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-100 truncate">
                      {c.contato?.nome || c.contato?.wa_id || 'Sem nome'}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                      title="Remover conversa"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 truncate">{c.last_message_text || 'Sem mensagens'}</p>
                  {c.unread_count > 0 && (
                    <span className="inline-flex mt-1 text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                      {c.unread_count}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50 dark:bg-slate-900/60">
              {!selectedConversa ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase">
                  Selecione uma conversa
                </div>
              ) : loadingMsgs ? (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <Loader2 size={22} className="animate-spin" />
                </div>
              ) : mensagens.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase">
                  Nenhuma mensagem ainda
                </div>
              ) : (
                mensagens.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 text-xs font-semibold shadow-sm ${m.direction === 'out' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100'}`}
                    >
                      {m.message_type === 'media' ? (
                        <div className="flex items-start gap-2">
                          <ImageIcon size={14} className={m.direction === 'out' ? 'text-emerald-200' : 'text-slate-400'} />
                          <div>
                            <p className="font-black uppercase text-[10px]">Midia</p>
                            <p className="text-[11px]">{m.text || 'Arquivo recebido. Abra no celular.'}</p>
                          </div>
                        </div>
                      ) : (
                        <p>{m.text}</p>
                      )}
                      <div className={`text-[9px] mt-2 ${m.direction === 'out' ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {formatHour(m.sent_at || m.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <input
                  value={state.texto}
                  onChange={(e) => setState((prev) => ({ ...prev, texto: e.target.value }))}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !state.texto.trim() || !state.selectedId}
                  className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 transition-all"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
              <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Midias serao exibidas apenas no celular por enquanto.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    {novoChatOpen && (
      <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Novo Chat</span>
            </div>
            <button onClick={() => setNovoChatOpen(false)} className="p-1 rounded-full hover:bg-white/10">
              <X size={16} />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Telefone (com DDD)</label>
              <input
                value={novoChatForm.telefone}
                onChange={(e) => setNovoChatForm((prev) => ({ ...prev, telefone: e.target.value }))}
                className="w-full mt-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome (opcional)</label>
              <input
                value={novoChatForm.nome}
                onChange={(e) => setNovoChatForm((prev) => ({ ...prev, nome: e.target.value }))}
                className="w-full mt-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
                placeholder="Nome do contato"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setNovoChatOpen(false)}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleNovoChat}
                disabled={novoChatLoading || !novoChatForm.telefone.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-40"
              >
                {novoChatLoading ? <Loader2 size={14} className="animate-spin" /> : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    {deleteTarget && (
      <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
          <div className="px-5 py-4 bg-rose-600 text-white flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest">Remover conversa</span>
            <button onClick={() => setDeleteTarget(null)} className="p-1 rounded-full hover:bg-white/10">
              <X size={16} />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-200">
              Deseja remover a conversa com <span className="font-black">{deleteTarget?.contato?.nome || deleteTarget?.contato?.wa_id}</span> apenas da tela?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => { handleDeleteConversa(deleteTarget.id); setDeleteTarget(null); }}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

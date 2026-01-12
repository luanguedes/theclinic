import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { 
    CalendarX, Save, Trash2, AlertTriangle, FileDown, Ban, CheckCircle2, X, Pencil, FileText, RotateCcw, MessageSquare, CheckSquare, Square, Send, Loader2, Lock, CalendarDays, Clock
} from 'lucide-react';
import { generateConflictReport } from '../utils/generateReport';

export default function Bloqueios() {
    const { api } = useAuth();
    const { notify, confirmDialog } = useNotification();
    
    const [bloqueios, setBloqueios] = useState([]);
    const [profissionais, setProfissionais] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [editingId, setEditingId] = useState(null);

    const formInicial = {
        profissional: '', data_inicio: '', data_fim: '', 
        hora_inicio: '00:00', hora_fim: '23:59', 
        motivo: '', tipo: 'bloqueio', recorrente: false,
        observacao: '' 
    };
    const [form, setForm] = useState(formInicial);

    const [conflictData, setConflictData] = useState(null);
    const [modalDisparoOpen, setModalDisparoOpen] = useState(false);
    const [listaAfetados, setListaAfetados] = useState([]);
    const [selecionados, setSelecionados] = useState([]);
    const [enviandoWpp, setEnviandoWpp] = useState(false);
    const [motivoSalvo, setMotivoSalvo] = useState('');
    const [configSistema, setConfigSistema] = useState(null);

    const hojeIso = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (api) loadData();
    }, [api]);

    const loadData = async () => {
        setFetching(true);
        try {
            const [resBloq, resProf, resConfig] = await Promise.all([
                api.get('agendamento/bloqueios/'),
                api.get('profissionais/'),
                api.get('configuracoes/sistema/')
            ]);
            setBloqueios(Array.isArray(resBloq.data.results || resBloq.data) ? (resBloq.data.results || resBloq.data) : []);
            setProfissionais(Array.isArray(resProf.data.results || resProf.data) ? (resProf.data.results || resProf.data) : []);
            setConfigSistema(resConfig.data);
        } catch (e) { 
            notify.error("Erro ao sincronizar dados de bloqueio."); 
            setBloqueios([]);
        } finally {
            setFetching(false);
        }
    };

    const handleEdit = (bloqueio) => {
        setEditingId(bloqueio.id);
        setForm({
            profissional: bloqueio.profissional || '',
            data_inicio: bloqueio.data_inicio,
            data_fim: bloqueio.data_fim,
            hora_inicio: bloqueio.hora_inicio,
            hora_fim: bloqueio.hora_fim,
            motivo: bloqueio.motivo,
            tipo: bloqueio.tipo,
            recorrente: bloqueio.recorrente,
            observacao: bloqueio.observacao || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setForm(formInicial);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Segurança: Bloqueio não pode ser no passado
        if (!editingId && form.data_inicio < hojeIso) {
            return notify.warning("Não é possível criar um bloqueio retroativo.");
        }

        setLoading(true);
        try {
            if (editingId) {
                await api.put(`agendamento/bloqueios/${editingId}/`, form);
                notify.success("Configuração de bloqueio atualizada!");
                handleCancelEdit();
                loadData();
            } else {
                const res = await api.post('agendamento/bloqueios/verificar_conflitos/', form);
                
                if (res.data.conflito) {
                    setConflictData(res.data);
                    setLoading(false);
                    return; 
                }

                await api.post('agendamento/bloqueios/', { ...form, acao_conflito: 'manter' });
                notify.success("Bloqueio aplicado com sucesso!");
                setForm(formInicial);
                loadData();
            }
        } catch (error) {
            notify.error("Falha ao salvar bloqueio. Verifique os dados.");
        } finally {
            setLoading(false);
        }
    };

    const resolverConflito = async (acao) => {
        try {
            const res = await api.post('agendamento/bloqueios/', { ...form, acao_conflito: acao });
            
            if (res.data.afetados && res.data.afetados.length > 0) {
                setListaAfetados(res.data.afetados);
                setSelecionados(res.data.afetados.map(a => a.id));
                setMotivoSalvo(form.observacao || form.motivo); 
                setModalDisparoOpen(true);
            } else {
                notify.success(`Bloqueio realizado sem agendamentos afetados.`);
            }

            setConflictData(null);
            setForm(formInicial);
            loadData();
        } catch (error) { notify.error("Erro ao processar resolução de conflitos."); }
    };

    const baixarRelatorioAfetados = async (bloqueio) => {
        try {
            const res = await api.get(`agendamento/bloqueios/${bloqueio.id}/relatorio/`);
            const pacientes = res.data;
            if (pacientes.length === 0) {
                notify.info("Nenhum paciente afetado neste período.");
                return;
            }
            notify.info("Gerando relatório de conflitos...");
            generateConflictReport(pacientes, bloqueio.motivo);
        } catch (error) {
            notify.error("Erro ao exportar relatório.");
        }
    };

    const handleDelete = async (id) => {
        const confirmado = await confirmDialog(
            "Tem certeza que deseja remover este bloqueio? Os horários das agendas voltarão a ficar disponíveis imediatamente.", 
            "Excluir Bloqueio", "Confirmar Remoção", "Cancelar", "danger"
        );

        if (confirmado) {
            try {
                await api.delete(`agendamento/bloqueios/${id}/`);
                loadData();
                notify.success("Bloqueio removido.");
            } catch (error) { notify.error("Não foi possível remover o bloqueio."); }
        }
    }

    const isWhatsappDisabled = () => !configSistema?.enviar_whatsapp_global || !configSistema?.enviar_wpp_bloqueio;

    const handleEnviarEmMassa = async () => {
        if (selecionados.length === 0) return;
        setEnviandoWpp(true);
        try {
            await api.post('agendamento/bloqueios/notificar_cancelados/', {
                agendamentos_ids: selecionados,
                motivo: motivoSalvo
            });
            notify.success(`Avisos disparados para ${selecionados.length} pacientes.`);
            setModalDisparoOpen(false);
        } catch (e) {
            notify.error("Falha no servidor de mensageria.");
        } finally {
            setEnviandoWpp(false);
        }
    };

    const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-red-500 text-sm dark:text-white transition-all";
    const labelClass = "block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest";

    if (fetching) return <Layout><div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400"><Loader2 className="animate-spin text-blue-600 mb-2" size={32}/><span>Carregando bloqueios...</span></div></Layout>;

    return (
        <Layout>
            <div className="max-w-7xl mx-auto pb-20 tracking-tight">
                <div className="flex items-center gap-4 mb-8">
                    <div className="bg-red-600 p-3 rounded-2xl shadow-xl shadow-red-500/20 text-white">
                        <CalendarX size={32}/>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Bloqueios & Feriados</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Interrompa a agenda globalmente ou por profissional específico.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* FORMULÁRIO */}
                    <div className="lg:col-span-4 bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 h-fit">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="font-black text-xl dark:text-white uppercase tracking-tighter">{editingId ? 'Editar Bloqueio' : 'Novo Registro'}</h2>
                            {editingId && (
                                <button onClick={handleCancelEdit} className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 text-slate-400 hover:text-slate-800 bg-slate-50 px-3 py-1.5 rounded-full transition-all">
                                    <RotateCcw size={12}/> Resetar
                                </button>
                            )}
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className={labelClass}>Natureza da Interrupção</label>
                                <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl gap-1">
                                    <button type="button" onClick={()=>setForm({...form, tipo: 'bloqueio'})} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${form.tipo === 'bloqueio' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400'}`}>Bloqueio</button>
                                    <button type="button" onClick={()=>setForm({...form, tipo: 'feriado', profissional: ''})} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${form.tipo === 'feriado' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'text-slate-400'}`}>Feriado</button>
                                </div>
                            </div>

                            {form.tipo === 'bloqueio' && (
                                <div className="animate-in fade-in duration-300">
                                    <label className={labelClass}>Aplicar ao Profissional</label>
                                    <select value={form.profissional} onChange={e=>setForm({...form, profissional: e.target.value})} className={inputClass}>
                                        <option value="">TODOS OS MÉDICOS</option>
                                        {Array.isArray(profissionais) && profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className={labelClass}>Data Início</label><input type="date" value={form.data_inicio} onChange={e=>setForm({...form, data_inicio: e.target.value})} className={inputClass} required/></div>
                                <div><label className={labelClass}>Data Fim</label><input type="date" value={form.data_fim} onChange={e=>setForm({...form, data_fim: e.target.value})} className={inputClass} required/></div>
                            </div>
                            
                            {form.tipo === 'bloqueio' && (
                                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                    <div><label className={labelClass}>Hora Início</label><div className="relative"><Clock className="absolute left-3 top-3 text-slate-400" size={16}/><input type="time" value={form.hora_inicio} onChange={e=>setForm({...form, hora_inicio: e.target.value})} className={`${inputClass} pl-10`}/></div></div>
                                    <div><label className={labelClass}>Hora Fim</label><div className="relative"><Clock className="absolute left-3 top-3 text-slate-400" size={16}/><input type="time" value={form.hora_fim} onChange={e=>setForm({...form, hora_fim: e.target.value})} className={`${inputClass} pl-10`}/></div></div>
                                </div>
                            )}

                            <div><label className={labelClass}>Motivo (Interno)</label><input value={form.motivo} onChange={e=>setForm({...form, motivo: e.target.value})} className={inputClass} placeholder="Ex: Viagem de Congresso" required/></div>

                            <div>
                                <label className={labelClass}>Nota para o Paciente</label>
                                <textarea value={form.observacao} onChange={e=>setForm({...form, observacao: e.target.value})} className={`${inputClass} resize-none`} placeholder="Será enviado via WhatsApp se houver cancelamento..." rows="3" />
                            </div>

                            {form.tipo === 'feriado' && (
                                <label className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl cursor-pointer border border-red-100 dark:border-red-900/30">
                                    <input type="checkbox" checked={form.recorrente} onChange={e=>setForm({...form, recorrente: e.target.checked})} className="w-5 h-5 rounded text-red-600 focus:ring-red-500 border-red-200"/>
                                    <span className="text-[10px] font-black uppercase text-red-700 dark:text-red-400 tracking-widest flex items-center gap-1"><RotateCcw size={14}/> Repetir anualmente</span>
                                </label>
                            )}

                            <button type="submit" disabled={loading} className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 ${editingId ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20' : 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-black shadow-slate-500/20'}`}>
                                {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} 
                                {editingId ? 'Atualizar Bloqueio' : 'Salvar Bloqueio'}
                            </button>
                        </form>
                    </div>

                    {/* LISTA DE BLOQUEIOS */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-5">Tipo / Escopo</th>
                                        <th className="px-6 py-5">Período de Vigência</th>
                                        <th className="px-6 py-5">Motivação</th>
                                        <th className="px-6 py-5 text-right">Gestão</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700 text-sm font-medium">
                                    {bloqueios.length > 0 ? bloqueios.map(b => (
                                        <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all group">
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-2">
                                                    {b.tipo === 'feriado' 
                                                        ? <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter">FERIADO</span>
                                                        : <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter">BLOQUEIO</span>
                                                    }
                                                    {b.recorrente && <RotateCcw size={14} className="text-blue-500 animate-pulse-slow" title="Recorrência Anual"/>}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-bold mt-2 uppercase truncate max-w-[150px]">{b.nome_profissional || "Escopo Global"}</div>
                                            </td>
                                            <td className="px-6 py-6 dark:text-white">
                                                <div className="flex items-center gap-2 font-black text-xs">
                                                    <CalendarDays size={14} className="text-blue-500"/>
                                                    {new Date(b.data_inicio).toLocaleDateString('pt-BR')}
                                                    {b.data_inicio !== b.data_fim && <><span className="text-slate-300">/</span> {new Date(b.data_fim).toLocaleDateString('pt-BR')}</>}
                                                </div>
                                                {b.tipo === 'bloqueio' && (
                                                    <div className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1">
                                                        <Clock size={10}/> {b.hora_inicio.slice(0,5)} até {b.hora_fim.slice(0,5)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="font-black text-slate-700 dark:text-slate-200 uppercase text-xs tracking-tight">{b.motivo}</div>
                                                <div className="text-[10px] text-slate-400 font-medium mt-1 italic line-clamp-1">{b.observacao || "Sem nota pública"}</div>
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={()=>baixarRelatorioAfetados(b)} className="p-2 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl text-slate-500 hover:text-blue-600 hover:shadow-lg transition-all" title="Gerar PDF de Conflitos">
                                                        <FileText size={18}/>
                                                    </button>
                                                    <button onClick={()=>handleEdit(b)} className="p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all">
                                                        <Pencil size={18}/>
                                                    </button>
                                                    <button onClick={()=>handleDelete(b.id)} className="p-2 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl text-red-600 hover:bg-red-600 hover:text-white transition-all">
                                                        <Trash2 size={18}/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4" className="p-20 text-center text-slate-300 font-black uppercase tracking-widest opacity-30">Nenhum bloqueio programado</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* MODAL DE CONFLITO (UX REFINADA) */}
                {conflictData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden border border-orange-200 dark:border-orange-900/30">
                            <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-8 text-white">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-white/20 p-3 rounded-2xl"><AlertTriangle size={32}/></div>
                                    <button onClick={() => setConflictData(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">Conflito de Horários</h3>
                                <p className="text-orange-50 text-sm font-medium mt-1">Existem <strong>{conflictData.total} agendamentos</strong> confirmados neste período.</p>
                            </div>
                            <div className="p-8 space-y-6">
                                <button onClick={() => { notify.info("Iniciando download do relatório..."); generateConflictReport(conflictData.pacientes, form.motivo); }} className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black uppercase text-xs py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all tracking-widest">
                                    <FileDown size={20}/> Baixar Relatório de Afetados (PDF)
                                </button>

                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => resolverConflito('manter')} className="group bg-blue-50 hover:bg-blue-600 border-2 border-blue-100 dark:border-blue-900/30 p-6 rounded-3xl flex flex-col items-center gap-2 text-center transition-all">
                                        <CheckCircle2 size={28} className="text-blue-600 group-hover:text-white"/>
                                        <span className="font-black uppercase text-xs text-blue-900 dark:text-blue-100 group-hover:text-white">Bloquear e Manter</span>
                                        <span className="text-[10px] font-bold text-blue-400 group-hover:text-blue-100 uppercase tracking-tighter">Pacientes não serão desmarcados</span>
                                    </button>
                                    <button onClick={() => resolverConflito('cancelar')} className="group bg-red-50 hover:bg-red-600 border-2 border-red-100 dark:border-red-900/30 p-6 rounded-3xl flex flex-col items-center gap-2 text-center transition-all">
                                        <Ban size={28} className="text-red-600 group-hover:text-white"/>
                                        <span className="font-black uppercase text-xs text-red-900 dark:text-red-100 group-hover:text-white">Bloquear e Cancelar</span>
                                        <span className="text-[10px] font-bold text-red-400 group-hover:text-red-100 uppercase tracking-tighter">Todas as consultas serão anuladas</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL DE DISPARO WHATSAPP (MANTIDO E PADRONIZADO) */}
                {modalDisparoOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in zoom-in duration-300">
                        <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-white/10">
                            <div className="bg-emerald-600 p-8 text-white">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-white/20 p-3 rounded-2xl shadow-inner"><MessageSquare size={28}/></div>
                                    <button onClick={() => setModalDisparoOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
                                </div>
                                <h2 className="text-2xl font-black uppercase tracking-tighter">Avisar Pacientes</h2>
                                <p className="text-emerald-100 text-sm font-medium">O bloqueio foi salvo. Agora, envie o comunicado para os <strong>{listaAfetados.length} pacientes</strong> desmarcados.</p>
                            </div>
                            
                            <div className="p-8 overflow-y-auto flex-1 space-y-6">
                                <div className="flex justify-between items-center border-b dark:border-slate-700 pb-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destinatários Selecionados ({selecionados.length})</span>
                                    <button type="button" onClick={() => setSelecionados(selecionados.length === listaAfetados.length ? [] : listaAfetados.map(a=>a.id))} className="text-[10px] text-blue-600 font-black uppercase hover:underline">
                                        {selecionados.length === listaAfetados.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {listaAfetados.map(ag => (
                                        <div key={ag.id} onClick={() => {
                                                if (selecionados.includes(ag.id)) setSelecionados(selecionados.filter(id => id !== ag.id));
                                                else setSelecionados([...selecionados, ag.id]);
                                            }}
                                            className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${selecionados.includes(ag.id) ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30' : 'bg-slate-50 dark:bg-slate-900 border-transparent opacity-60'}`}
                                        >
                                            <div className={selecionados.includes(ag.id) ? "text-blue-600" : "text-slate-300"}>
                                                {selecionados.includes(ag.id) ? <CheckSquare size={20}/> : <Square size={20}/>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-black uppercase text-xs text-slate-800 dark:text-white truncate">{ag.paciente_nome}</div>
                                                <div className="text-[10px] font-bold text-slate-400 mt-0.5">{ag.data} • {ag.horario} • {ag.paciente_telefone}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-8 border-t dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex gap-4">
                                <button onClick={() => setModalDisparoOpen(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs hover:bg-slate-100 rounded-2xl transition-colors">Fechar</button>
                                <button onClick={handleEnviarEmMassa} disabled={selecionados.length === 0 || enviandoWpp || isWhatsappDisabled()} 
                                    className={`flex-[2] py-4 font-black uppercase text-xs tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${isWhatsappDisabled() ? 'bg-slate-200 text-slate-400' : 'bg-emerald-600 text-white shadow-emerald-500/20'}`}>
                                    {enviandoWpp ? <Loader2 className="animate-spin" size={18}/> : isWhatsappDisabled() ? <Lock size={18}/> : <Send size={18}/>}
                                    {isWhatsappDisabled() ? 'Wpp Desativado' : 'Disparar Avisos'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
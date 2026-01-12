import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { 
    CalendarX, Save, Trash2, AlertTriangle, FileDown, Ban, CheckCircle2, X, Pencil, FileText, RotateCcw, MessageSquare, CheckSquare, Square, Send, Loader2, Lock
} from 'lucide-react';
import { generateConflictReport } from '../utils/generateReport';

export default function Bloqueios() {
    const { api } = useAuth();
    const { notify, confirmDialog } = useNotification();
    
    const [bloqueios, setBloqueios] = useState([]);
    const [profissionais, setProfissionais] = useState([]);
    const [loading, setLoading] = useState(false);

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
    const [configSistema, setConfigSistema] = useState(null); // --- ESTADO DA CONFIGURAÇÃO ---

    useEffect(() => {
        if (api) loadData();
    }, [api]);

    const loadData = async () => {
        try {
            const [resBloq, resProf, resConfig] = await Promise.all([
                api.get('agendamento/bloqueios/'),
                api.get('profissionais/'),
                api.get('configuracoes/sistema/') // Carrega config
            ]);
            setBloqueios(Array.isArray(resBloq.data.results || resBloq.data) ? (resBloq.data.results || resBloq.data) : []);
            setProfissionais(Array.isArray(resProf.data.results || resProf.data) ? (resProf.data.results || resProf.data) : []);
            setConfigSistema(resConfig.data);
        } catch (e) { 
            notify.error("Erro ao carregar dados."); 
            setBloqueios([]);
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
        setLoading(true);
        
        try {
            if (editingId) {
                await api.put(`agendamento/bloqueios/${editingId}/`, form);
                notify.success("Bloqueio atualizado com sucesso!");
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
                notify.success("Bloqueio criado com sucesso!");
                setForm(formInicial);
                loadData();
            }
        } catch (error) {
            console.error(error);
            notify.error("Erro ao salvar bloqueio.");
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
                setMotivoSalvo(form.observacao); 
                setModalDisparoOpen(true);
            } else {
                notify.success(`Bloqueio criado!`);
            }

            setConflictData(null);
            setForm(formInicial);
            loadData();
        } catch (error) { notify.error("Erro ao resolver conflito."); }
    };

    const baixarRelatorioAfetados = async (bloqueio) => {
        try {
            const res = await api.get(`agendamento/bloqueios/${bloqueio.id}/relatorio/`);
            const pacientes = res.data;
            if (pacientes.length === 0) {
                notify.info("Nenhum paciente afetado neste período.");
                return;
            }
            generateConflictReport(pacientes, bloqueio.motivo);
        } catch (error) {
            notify.error("Erro ao gerar relatório.");
        }
    };

    const imprimirRelatorioModal = () => {
        if (conflictData) generateConflictReport(conflictData.pacientes, form.motivo);
    };

    const handleDelete = async (id) => {
        if (await confirmDialog("Remover este bloqueio? As agendas voltarão a ficar disponíveis.", "Exclusão", "Sim, remover", "Cancelar")) {
            try {
                await api.delete(`agendamento/bloqueios/${id}/`);
                loadData();
                notify.success("Bloqueio removido.");
            } catch (error) { notify.error("Erro ao remover."); }
        }
    }

    // --- LÓGICA DE BLOQUEIO DO BOTÃO WHATSAPP ---
    const isWhatsappDisabled = () => {
        if (!configSistema) return false;
        // Trava se o Global estiver OFF ou o Bloqueio estiver OFF
        return !configSistema.enviar_whatsapp_global || !configSistema.enviar_wpp_bloqueio;
    };

    const handleEnviarEmMassa = async () => {
        if (selecionados.length === 0) return;
        setEnviandoWpp(true);
        try {
            await api.post('agendamento/bloqueios/notificar_cancelados/', {
                agendamentos_ids: selecionados,
                motivo: motivoSalvo
            });
            notify.success("Mensagens enviadas com sucesso!");
            setModalDisparoOpen(false);
        } catch (e) {
            notify.error("Erro ao enviar mensagens.");
        } finally {
            setEnviandoWpp(false);
        }
    };

    const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500 text-sm dark:text-white";

    return (
        <Layout>
            <div className="max-w-6xl mx-auto pb-20">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                    <CalendarX className="text-red-500"/> Bloqueios e Feriados
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* FORMULÁRIO */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-fit">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-lg dark:text-white">{editingId ? 'Editar Bloqueio' : 'Novo Bloqueio'}</h2>
                            {editingId && (
                                <button onClick={handleCancelEdit} className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-800 bg-slate-100 px-2 py-1 rounded">
                                    <RotateCcw size={12}/> Cancelar
                                </button>
                            )}
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={()=>setForm({...form, tipo: 'bloqueio'})} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${form.tipo === 'bloqueio' ? 'bg-slate-700 text-white border-slate-700' : 'text-slate-500 border-slate-200'}`}>Bloqueio</button>
                                    <button type="button" onClick={()=>setForm({...form, tipo: 'feriado', profissional: ''})} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${form.tipo === 'feriado' ? 'bg-red-500 text-white border-red-500' : 'text-slate-500 border-slate-200'}`}>Feriado</button>
                                </div>
                            </div>

                            {form.tipo === 'bloqueio' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Profissional</label>
                                    <select value={form.profissional} onChange={e=>setForm({...form, profissional: e.target.value})} className={inputClass}>
                                        <option value="">Todos os Profissionais</option>
                                        {Array.isArray(profissionais) && profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">Início</label><input type="date" value={form.data_inicio} onChange={e=>setForm({...form, data_inicio: e.target.value})} className={inputClass} required/></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">Fim</label><input type="date" value={form.data_fim} onChange={e=>setForm({...form, data_fim: e.target.value})} className={inputClass} required/></div>
                            </div>
                            
                            {form.tipo === 'bloqueio' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Hora Início</label><input type="time" value={form.hora_inicio} onChange={e=>setForm({...form, hora_inicio: e.target.value})} className={inputClass}/></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Hora Fim</label><input type="time" value={form.hora_fim} onChange={e=>setForm({...form, hora_fim: e.target.value})} className={inputClass}/></div>
                                </div>
                            )}

                            <div><label className="block text-xs font-bold text-slate-500 mb-1">Motivo Interno</label><input value={form.motivo} onChange={e=>setForm({...form, motivo: e.target.value})} className={inputClass} placeholder="Ex: Férias" required/></div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Observação para o Paciente</label>
                                <textarea 
                                    value={form.observacao} 
                                    onChange={e=>setForm({...form, observacao: e.target.value})} 
                                    className={inputClass} 
                                    placeholder="Ex: Médico testou positivo para COVID..."
                                    rows="2"
                                />
                            </div>

                            {form.tipo === 'feriado' && (
                                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                    <input type="checkbox" checked={form.recorrente} onChange={e=>setForm({...form, recorrente: e.target.checked})}/>
                                    Repetir todos os anos
                                </label>
                            )}

                            <button type="submit" disabled={loading} className={`w-full text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-slate-900'}`}>
                                {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} 
                                {editingId ? 'Atualizar Bloqueio' : 'Salvar Bloqueio'}
                            </button>
                        </form>
                    </div>

                    {/* LISTA DE BLOQUEIOS */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 text-xs uppercase font-bold">
                                    <tr>
                                        <th className="px-6 py-4">Tipo</th>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Motivo / Profissional</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                                    {Array.isArray(bloqueios) && bloqueios.length > 0 ? (
                                        bloqueios.map(b => (
                                            <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                <td className="px-6 py-4">
                                                    {b.tipo === 'feriado' 
                                                        ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">FERIADO</span>
                                                        : <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold">BLOQUEIO</span>
                                                    }
                                                    {b.recorrente && <span className="ml-2 text-xs text-blue-500 font-bold" title="Anual">↻</span>}
                                                </td>
                                                <td className="px-6 py-4 dark:text-white">
                                                    {new Date(b.data_inicio).toLocaleDateString()}
                                                    {b.data_inicio !== b.data_fim && ` até ${new Date(b.data_fim).toLocaleDateString()}`}
                                                    {b.tipo === 'bloqueio' && <div className="text-xs text-slate-400">{String(b.hora_inicio).slice(0,5)} - {String(b.hora_fim).slice(0,5)}</div>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-700 dark:text-white">{b.motivo}</div>
                                                    <div className="text-xs text-slate-500">{b.nome_profissional || "Todos os Profissionais"}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button onClick={()=>baixarRelatorioAfetados(b)} className="text-slate-500 hover:bg-slate-100 p-2 rounded transition-colors" title="Relatório de Afetados">
                                                            <FileText size={16}/>
                                                        </button>
                                                        <button onClick={()=>handleEdit(b)} className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors" title="Editar">
                                                            <Pencil size={16}/>
                                                        </button>
                                                        <button onClick={()=>handleDelete(b.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors" title="Excluir">
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="4" className="p-8 text-center text-slate-400">Nenhum bloqueio encontrado.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* MODAL DE CONFLITO */}
                {conflictData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                            <div className="bg-orange-500 p-5 text-white flex justify-between items-center">
                                <h3 className="font-bold text-lg flex items-center gap-2"><AlertTriangle/> Conflitos Detectados</h3>
                                <button onClick={() => setConflictData(null)}><X/></button>
                            </div>
                            <div className="p-6">
                                <p className="text-slate-700 dark:text-slate-300 mb-4">
                                    Existem <strong>{conflictData.total} pacientes</strong> agendados neste período. O que deseja fazer?
                                </p>
                                
                                <button onClick={imprimirRelatorioModal} className="w-full mb-6 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                    <FileDown size={20}/> Baixar Relatório de Afetados (PDF)
                                </button>

                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => resolverConflito('manter')} className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1 text-sm transition-colors">
                                        <CheckCircle2 size={20}/>
                                        Bloquear e MANTER
                                        <span className="text-[10px] font-normal opacity-70">Agenda bloqueada, pacientes continuam lá</span>
                                    </button>
                                    <button onClick={() => resolverConflito('cancelar')} className="bg-red-100 hover:bg-red-200 text-red-800 font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1 text-sm transition-colors">
                                        <Ban size={20}/>
                                        Bloquear e CANCELAR
                                        <span className="text-[10px] font-normal opacity-70">Cancela todos os agendamentos</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL DE DISPARO WHATSAPP */}
                {modalDisparoOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="bg-orange-600 p-4 text-white flex justify-between items-center">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <MessageSquare size={20}/> Avisar Pacientes Cancelados
                                </h2>
                                <button onClick={() => setModalDisparoOpen(false)}><X size={20}/></button>
                            </div>
                            
                            <div className="p-5 overflow-y-auto flex-1">
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl text-orange-800 dark:text-orange-200 text-sm mb-4 border border-orange-100 dark:border-orange-800">
                                    <p className="font-bold mb-1">Bloqueio realizado com sucesso!</p>
                                    <p>Encontramos <strong>{listaAfetados.length} pacientes</strong> que tiveram suas consultas canceladas. Deseja enviar um aviso via WhatsApp para eles?</p>
                                </div>

                                <div className="flex justify-between items-center mb-3 px-1">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lista de Envio</span>
                                    <button 
                                        type="button"
                                        onClick={() => setSelecionados(selecionados.length === listaAfetados.length ? [] : listaAfetados.map(a=>a.id))} 
                                        className="text-xs text-blue-600 font-bold hover:underline"
                                    >
                                        {selecionados.length === listaAfetados.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {listaAfetados.map(ag => (
                                        <div 
                                            key={ag.id} 
                                            onClick={() => {
                                                if (selecionados.includes(ag.id)) setSelecionados(selecionados.filter(id => id !== ag.id));
                                                else setSelecionados([...selecionados, ag.id]);
                                            }}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                                selecionados.includes(ag.id) 
                                                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700' 
                                                    : 'bg-white border-slate-100 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700'
                                            }`}
                                        >
                                            <div className={selecionados.includes(ag.id) ? "text-blue-600" : "text-slate-300"}>
                                                {selecionados.includes(ag.id) ? <CheckSquare size={20}/> : <Square size={20}/>}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-slate-700 dark:text-white">{ag.paciente_nome}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                                    <span>{ag.data} às {ag.horario}</span>
                                                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                    <span>{ag.paciente_telefone || "Sem Tel"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                                <button 
                                    onClick={() => setModalDisparoOpen(false)}
                                    className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg text-sm transition-colors"
                                >
                                    Não Enviar
                                </button>
                                
                                {/* --- BOTÃO DE ENVIO COM TRAVA VISUAL --- */}
                                <button 
                                    onClick={handleEnviarEmMassa}
                                    disabled={selecionados.length === 0 || enviandoWpp || isWhatsappDisabled()} // Trava funcional
                                    className={`px-6 py-2 font-bold rounded-lg flex items-center gap-2 text-sm transition-all active:scale-95 shadow-lg shadow-green-200 dark:shadow-none
                                        ${isWhatsappDisabled() 
                                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                                            : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                                        }
                                    `}
                                    title={isWhatsappDisabled() ? "Envio desativado nas Configurações" : "Enviar Mensagens"}
                                >
                                    {enviandoWpp ? <Loader2 className="animate-spin" size={16}/> : isWhatsappDisabled() ? <Lock size={16}/> : <Send size={16}/>}
                                    {isWhatsappDisabled() ? 'Envio Bloqueado' : `Enviar (${selecionados.length})`}
                                </button>
                                {/* --------------------------------------- */}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
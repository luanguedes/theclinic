import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { 
    CalendarX, Save, Trash2, AlertTriangle, FileDown, Ban, CheckCircle2 
} from 'lucide-react';
import { generateConflictReport } from '../utils/generateReport';

export default function Bloqueios() {
    const { api } = useAuth();
    const { notify, confirmDialog } = useNotification();
    
    const [bloqueios, setBloqueios] = useState([]);
    const [profissionais, setProfissionais] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form
    const [form, setForm] = useState({
        profissional: '', data_inicio: '', data_fim: '', 
        hora_inicio: '00:00', hora_fim: '23:59', 
        motivo: '', tipo: 'bloqueio', recorrente: false
    });

    // Modal de Conflito
    const [conflictData, setConflictData] = useState(null);

    useEffect(() => {
        loadData();
    }, [api]);

    const loadData = async () => {
        try {
            const [resBloq, resProf] = await Promise.all([
                api.get('agendamento/bloqueios/'),
                api.get('profissionais/')
            ]);
            setBloqueios(resBloq.data.results || resBloq.data);
            setProfissionais(resProf.data.results || resProf.data);
        } catch (e) { notify.error("Erro ao carregar dados."); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        // 1. Verifica conflitos
        try {
            const res = await api.post('agendamento/bloqueios/verificar_conflitos/', form);
            
            if (res.data.conflito) {
                setConflictData(res.data);
                setLoading(false);
                return; // Para aqui e abre o modal
            }

            // Se não tem conflito, cria direto
            await api.post('agendamento/bloqueios/', { ...form, acao_conflito: 'manter' });
            notify.success("Bloqueio criado com sucesso!");
            setForm({ ...form, motivo: '', data_inicio: '', data_fim: '' });
            loadData();

        } catch (error) {
            notify.error("Erro ao processar bloqueio.");
        } finally {
            setLoading(false);
        }
    };

    const resolverConflito = async (acao) => {
        // acao = 'cancelar' ou 'manter'
        try {
            await api.post('agendamento/bloqueios/', { ...form, acao_conflito: acao });
            notify.success(`Bloqueio criado! Pacientes ${acao === 'cancelar' ? 'cancelados' : 'mantidos'}.`);
            setConflictData(null);
            setForm({ ...form, motivo: '', data_inicio: '', data_fim: '' });
            loadData();
        } catch (error) {
            notify.error("Erro ao resolver conflito.");
        }
    };

    const imprimirRelatorio = () => {
        if (conflictData) {
            generateConflictReport(conflictData.pacientes, form.motivo);
        }
    };

    const handleDelete = async (id) => {
        if (await confirmDialog("Remover este bloqueio?", "Exclusão", "Sim, remover", "Cancelar")) {
            await api.delete(`agendamento/bloqueios/${id}/`);
            loadData();
        }
    }

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
                        <h2 className="font-bold text-lg mb-4 dark:text-white">Novo Bloqueio</h2>
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
                                        {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
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

                            <div><label className="block text-xs font-bold text-slate-500 mb-1">Motivo</label><input value={form.motivo} onChange={e=>setForm({...form, motivo: e.target.value})} className={inputClass} placeholder="Ex: Férias, Natal..." required/></div>

                            {form.tipo === 'feriado' && (
                                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                    <input type="checkbox" checked={form.recorrente} onChange={e=>setForm({...form, recorrente: e.target.checked})}/>
                                    Repetir todos os anos
                                </label>
                            )}

                            <button type="submit" disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Salvar Bloqueio
                            </button>
                        </form>
                    </div>

                    {/* LISTA */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 text-xs uppercase font-bold">
                                    <tr>
                                        <th className="px-6 py-4">Tipo</th>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Motivo / Profissional</th>
                                        <th className="px-6 py-4 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                                    {bloqueios.map(b => (
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
                                                {b.tipo === 'bloqueio' && <div className="text-xs text-slate-400">{b.hora_inicio.slice(0,5)} - {b.hora_fim.slice(0,5)}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-700 dark:text-white">{b.motivo}</div>
                                                <div className="text-xs text-slate-500">{b.nome_profissional || "Todos os Profissionais"}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={()=>handleDelete(b.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {bloqueios.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-slate-400">Nenhum bloqueio ativo.</td></tr>}
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
                                
                                <button onClick={imprimirRelatorio} className="w-full mb-6 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700">
                                    <FileDown size={20}/> Baixar Relatório de Afetados (PDF)
                                </button>

                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => resolverConflito('manter')} className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1 text-sm">
                                        <CheckCircle2 size={20}/>
                                        Bloquear e MANTER
                                        <span className="text-[10px] font-normal opacity-70">Agenda bloqueada, pacientes continuam lá</span>
                                    </button>
                                    <button onClick={() => resolverConflito('cancelar')} className="bg-red-100 hover:bg-red-200 text-red-800 font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1 text-sm">
                                        <Ban size={20}/>
                                        Bloquear e CANCELAR
                                        <span className="text-[10px] font-normal opacity-70">Cancela todos os agendamentos</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
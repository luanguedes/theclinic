import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { 
    Search, CalendarClock, User, CheckCircle2, 
    Clock, DollarSign, AlertCircle, X, Save, Loader2, Pencil, UserX, RotateCcw 
} from 'lucide-react';

export default function Recepcao() {
    const { api } = useAuth();
    const { notify, confirmDialog } = useNotification();

    // --- ESTADOS ---
    const [loading, setLoading] = useState(false);
    const [agendamentos, setAgendamentos] = useState([]);
    const [profissionais, setProfissionais] = useState([]);
    
    // Filtros
    const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0]); // Hoje
    const [profissionalFiltro, setProfissionalFiltro] = useState('');
    const [buscaTexto, setBuscaTexto] = useState('');
    
    // Filtro Visual (Legenda)
    const [statusVisiveis, setStatusVisiveis] = useState(['agendado', 'aguardando', 'em_atendimento', 'finalizado', 'faltou']);

    // Modal de Check-in
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loadingCheckin, setLoadingCheckin] = useState(false);
    const [formCheckin, setFormCheckin] = useState({
        valor: '',
        forma_pagamento: 'dinheiro',
        pago: false
    });

    // --- CARREGAMENTO ---
    useEffect(() => {
        if(api) {
            api.get('profissionais/').then(res => {
                setProfissionais(res.data.results || res.data);
            });
        }
    }, [api]);

    useEffect(() => {
        if(api) carregarAgenda();
    }, [api, dataFiltro, profissionalFiltro]);

    // --- LÓGICA ---
    const carregarAgenda = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (dataFiltro) params.append('data', dataFiltro);
            if (profissionalFiltro) params.append('profissional', profissionalFiltro);
            
            const res = await api.get(`agendamento/?${params.toString()}`);
            setAgendamentos(res.data.results || res.data);
        } catch (error) {
            console.error(error);
            notify.error("Erro ao carregar agenda.");
        } finally {
            setLoading(false);
        }
    };

    const verificarAtraso = (horario, status) => {
        if (status !== 'agendado') return false;
        const dataAgendamento = new Date(`${dataFiltro}T${horario}`);
        const agora = new Date();
        
        if (dataFiltro === agora.toISOString().split('T')[0]) {
           return agora > new Date(dataAgendamento.getTime() + 15*60000);
        }
        if (new Date(dataFiltro) < new Date(agora.setHours(0,0,0,0))) return true;

        return false;
    };

    const calcularIdade = (dataNasc) => {
        if (!dataNasc) return '-';
        const hoje = new Date();
        const nasc = new Date(dataNasc);
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const m = hoje.getMonth() - nasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
        return idade;
    };

    const itensFiltrados = agendamentos.filter(item => {
        if (!statusVisiveis.includes(item.status)) return false;
        if (buscaTexto) {
            const termo = buscaTexto.toLowerCase();
            return item.nome_paciente?.toLowerCase().includes(termo) || 
                   item.nome_profissional?.toLowerCase().includes(termo);
        }
        return true;
    });

    const toggleStatus = (status) => {
        if (statusVisiveis.includes(status)) {
            setStatusVisiveis(statusVisiveis.filter(s => s !== status));
        } else {
            setStatusVisiveis([...statusVisiveis, status]);
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'agendado': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
            case 'aguardando': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
            case 'em_atendimento': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
            case 'finalizado': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
            case 'cancelado': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
            case 'faltou': return 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    // --- AÇÕES ---
    const abrirCheckin = (item) => {
        setSelectedItem(item);
        setFormCheckin({
            valor: item.valor || '',
            forma_pagamento: item.fatura_forma_pagamento || 'dinheiro',
            pago: item.fatura_pago || false
        });
        setModalOpen(true);
    };

    const confirmarCheckin = async () => {
        setLoadingCheckin(true);
        try {
            await api.post(`agendamento/${selectedItem.id}/confirmar_chegada/`, formCheckin);
            const acao = selectedItem.status === 'agendado' ? 'Chegada confirmada' : 'Dados atualizados';
            notify.success(`${acao} com sucesso!`);
            setModalOpen(false);
            carregarAgenda();
        } catch (error) {
            console.error(error);
            notify.error("Erro ao salvar dados.");
        } finally {
            setLoadingCheckin(false);
        }
    };

    const handleMarcarFalta = async (item) => {
        const confirm = await confirmDialog(
            `Confirmar que o paciente ${item.nome_paciente} FALTOU à consulta?`,
            "Registrar Falta",
            "Sim, Faltou",
            "Cancelar",
            "danger"
        );

        if (confirm) {
            try {
                await api.post(`agendamento/${item.id}/marcar_falta/`);
                notify.info("Falta registrada.");
                carregarAgenda();
            } catch (error) { notify.error("Erro ao registrar falta."); }
        }
    };

    const handleReverter = async (item) => {
        const confirm = await confirmDialog(
            `Deseja desfazer a recepção de ${item.nome_paciente}? Isso apagará os dados financeiros criados.`,
            "Desfazer Recepção",
            "Sim, Desfazer",
            "Cancelar",
            "warning"
        );

        if (confirm) {
            try {
                await api.post(`agendamento/${item.id}/reverter_chegada/`);
                notify.info("Recepção desfeita. Paciente voltou para 'Agendado'.");
                carregarAgenda();
            } catch (error) {
                notify.error("Erro ao reverter recepção.");
            }
        }
    };

    const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white transition-all";

    return (
        <Layout>
            <div className="max-w-7xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <CheckCircle2 className="text-green-600"/> Recepção
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie a chegada e fluxo de pacientes.</p>
                    </div>
                </div>

                {/* --- BARRA DE FILTROS --- */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex flex-col lg:flex-row gap-4">
                    <div className="w-full lg:w-48">
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Data</label>
                        <input type="date" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)} className={inputClass}/>
                    </div>
                    
                    <div className="w-full lg:w-64">
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Profissional</label>
                        <select value={profissionalFiltro} onChange={e => setProfissionalFiltro(e.target.value)} className={inputClass}>
                            <option value="">Todos os profissionais</option>
                            {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                    </div>

                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Buscar Paciente</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input 
                                placeholder="Nome do paciente..." 
                                value={buscaTexto} 
                                onChange={e => setBuscaTexto(e.target.value)} 
                                className={`${inputClass} pl-10`}
                            />
                        </div>
                    </div>
                </div>

                {/* --- LEGENDA --- */}
                <div className="flex flex-wrap gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
                    {['agendado', 'aguardando', 'em_atendimento', 'finalizado', 'faltou'].map(status => (
                        <button 
                            key={status}
                            onClick={() => toggleStatus(status)}
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all uppercase flex items-center gap-1 ${
                                statusVisiveis.includes(status) 
                                ? getStatusColor(status) + ' shadow-sm scale-105' 
                                : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700 opacity-60'
                            }`}
                        >
                            {status === 'agendado' && <CalendarClock size={12}/>}
                            {status === 'aguardando' && <Clock size={12}/>}
                            {status === 'faltou' && <UserX size={12}/>}
                            {status.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                {/* --- TABELA --- */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[400px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Horário</th>
                                    {/* MUDANÇA: STATUS AGORA É A 2ª COLUNA */}
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Paciente</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Profissional</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-2"/>Carregando agenda...</td></tr>
                                ) : itensFiltrados.length === 0 ? (
                                    <tr><td colSpan="5" className="p-10 text-center text-slate-400">Nenhum paciente encontrado para os filtros.</td></tr>
                                ) : (
                                    itensFiltrados.map((item) => {
                                        const atrasado = verificarAtraso(item.horario, item.status);
                                        const idade = item.detalhes_pdf?.paciente_nascimento ? calcularIdade(item.detalhes_pdf.paciente_nascimento) : '';

                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                {/* COLUNA 1: HORÁRIO */}
                                                <td className="px-6 py-4">
                                                    <div className={`font-bold text-lg ${atrasado ? 'text-red-500 animate-pulse flex items-center gap-1' : 'text-slate-700 dark:text-white'}`}>
                                                        {item.horario.substring(0, 5)}
                                                        {atrasado && <AlertCircle size={14}/>}
                                                    </div>
                                                    {atrasado && <div className="text-[10px] text-red-500 font-bold uppercase">Atrasado</div>}
                                                </td>

                                                {/* COLUNA 2: STATUS (MOVIDA PARA CÁ) */}
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(item.status)}`}>
                                                        {item.status.replace('_', ' ').toUpperCase()}
                                                    </span>
                                                </td>

                                                {/* COLUNA 3: PACIENTE */}
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                        {item.nome_paciente}
                                                    </div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                                        <User size={12}/> {idade ? `${idade} anos` : 'Idade n/d'} 
                                                        {item.nome_convenio && <span className="bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-slate-600 dark:text-slate-300 font-medium">{item.nome_convenio}</span>}
                                                    </div>
                                                </td>

                                                {/* COLUNA 4: PROFISSIONAL */}
                                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                    <div className="font-medium">{item.nome_profissional}</div>
                                                    <div className="text-xs text-slate-400">{item.nome_especialidade}</div>
                                                </td>

                                                {/* COLUNA 5: AÇÕES */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end items-center gap-2">
                                                        {/* Ícone de Pagamento */}
                                                        {item.fatura_pago ? (
                                                            <div title="Pago" className="text-green-500 p-2"><DollarSign size={20}/></div>
                                                        ) : (
                                                            <div title="Pagamento Pendente" className="text-slate-300 p-2"><DollarSign size={20}/></div>
                                                        )}

                                                        {/* BOTOES AGENDADO */}
                                                        {item.status === 'agendado' && (
                                                            <>
                                                                <button onClick={() => handleMarcarFalta(item)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors border border-transparent" title="Marcar Falta"><UserX size={18}/></button>
                                                                <button onClick={() => abrirCheckin(item)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-transform active:scale-95 flex items-center gap-2"><CheckCircle2 size={16}/> Confirmar</button>
                                                            </>
                                                        )}

                                                        {/* BOTOES AGUARDANDO (EDITAR E REVERTER) */}
                                                        {(item.status === 'aguardando') && (
                                                            <>
                                                                <button onClick={() => handleReverter(item)} className="text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 p-2 rounded-lg transition-colors border border-transparent hover:border-orange-200" title="Desfazer Recepção"><RotateCcw size={18}/></button>
                                                                <button onClick={() => abrirCheckin(item)} className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-lg transition-colors border border-transparent hover:border-blue-200" title="Editar dados"><Pencil size={18}/></button>
                                                            </>
                                                        )}

                                                        {/* BOTAO EDITAR (EM ATENDIMENTO) */}
                                                        {item.status === 'em_atendimento' && (
                                                            <button onClick={() => abrirCheckin(item)} className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-lg transition-colors border border-transparent hover:border-blue-200" title="Editar dados"><Pencil size={18}/></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- MODAL DE CHECK-IN --- */}
                {modalOpen && selectedItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="bg-green-600 p-5 text-white flex justify-between items-center">
                                <h3 className="font-bold text-lg flex items-center gap-2"><CheckCircle2/> {selectedItem.status === 'agendado' ? 'Confirmar Chegada' : 'Editar Recepção'}</h3>
                                <button onClick={() => setModalOpen(false)}><X/></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-center mb-4">
                                    <p className="text-sm text-slate-500">Paciente</p>
                                    <p className="font-bold text-lg text-slate-800 dark:text-white">{selectedItem.nome_paciente}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Valor da Consulta (R$)</label>
                                    <input type="number" value={formCheckin.valor} onChange={e => setFormCheckin({...formCheckin, valor: e.target.value})} className={inputClass}/>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Forma de Pagamento</label>
                                    <select value={formCheckin.forma_pagamento} onChange={e => setFormCheckin({...formCheckin, forma_pagamento: e.target.value})} className={inputClass}>
                                        <option value="dinheiro">Dinheiro</option>
                                        <option value="pix">Pix</option>
                                        <option value="cartao_credito">Cartão de Crédito</option>
                                        <option value="cartao_debito">Cartão de Débito</option>
                                        <option value="convenio">Convênio</option>
                                        <option value="pendente">A Definir / Pagar Depois</option>
                                    </select>
                                </div>
                                <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                    <input type="checkbox" checked={formCheckin.pago} onChange={e => setFormCheckin({...formCheckin, pago: e.target.checked})} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"/>
                                    <span className="text-sm font-bold text-slate-700 dark:text-white">Pagamento já realizado?</span>
                                </label>
                                <div className="pt-4 flex gap-3 justify-end">
                                    <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
                                    <button onClick={confirmarCheckin} disabled={loadingCheckin} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg disabled:opacity-50">{loadingCheckin ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} {selectedItem.status === 'agendado' ? 'Confirmar' : 'Salvar Alterações'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
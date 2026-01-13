import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { 
    Search, User, CheckCircle2, Clock, DollarSign, X, Save, Loader2, 
    Pencil, UserX, RotateCcw, Star, Accessibility, Baby, Users, Heart, 
    AlertTriangle, UserCog, MapPin, Stethoscope, ShieldCheck, Check
} from 'lucide-react';

// Mapeamento visual das prioridades
const PRIORIDADES = {
    'idoso': { label: 'Idoso (60+)', icon: <Users size={16} strokeWidth={2.5} />, color: 'bg-amber-100 text-amber-700 border-amber-200' },
    'gestante': { label: 'Gestante', icon: <Baby size={16} strokeWidth={2.5} />, color: 'bg-pink-100 text-pink-700 border-pink-200' },
    'cadeirante': { label: 'Cadeirante', icon: <Accessibility size={16} strokeWidth={2.5} />, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    'autista': { label: 'TEA', icon: <Heart size={16} strokeWidth={2.5} />, color: 'bg-teal-100 text-teal-700 border-teal-200' },
    'pcd': { label: 'PCD', icon: <Accessibility size={16} strokeWidth={2.5} />, color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

export default function Recepcao() {
    const { api } = useAuth();
    const { notify, confirmDialog } = useNotification();

    const [loading, setLoading] = useState(false);
    const [agendamentos, setAgendamentos] = useState([]);
    
    // Listas auxiliares
    const [profissionais, setProfissionais] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [convenios, setConvenios] = useState([]);

    // Filtros
    const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0]);
    const [profissionalFiltro, setProfissionalFiltro] = useState('');
    const [buscaTexto, setBuscaTexto] = useState('');
    const [statusVisiveis, setStatusVisiveis] = useState(['agendado', 'aguardando', 'em_atendimento', 'finalizado', 'faltou']);
    
    const [now, setNow] = useState(new Date());

    // Modais
    const [modalOpen, setModalOpen] = useState(false); // Check-in
    const [selectedItem, setSelectedItem] = useState(null);
    const [loadingCheckin, setLoadingCheckin] = useState(false);
    const [formCheckin, setFormCheckin] = useState({ 
        valor: '', forma_pagamento: 'dinheiro', pago: false, 
        profissional: '', especialidade: '', convenio: '' 
    });

    const [modalPacienteOpen, setModalPacienteOpen] = useState(false); // Edição Paciente
    const [pacienteParaEditar, setPacienteParaEditar] = useState(null);
    const [loadingPaciente, setLoadingPaciente] = useState(false);
    const [loadingCep, setLoadingCep] = useState(false);
    const [activePriorityMenu, setActivePriorityMenu] = useState(null);

    // Máscaras
    const mascaraCPF = (v) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14);
    const mascaraTelefone = (v) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').slice(0, 15);
    const mascaraCEP = (v) => v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);

    // Relógio
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Carregamento Inicial
    useEffect(() => {
        if(api) {
            api.get('profissionais/').then(res => setProfissionais(res.data.results || res.data)).catch(() => {});
            api.get('configuracoes/convenios/').then(res => setConvenios(res.data.results || res.data)).catch(() => {});
        }
    }, [api]);

    // Carregar Agenda
    useEffect(() => {
        if(api) carregarAgenda();
    }, [api, dataFiltro, profissionalFiltro]);

    // Sempre que trocar o profissional no check-in, limpa a especialidade
    useEffect(() => {
        setFormCheckin(prev => ({
            ...prev,
            especialidade: ''
        }));
    }, [formCheckin.profissional]);


    const carregarAgenda = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (dataFiltro) params.append('data', dataFiltro);
            if (profissionalFiltro) params.append('profissional', profissionalFiltro);
            const res = await api.get(`agendamento/?${params.toString()}`);
            setAgendamentos(Array.isArray(res.data.results || res.data) ? (res.data.results || res.data) : []);
        } catch (error) {
            notify.error("Erro ao carregar agenda.");
            setAgendamentos([]);
        } finally { setLoading(false); }
    };

    // Cálculos
    const calcularEspera = (horaChegada) => {
        if (!horaChegada) return 0;
        const chegada = new Date();
        const [h, m] = horaChegada.split(':');
        chegada.setHours(h, m, 0, 0); 
        if (chegada > now) return 0;
        const diffMs = now - chegada;
        return Math.max(0, Math.floor(diffMs / 60000));
    };

    const isCadastroIncompleto = (item) => {
        const cpf = item.paciente_cpf || item.detalhes_pdf?.paciente_cpf;
        const tel = item.paciente_telefone || item.telefone_paciente;
        const nasc = item.detalhes_pdf?.paciente_nascimento;
        return !cpf || !tel || !nasc;
    };

    const calcularIdade = (dataNasc) => {
        if (!dataNasc) return '-';
        const nasc = new Date(dataNasc);
        const hoje = new Date();
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const m = hoje.getMonth() - nasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
        return idade;
    };

    // Ações de Paciente
    const handleAbrirEditarPaciente = async (pacienteId) => {
        setLoadingPaciente(true);
        try {
            const res = await api.get(`pacientes/${pacienteId}/`);
            setPacienteParaEditar(res.data);
            setModalPacienteOpen(true);
        } catch (e) { notify.error("Erro ao carregar paciente."); } 
        finally { setLoadingPaciente(false); }
    };

    const handlePacienteChange = (e) => {
        let { name, value } = e.target;
        if (name === 'cpf') value = mascaraCPF(value);
        if (name === 'telefone') value = mascaraTelefone(value);
        if (name === 'cep') value = mascaraCEP(value);
        setPacienteParaEditar({ ...pacienteParaEditar, [name]: value });
    };

    const buscarCep = async () => {
        if (!pacienteParaEditar.cep) return;
        const cepLimpo = pacienteParaEditar.cep.replace(/\D/g, '');
        if (cepLimpo.length !== 8) return;
        setLoadingCep(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await response.json();
            if (!data.erro) {
                setPacienteParaEditar(prev => ({ 
                    ...prev, 
                    logradouro: data.logradouro, bairro: data.bairro, cidade: data.localidade, estado: data.uf 
                }));
                notify.success("Endereço encontrado!");
            } else { notify.warning("CEP não encontrado."); }
        } catch (e) { notify.error("Erro ao buscar CEP."); } 
        finally { setLoadingCep(false); }
    };

    const handleSalvarPacienteRapido = async (e) => {
        e.preventDefault();
        setLoadingPaciente(true);
        try {
            const payload = { ...pacienteParaEditar, cpf: pacienteParaEditar.cpf.replace(/\D/g, '') };
            await api.put(`pacientes/${pacienteParaEditar.id}/`, payload);
            notify.success("Cadastro atualizado!");
            setModalPacienteOpen(false);
            carregarAgenda(); // Recarrega para atualizar prioridade na lista
        } catch (e) { notify.error("Erro ao atualizar."); } 
        finally { setLoadingPaciente(false); }
    };

    const handleSetPriority = async (pacienteId, tipo) => {
        try {
            // Atualização Otimista
            setAgendamentos(prev => prev.map(ag => 
                ag.paciente === pacienteId || ag.paciente?.id === pacienteId ? { ...ag, paciente_prioridade: tipo } : ag
            ));
            setActivePriorityMenu(null);
            await api.patch(`pacientes/${pacienteId}/`, { prioridade: tipo });
            notify.success("Prioridade atualizada.");
            carregarAgenda();
        } catch (e) { notify.error("Erro ao definir prioridade."); }
    };

    // Ações de Agendamento
    const handleMarcarFalta = async (item) => {
        if (await confirmDialog(`Confirmar falta de ${item.nome_paciente}?`, "Registrar Falta", "Sim, Faltou", "Cancelar", "danger")) {
            try { await api.post(`agendamento/${item.id}/marcar_falta/`); notify.info("Falta registrada."); carregarAgenda(); } 
            catch { notify.error("Erro ao registrar falta."); }
        }
    };

    const handleReverter = async (item) => {
        if (await confirmDialog("Reverter status para 'Agendado'?", "Desfazer Ação", "Sim, Reverter", "Cancelar", "warning")) {
            try { await api.post(`agendamento/${item.id}/reverter_chegada/`); notify.info("Status revertido."); carregarAgenda(); } 
            catch { notify.error("Erro ao reverter."); }
        }
    };

    const abrirCheckin = (item) => {
        setSelectedItem(item);

        setFormCheckin({ 
            valor: item.valor || '',
            forma_pagamento: item.fatura_forma_pagamento || 'dinheiro',
            pago: item.fatura_pago || false,
            profissional: item.profissional || '',
            especialidade: item.especialidade || '',
            convenio: item.convenio || ''
        });

        setModalOpen(true);
    };

    const confirmarCheckin = async () => {
        setLoadingCheckin(true);
        try {
            await api.post(`agendamento/${selectedItem.id}/confirmar_chegada/`, formCheckin);
            notify.success("Recepção realizada!");
            setModalOpen(false);
            carregarAgenda();
        } catch (error) { notify.error("Erro ao confirmar."); }
        finally { setLoadingCheckin(false); }
    };

    const verificarAtraso = (horario, status) => {
        if (status !== 'agendado') return false;
        const dataAgendamento = new Date(dataFiltro + 'T' + horario);
        return dataFiltro === new Date().toISOString().split('T')[0] && new Date() > new Date(dataAgendamento.getTime() + 15*60000);
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'agendado': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30';
            case 'aguardando': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30';
            case 'em_atendimento': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30';
            case 'finalizado': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30';
            case 'faltou': return 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const itensFiltrados = agendamentos.filter(item => {
        if (!statusVisiveis.includes(item.status)) return false;
        if (buscaTexto) {
            const termo = buscaTexto.toLowerCase();
            return item.nome_paciente?.toLowerCase().includes(termo) || item.nome_profissional?.toLowerCase().includes(termo);
        }
        return true;
    });

    const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white transition-all font-bold";
    const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";
    // Especialidades vinculadas ao profissional selecionado no check-in
    const especialidadesFiltradas = useMemo(() => {
        if (!formCheckin.profissional) return [];

        const profissionalSelecionado = profissionais.find(
            p => String(p.id) === String(formCheckin.profissional)
        );

        if (!profissionalSelecionado || !profissionalSelecionado.especialidades_lista) {
            return [];
        }

        return profissionalSelecionado.especialidades_lista;


}, [formCheckin.profissional, profissionais]);

    return (
        <Layout>
            <div className="max-w-7xl mx-auto pb-20 tracking-tight">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tighter">
                            <CheckCircle2 className="text-green-600" size={32}/> Recepção & Fluxo
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Controle de espera e integridade cadastral.</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 mb-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div><label className={labelClass}>Data</label><input type="date" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)} className={inputClass}/></div>
                    <div><label className={labelClass}>Profissional</label><select value={profissionalFiltro} onChange={e => setProfissionalFiltro(e.target.value)} className={inputClass}><option value="">Todos</option>{profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
                    <div className="lg:col-span-2"><label className={labelClass}>Busca Rápida</label><div className="relative"><Search className="absolute left-4 top-3.5 text-slate-400" size={18} /><input placeholder="Paciente..." value={buscaTexto} onChange={e => setBuscaTexto(e.target.value)} className={`${inputClass} pl-12`}/></div></div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                    {['agendado', 'aguardando', 'em_atendimento', 'finalizado', 'faltou'].map(status => (
                        <button key={status} onClick={() => setStatusVisiveis(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status])} 
                                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${statusVisiveis.includes(status) ? getStatusColor(status) + ' shadow-md scale-105' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700 opacity-40'}`}>
                            {status.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 min-h-[400px]">
                    <div className="overflow-visible">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 font-black text-[10px] uppercase tracking-widest text-slate-400">
                                <tr>
                                    <th className="px-8 py-5">🕒 Hora / Espera</th>
                                    <th className="px-8 py-5">📍 Status</th>
                                    <th className="px-8 py-5">👤 Paciente</th>
                                    <th className="px-8 py-5">🩺 Profissional</th>
                                    <th className="px-8 py-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40}/></td></tr>
                                ) : itensFiltrados.map((item) => {
                                    const atrasado = verificarAtraso(item.horario, item.status);
                                    const esperaMin = item.status === 'aguardando' ? calcularEspera(item.horario_chegada) : 0;
                                    const incompleto = isCadastroIncompleto(item);
                                    
                                    // Tenta ler a prioridade de todas as fontes possíveis
                                    const prioridadeKey = item.paciente_prioridade || item.prioridade || (item.paciente_dados && item.paciente_dados.prioridade);
                                    const pInfo = PRIORIDADES[prioridadeKey];

                                    return (
                                        <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-all">
                                            <td className="px-8 py-6">
                                                <div className={`font-black text-lg font-mono ${atrasado ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {item.horario.slice(0, 5)}
                                                </div>
                                                {item.status === 'aguardando' && (
                                                    <div className={`text-[10px] font-black uppercase flex items-center gap-1 mt-1 ${esperaMin > 30 ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
                                                        <Clock size={10}/> {esperaMin} min de espera
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusColor(item.status)}`}>
                                                    {item.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 relative">
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => handleAbrirEditarPaciente(item.paciente)} className="font-black text-slate-800 dark:text-white uppercase text-sm hover:text-blue-600 transition-colors text-left">
                                                        {item.nome_paciente}
                                                    </button>
                                                    {incompleto && (
                                                        <button onClick={() => handleAbrirEditarPaciente(item.paciente)} title="Dados Cruciais Faltando">
                                                            <AlertTriangle size={16} className="text-rose-500 animate-bounce" />
                                                        </button>
                                                    )}
                                                    
                                                    {pInfo && (
                                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${pInfo.color} shadow-sm`}>
                                                            {pInfo.icon} {pInfo.label}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="relative">
                                                        <button onClick={() => setActivePriorityMenu(activePriorityMenu === item.id ? null : item.id)} className={`p-1 rounded-full transition-all ${prioridadeKey ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}>
                                                            <Star size={16} fill={prioridadeKey ? "currentColor" : "none"}/>
                                                        </button>
                                                        
                                                        {activePriorityMenu === item.id && (
                                                            <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl shadow-2xl z-[150] p-2 animate-in fade-in zoom-in-95">
                                                                {Object.entries(PRIORIDADES).map(([key, info]) => (
                                                                    <button key={key} onClick={() => handleSetPriority(item.paciente, key)} className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-200 transition-colors"><span className={`p-1 rounded-lg bg-current/10 ${info.color}`}>{info.icon}</span> {info.label}</button>
                                                                ))}
                                                                <button onClick={() => handleSetPriority(item.paciente, null)} className="w-full text-center px-3 py-2 mt-2 border-t dark:border-slate-700 text-red-500 text-[10px] font-black uppercase">Limpar Prioridade</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                                    {calcularIdade(item.detalhes_pdf?.paciente_nascimento)} ANOS • {item.nome_convenio || 'PARTICULAR'}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6"><div className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase">{item.nome_profissional}</div><div className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{item.nome_especialidade}</div></td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end items-center gap-2">
                                                    <div className={item.fatura_pago ? 'text-emerald-500' : 'text-slate-200'}><DollarSign size={20} strokeWidth={3}/></div>
                                                    
                                                    {item.status === 'agendado' ? (
                                                        <>
                                                            <button onClick={() => handleMarcarFalta(item)} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Faltou"><UserX size={18}/></button>
                                                            <button onClick={() => abrirCheckin(item)} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20 active:scale-95 transition-all">Check-in</button>
                                                        </>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleReverter(item)} className="p-2.5 text-slate-400 hover:text-orange-500 bg-white border border-slate-200 hover:bg-orange-50 rounded-xl shadow-sm transition-all" title="Reverter Status"><RotateCcw size={16}/></button>
                                                            {['aguardando', 'em_atendimento', 'finalizado'].includes(item.status) && (
                                                                <button onClick={() => abrirCheckin(item)} className="p-2.5 text-blue-600 hover:bg-blue-50 bg-white border border-slate-200 rounded-xl shadow-sm transition-all" title="Editar Financeiro"><Pencil size={16}/></button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODAL CHECKIN (Cabeçalho com Prioridade Corrigido) */}
                {modalOpen && selectedItem && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/10">
                             <div className="bg-green-600 p-8 text-white relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-white/20 p-3 rounded-2xl shadow-inner"><CheckCircle2 size={32}/></div>
                                        <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-2xl font-black uppercase tracking-tighter">Confirmação de Recepção</h3>
                                        
                                        {/* ÍCONE DE PRIORIDADE NO MODAL */}
                                        {(selectedItem.paciente_prioridade || selectedItem.prioridade) && 
                                         PRIORIDADES[selectedItem.paciente_prioridade || selectedItem.prioridade] && (
                                            <div className="bg-white text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-2 shadow-lg border-2 border-white/20">
                                                {PRIORIDADES[selectedItem.paciente_prioridade || selectedItem.prioridade].icon}
                                                {PRIORIDADES[selectedItem.paciente_prioridade || selectedItem.prioridade].label}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-green-100 text-sm font-bold uppercase tracking-widest mt-1 opacity-80">{selectedItem.nome_paciente}</p>
                                </div>
                            </div>
                            <div className="p-8 space-y-8">
                                <div>
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2 flex items-center gap-2"><Stethoscope size={14}/> Dados do Atendimento</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div><label className={labelClass}>Profissional</label><select value={formCheckin.profissional} onChange={e => setFormCheckin({...formCheckin, profissional: e.target.value})} className={inputClass}><option value="">Selecione...</option>{profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
                                        <select
                                            value={formCheckin.especialidade}
                                            onChange={e => setFormCheckin({...formCheckin, especialidade: e.target.value})}
                                            className={inputClass}
                                            disabled={!formCheckin.profissional}
                                        >
                                            <option value="">
                                                {formCheckin.profissional ? 'Selecione...' : 'Selecione um profissional primeiro'}
                                            </option>

                                            {especialidadesFiltradas.map(e => (
                                                <option key={e.id} value={e.id}>
                                                    {e.nome}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="md:col-span-2"><label className={labelClass}>Plano / Convênio</label><div className="relative"><ShieldCheck className="absolute left-3 top-3.5 text-slate-400" size={16}/><select value={formCheckin.convenio} onChange={e => setFormCheckin({...formCheckin, convenio: e.target.value})} className={`${inputClass} pl-10`}><option value="">Particular (Sem convênio)</option>{convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div></div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign size={14}/> Financeiro da Consulta</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                                        <div><label className={labelClass}>Valor Acordado</label><div className="relative"><span className="absolute left-4 top-3.5 text-slate-400 font-bold text-sm">R$</span><input type="number" value={formCheckin.valor} onChange={e => setFormCheckin({...formCheckin, valor: e.target.value})} className={`${inputClass} pl-10 font-black text-lg text-blue-600`}/></div></div>
                                        <div><label className={labelClass}>Forma de Pagamento</label><select value={formCheckin.forma_pagamento} onChange={e => setFormCheckin({...formCheckin, forma_pagamento: e.target.value})} className={inputClass}><option value="dinheiro">💵 Dinheiro</option><option value="pix">📱 Pix</option><option value="cartao_credito">💳 Crédito</option><option value="cartao_debito">💳 Débito</option></select></div>
                                    </div>
                                    <div onClick={() => setFormCheckin(prev => ({ ...prev, pago: !prev.pago }))} className={`cursor-pointer p-4 rounded-xl border flex items-center justify-between transition-all ${formCheckin.pago ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center ${formCheckin.pago ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{formCheckin.pago ? <Check size={20}/> : <X size={20}/>}</div><div><p className={`font-black uppercase text-xs tracking-widest ${formCheckin.pago ? 'text-green-700' : 'text-slate-500'}`}>{formCheckin.pago ? 'Pagamento Realizado' : 'Pagamento Pendente'}</p><p className="text-[10px] text-slate-400">Clique para alterar o status</p></div></div><div className={`w-12 h-6 rounded-full relative transition-colors ${formCheckin.pago ? 'bg-green-500' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${formCheckin.pago ? 'left-7' : 'left-1'}`}></div></div></div>
                                </div>
                                <button onClick={confirmarCheckin} disabled={loadingCheckin} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-green-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">{loadingCheckin ? <Loader2 className="animate-spin"/> : <Save size={20}/>} Confirmar Recepção</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL DE EDIÇÃO DE PACIENTE (COMPLETO) */}
                {modalPacienteOpen && pacienteParaEditar && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-4xl my-10 overflow-hidden border border-white/10">
                            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                                <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2"><UserCog size={18} className="text-blue-400"/> Atualizar Cadastro: {pacienteParaEditar.nome}</h3>
                                <button onClick={() => setModalPacienteOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
                            </div>
                            <form onSubmit={handleSalvarPacienteRapido} className="p-8 grid grid-cols-1 md:grid-cols-12 gap-5">
                                <div className="md:col-span-12 border-b dark:border-slate-700 pb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações Pessoais</div>
                                
                                <div className="md:col-span-6"><label className={labelClass}>Nome Completo</label><input name="nome" value={pacienteParaEditar.nome} onChange={handlePacienteChange} className={inputClass} required /></div>
                                <div className="md:col-span-3"><label className={labelClass}>CPF</label><input name="cpf" value={pacienteParaEditar.cpf} onChange={handlePacienteChange} className={inputClass} required /></div>
                                <div className="md:col-span-3"><label className={labelClass}>Telefone</label><input name="telefone" value={pacienteParaEditar.telefone} onChange={handlePacienteChange} className={inputClass} required /></div>
                                
                                <div className="md:col-span-3"><label className={labelClass}>Data Nascimento</label><input type="date" name="data_nascimento" value={pacienteParaEditar.data_nascimento} onChange={handlePacienteChange} className={inputClass} required /></div>
                                <div className="md:col-span-3"><label className={labelClass}>Sexo</label>
                                    <select name="sexo" value={pacienteParaEditar.sexo || ''} onChange={handlePacienteChange} className={inputClass}>
                                        <option value="">Selecione...</option>
                                        <option value="Feminino">Feminino</option>
                                        <option value="Masculino">Masculino</option>
                                    </select>
                                </div>
                                <div className="md:col-span-3"><label className={labelClass}>Prioridade</label>
                                    <select name="prioridade" value={pacienteParaEditar.prioridade || ''} onChange={handlePacienteChange} className={inputClass}>
                                        <option value="">Nenhuma</option>
                                        {Object.entries(PRIORIDADES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-3"><label className={labelClass}>Nome da Mãe</label><input name="nome_mae" value={pacienteParaEditar.nome_mae || ''} onChange={handlePacienteChange} className={inputClass} /></div>

                                <div className="md:col-span-12 border-b dark:border-slate-700 pb-2 mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={14}/> Endereço</div>
                                
                                <div className="md:col-span-2"><label className={labelClass}>CEP</label>
                                    <div className="relative">
                                        <input name="cep" value={pacienteParaEditar.cep || ''} onChange={handlePacienteChange} onBlur={buscarCep} className={inputClass} required />
                                        {loadingCep && <span className="absolute right-2 top-2.5 text-[9px] font-bold text-blue-500 animate-pulse">BUSCANDO</span>}
                                    </div>
                                </div>
                                <div className="md:col-span-6"><label className={labelClass}>Logradouro</label><input name="logradouro" value={pacienteParaEditar.logradouro || ''} onChange={handlePacienteChange} className={inputClass} required /></div>
                                <div className="md:col-span-2"><label className={labelClass}>Nº</label><input name="numero" value={pacienteParaEditar.numero || ''} onChange={handlePacienteChange} className={inputClass} required /></div>
                                <div className="md:col-span-2"><label className={labelClass}>UF</label><input name="estado" value={pacienteParaEditar.estado || ''} onChange={handlePacienteChange} className={inputClass} required maxLength={2} /></div>
                                <div className="md:col-span-4"><label className={labelClass}>Bairro</label><input name="bairro" value={pacienteParaEditar.bairro || ''} onChange={handlePacienteChange} className={inputClass} required /></div>
                                <div className="md:col-span-4"><label className={labelClass}>Cidade</label><input name="cidade" value={pacienteParaEditar.cidade || ''} onChange={handlePacienteChange} className={inputClass} required /></div>
                                <div className="md:col-span-4"><label className={labelClass}>Complemento</label><input name="complemento" value={pacienteParaEditar.complemento || ''} onChange={handlePacienteChange} className={inputClass} /></div>

                                <div className="md:col-span-12 pt-8 flex gap-4 justify-end border-t dark:border-slate-700 mt-4">
                                    <button type="button" onClick={() => setModalPacienteOpen(false)} className="px-8 py-3 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                                    <button type="submit" disabled={loadingPaciente} className="px-10 py-3 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2">
                                        {loadingPaciente ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Gravar Alterações
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
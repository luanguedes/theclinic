import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
    Users, DollarSign, Activity, Clock, TrendingUp, 
    CalendarCheck, ChevronRight, Stethoscope,
    Calendar, Lock, Eye, EyeOff, Loader2, RefreshCw 
} from 'lucide-react';
import { formatDateDMY } from '../utils/date';

// --- COMPONENTE DE BLOQUEIO VISUAL (Mantido) ---
const RestrictedOverlay = ({ label }) => (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 dark:bg-slate-900/80 backdrop-blur-[4px] rounded-[24px] transition-all border-2 border-dashed border-slate-200 dark:border-slate-700">
        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl mb-3 border border-slate-100 dark:border-slate-700">
            <Lock size={20} className="text-blue-500" />
        </div>
        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] px-4 py-1.5 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
            {label || "Acesso Restrito"}
        </span>
    </div>
);

export default function Dashboard() {
    const { user, api } = useAuth();
    const { notify } = useNotification();
    const navigate = useNavigate();
    
    // --- PERMISSÕES ---
    const isSuperUser = user?.is_superuser;
    const isProfissional = user?.acesso_atendimento || !!user?.profissional_id || isSuperUser;
    const isRecepcao = user?.acesso_agendamento || isSuperUser;
    const isFinanceiro = user?.acesso_faturamento || isSuperUser;

    // --- FILTROS ---
    const getLocalISODate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getLocalYearMonth = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    const hoje = getLocalISODate(new Date());
    const mesAtual = getLocalYearMonth(new Date());

    const [filtroDia, setFiltroDia] = useState(hoje);
    const [filtroMes, setFiltroMes] = useState(mesAtual);

    // --- DADOS ---
    const [statsDia, setStatsDia] = useState({ total: 0, aguardando: 0, ocupacaoPercent: 0, maxSlots: 0 });
    const [statsMes, setStatsMes] = useState({ totalPacientes: 0, receitaConfirmada: 0, receitaEstimada: 0 });
    const [listaHoje, setListaHoje] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [showValues, setShowValues] = useState(false);

    useEffect(() => {
        if (api) carregarDados();
    }, [api, filtroDia, filtroMes]);

    const calcularCapacidadeDia = (regras) => {
        return regras.reduce((total, regra) => {
            if (regra.tipo === 'fixo') {
                return total + Number(regra.quantidade_atendimentos || 0);
            }

            const intervalo = Number(regra.intervalo_minutos || 0);
            if (!regra.hora_inicio || !regra.hora_fim || intervalo <= 0) return total;

            const [hInicio, mInicio] = String(regra.hora_inicio).split(':');
            const [hFim, mFim] = String(regra.hora_fim).split(':');
            const inicioMin = Number(hInicio) * 60 + Number(mInicio);
            const fimMin = Number(hFim) * 60 + Number(mFim);

            if (!Number.isFinite(inicioMin) || !Number.isFinite(fimMin) || fimMin <= inicioMin) return total;

            const slots = Math.floor((fimMin - inicioMin) / intervalo);
            const qtdPorSlot = regra.tipo === 'periodo' ? Number(regra.quantidade_atendimentos || 1) : 1;

            return total + slots * qtdPorSlot;
        }, 0);
    };

    const carregarDados = async () => {
        setLoading(true);
        try {
            // --- LÓGICA DE FILTRO POR PROFISSIONAL ---
            let queryExtra = '';
            const usaFiltroProfissional = !isSuperUser && !isRecepcao && user?.profissional_id;
            if (usaFiltroProfissional) {
                queryExtra = `&profissional=${user.profissional_id}`;
            }

            // 1. DADOS DO DIA
            const [ano, mes] = filtroMes.split('-');
            const diaSemana = new Date(`${filtroDia}T00:00:00`).getDay();
            const agendaConfigParams = new URLSearchParams({ data_especifica: filtroDia, dia_filtro: String(diaSemana), nopage: 'true' });
            if (usaFiltroProfissional) {
                agendaConfigParams.append('profissional_id', user.profissional_id);
            }

            const [resDia, resMes, resConfig] = await Promise.all([
                api.get(`agendamento/?data=${filtroDia}&nopage=true${queryExtra}`),
                api.get(`agendamento/?mes=${mes}&ano=${ano}&nopage=true${queryExtra}`),
                api.get(`agendas/config/?${agendaConfigParams.toString()}`)
            ]);

            const dadosDiaBrutos = resDia.data.results || resDia.data;
            const agendaAtivaDia = dadosDiaBrutos.filter(a => a.status !== 'cancelado');

            const regrasDia = resConfig.data.results || resConfig.data || [];
            const maxSlotsDia = calcularCapacidadeDia(Array.isArray(regrasDia) ? regrasDia : []);
            const perc = maxSlotsDia > 0 ? Math.min(Math.round((agendaAtivaDia.length / maxSlotsDia) * 100), 100) : 0;

            setListaHoje(agendaAtivaDia);
            setStatsDia({ 
                total: agendaAtivaDia.length, 
                aguardando: agendaAtivaDia.filter(a => a.status === 'aguardando').length,
                ocupacaoPercent: perc,
                maxSlots: maxSlotsDia
            });

            // 2. DADOS DO MÊS
            const dadosMesBrutos = resMes.data.results || resMes.data;

            const pacientesValidosMes = dadosMesBrutos.filter(a => a.status !== 'cancelado' && a.status !== 'faltou');

            let receitaConfirmada = 0;
            let receitaEstimada = 0;

            if (isFinanceiro) {
                receitaConfirmada = dadosMesBrutos
                    .filter(a => a.fatura_pago === true && a.status !== 'cancelado')
                    .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);

                receitaEstimada = dadosMesBrutos
                    .filter(a => a.status !== 'cancelado' && a.status !== 'faltou')
                    .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
            }

            setStatsMes({ totalPacientes: pacientesValidosMes.length, receitaConfirmada, receitaEstimada });
        } catch (error) {
            notify.error("Erro ao sincronizar dados do dashboard.");
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'agendado': return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
            case 'aguardando': return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
            case 'em_atendimento': return 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
            case 'finalizado': return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
            case 'faltou': return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const StatCard = ({ title, value, subValue, icon: Icon, colorClass, loading, restricted, restrictedLabel, isCurrency }) => (
        <div className="relative bg-white dark:bg-slate-800 p-6 rounded-[24px] border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden group h-full flex flex-col justify-between">
            {restricted && <RestrictedOverlay label={restrictedLabel} />}
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{title}</p>
                    {loading ? (
                        <div className="h-10 w-2/3 bg-slate-100 dark:bg-slate-700 animate-pulse rounded-xl mt-2"></div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <h3 className={`text-2xl font-black text-slate-900 dark:text-white tracking-tighter ${isCurrency && !showValues && isFinanceiro ? 'blur-md select-none opacity-50' : ''}`}>
                                {value}
                            </h3>
                            {isCurrency && isFinanceiro && (
                                <button onClick={() => setShowValues(!showValues)} className="text-slate-300 hover:text-blue-500 transition-colors p-1 rounded-full hover:bg-slate-100">
                                    {showValues ? <EyeOff size={16}/> : <Eye size={16}/>}
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-2xl ${colorClass} transition-transform group-hover:scale-110 duration-300`}>
                    <Icon size={24} />
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                <p className={`text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight truncate ${isCurrency && !showValues && isFinanceiro ? 'blur-[3px] opacity-50' : ''}`}>
                    {subValue}
                </p>
            </div>
        </div>
    );

    return (
        <Layout>
            <div className="max-w-7xl mx-auto pb-20">
                
                {/* HEADER COM FILTROS */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter flex items-center gap-3 uppercase">
                                Visão Geral
                            </h1>
                        </div>
                        <p className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-[0.2em] ml-5">
                            Gestão Estratégica • {user?.first_name || user?.username}
                        </p>
                    </div>

                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
                        <div className="flex items-center gap-3 px-4 py-2 border-r border-slate-200 dark:border-slate-600">
                            <Calendar size={18} className="text-blue-600"/>
                            <input type="date" value={filtroDia} onChange={e => setFiltroDia(e.target.value)} className="bg-transparent text-sm font-black text-slate-700 dark:text-white outline-none cursor-pointer uppercase"/>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2">
                            <TrendingUp size={18} className="text-purple-600"/>
                            <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="bg-transparent text-sm font-black text-slate-700 dark:text-white outline-none cursor-pointer uppercase"/>
                        </div>
                    </div>
                </div>

                {/* KPIs PRINCIPAIS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 font-bold">
                    <StatCard 
                        title="Fluxo do Dia"
                        value={`${statsDia.total} Pacientes`}
                        subValue={`${statsDia.aguardando} pessoas na sala de espera`}
                        icon={CalendarCheck}
                        colorClass="bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none"
                        loading={loading}
                    />
                    <StatCard 
                        title="Atendimentos Previstos"
                        value={`${statsMes.totalPacientes} Pacientes`}
                        subValue={`Total de agendamentos no mês (Previsto)`}
                        icon={Users}
                        colorClass="bg-purple-600 text-white shadow-lg shadow-purple-200 dark:shadow-none"
                        loading={loading}
                    />
                    <StatCard 
                        title="Liquidez Confirmada"
                        value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsMes.receitaConfirmada)}
                        subValue={`De um total previsto de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsMes.receitaEstimada)}`}
                        icon={DollarSign}
                        colorClass="bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none"
                        loading={loading}
                        restricted={!isFinanceiro}
                        restrictedLabel="Acesso Financeiro"
                        isCurrency={true}
                    />
                </div>

                {/* GRID DE CONTEÚDO */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* LISTAGEM DA AGENDA */}
                    <div className="relative lg:col-span-2 bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-[500px]">
                        {(!isProfissional && !isRecepcao) && <RestrictedOverlay label="Módulo Clínico/Recepção" />}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="font-black text-xl text-slate-800 dark:text-white uppercase tracking-tighter">Agenda Diária</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Sincronizado agora</p>
                            </div>                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={carregarDados}
                                    disabled={loading}
                                    className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm disabled:opacity-60"
                                    title="Atualizar"
                                >
                                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                </button>
                                <Link to="/recepcao" className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm flex items-center gap-2">
                                    RECEPÇÃO <ChevronRight size={14}/>
                                </Link>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-auto">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
                                    <Loader2 className="animate-spin text-blue-600" size={32}/>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Buscando dados...</span>
                                </div>
                            ) : listaHoje.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                                    <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-full mb-6 border border-slate-100 dark:border-slate-800">
                                        <Calendar size={64} className="text-slate-200 dark:text-slate-700"/>
                                    </div>
                                    <h4 className="text-slate-800 dark:text-white font-black text-xl uppercase tracking-tighter">Sem movimentação</h4>
                                    <p className="text-slate-400 max-w-xs mx-auto mt-2 text-sm font-medium">Não existem agendamentos para o dia {formatDateDMY(filtroDia)}.</p>
                                </div>
                            ) : (
                                <div className="p-4">
                                    <table className="w-full text-left">
                                        <thead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b dark:border-slate-700">
                                            <tr>
                                                <th className="px-6 py-4">🕒 Hora</th>
                                                <th className="px-6 py-4">👤 Paciente</th>
                                                <th className="px-6 py-4">📍 Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                            {listaHoje.map((item) => (
                                                <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all">
                                                    <td className="px-6 py-5 font-black text-blue-600 dark:text-blue-400 font-mono text-base">{item.horario.slice(0,5)}</td>
                                                    <td className="px-6 py-5">
                                                        <div className="font-bold text-slate-800 dark:text-white uppercase text-xs">{item.nome_paciente}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 group-hover:text-blue-500 transition-colors uppercase tracking-tighter mt-0.5 flex items-center gap-1">
                                                            <Stethoscope size={10}/> {item.nome_profissional}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(item.status)}`}>{item.status.replace('_', ' ')}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUNA LATERAL DE PERFORMANCE */}
                    <div className="flex flex-col gap-6">
                        
                        {/* --- CORREÇÃO DO CARD: INVERSÃO DE CORES --- */}
                        <div className="relative bg-blue-600 dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl overflow-hidden group">
                            {!isProfissional && <RestrictedOverlay label="Módulo Médico" />}
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                            
                            <div className="relative z-10">
                                <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl mb-6 inline-flex border border-white/30">
                                    <Activity size={32} className="text-white animate-pulse"/>
                                </div>
                                <h3 className="text-4xl font-black text-white mb-2 tracking-tighter italic">
                                    {statsDia.aguardando}
                                </h3>
                                <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-8 opacity-80">
                                    Pacientes em espera
                                </p>
                                <button 
                                    onClick={() => navigate('/atendimento-consultas')}
                                    disabled={!isProfissional}
                                    className="w-full bg-white text-slate-900 font-black uppercase text-xs tracking-widest py-4 rounded-2xl shadow-xl hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    Iniciar Próximo Chamado
                                </button>
                            </div>
                        </div>
                        
                        {/* GRÁFICO DE OCUPAÇÃO */}
                        <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-8">
                                <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest flex items-center gap-2">
                                    <TrendingUp size={16} className="text-emerald-500"/> Taxa de Ocupação
                                </h4>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                                        {statsDia.total}/{statsDia.maxSlots}
                                    </span>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {statsDia.ocupacaoPercent}% ocupado
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
                                        <span className="text-slate-400">Slots Preenchidos</span>
                                        <span className="text-slate-700 dark:text-slate-200">{statsDia.total} de {statsDia.maxSlots}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-4 p-1 shadow-inner">
                                        <div 
                                            className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-1000 ease-out shadow-sm" 
                                            style={{ width: `${statsDia.ocupacaoPercent}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed uppercase tracking-tight">
                                        Dica: Dias com ocupação acima de <span className="text-blue-600">85%</span> indicam necessidade de abertura de novos horários ou profissionais extras.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

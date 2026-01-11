import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
    Users, DollarSign, Activity, Clock, TrendingUp, 
    CalendarCheck, AlertCircle, ChevronRight, Stethoscope,
    Calendar, Filter, Plus, Lock 
} from 'lucide-react';

// --- COMPONENTE DE BLOQUEIO VISUAL ---
const RestrictedOverlay = ({ label }) => (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-[3px] rounded-2xl transition-all">
        <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-lg mb-2">
            <Lock size={24} className="text-slate-400 dark:text-slate-500" />
        </div>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-3 py-1 bg-white/80 dark:bg-slate-800/80 rounded-full shadow-sm">
            {label || "Acesso Restrito"}
        </span>
    </div>
);

export default function Dashboard() {
    const { user, api } = useAuth();
    const navigate = useNavigate();
    
    // --- PERMISSÕES ---
    const isSuperUser = user?.is_superuser;
    const isProfissional = user?.acesso_atendimento || !!user?.profissional_id || isSuperUser;
    const isRecepcao = user?.acesso_agendamento || isSuperUser;
    const isFinanceiro = user?.acesso_faturamento || isSuperUser;

    // --- FILTROS ---
    const hoje = new Date().toISOString().split('T')[0];
    const mesAtual = new Date().toISOString().slice(0, 7);

    const [filtroDia, setFiltroDia] = useState(hoje);
    const [filtroMes, setFiltroMes] = useState(mesAtual);

    // --- DADOS ---
    const [statsDia, setStatsDia] = useState({ total: 0, aguardando: 0 });
    const [statsMes, setStatsMes] = useState({ totalPacientes: 0, receitaConfirmada: 0, receitaEstimada: 0 });
    const [listaHoje, setListaHoje] = useState([]); 
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (api) {
            carregarDados();
        }
    }, [api, filtroDia, filtroMes]);

    const carregarDados = async () => {
        setLoading(true);
        try {
            // =======================================================
            // 1. CARREGAR E PROCESSAR DADOS DO DIA
            // =======================================================
            const resDia = await api.get(`agendamento/?data=${filtroDia}&nopage=true`);
            const dadosDiaBrutos = resDia.data.results || resDia.data;
            
            // REGRA: Na lista do dia e contagem diária, ignoramos apenas CANCELADOS.
            // Faltosos aparecem para sabermos que faltaram.
            const agendaAtivaDia = dadosDiaBrutos.filter(a => a.status !== 'cancelado');
            
            setListaHoje(agendaAtivaDia);
            setStatsDia({ 
                total: agendaAtivaDia.length, 
                aguardando: agendaAtivaDia.filter(a => a.status === 'aguardando').length 
            });

            // =======================================================
            // 2. CARREGAR E PROCESSAR DADOS DO MÊS
            // =======================================================
            const [ano, mes] = filtroMes.split('-');
            const resMes = await api.get(`agendamento/?mes=${mes}&ano=${ano}&nopage=true`);
            const dadosMesBrutos = resMes.data.results || resMes.data;

            // REGRA KPI 1: Contagem de Pacientes do Mês
            // "Desconsiderar cancelados e faltosos"
            const pacientesValidosMes = dadosMesBrutos.filter(a => 
                a.status !== 'cancelado' && a.status !== 'faltou'
            );

            // REGRA KPI 2: Financeiro
            let receitaConfirmada = 0;
            let receitaEstimada = 0;

            if (isFinanceiro) {
                // Confirmada: Soma tudo que tem flag 'pago=True', exceto cancelados (estorno)
                receitaConfirmada = dadosMesBrutos
                    .filter(a => a.fatura_pago === true && a.status !== 'cancelado')
                    .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);

                // Estimada: Soma tudo que NÃO é cancelado e NÃO é falta (potencial de ganho)
                receitaEstimada = dadosMesBrutos
                    .filter(a => a.status !== 'cancelado' && a.status !== 'faltou')
                    .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
            }

            setStatsMes({ 
                totalPacientes: pacientesValidosMes.length, 
                receitaConfirmada,
                receitaEstimada
            });

        } catch (error) {
            console.error("Erro ao calcular dashboard", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRealizarAtendimento = () => {
        if (!isProfissional) return;
        navigate('/triagem'); 
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'agendado': return 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
            case 'aguardando': return 'bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
            case 'em_atendimento': return 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
            case 'finalizado': return 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
            case 'faltou': return 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const StatCard = ({ title, value, subValue, icon: Icon, colorClass, loading, restricted, restrictedLabel }) => (
        <div className="relative bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden h-full flex flex-col justify-between">
            {restricted && <RestrictedOverlay label={restrictedLabel} />}
            
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
                    {loading ? (
                        <div className="h-8 w-24 bg-slate-100 dark:bg-slate-700 animate-pulse rounded mt-2"></div>
                    ) : (
                        <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">{value}</h3>
                    )}
                </div>
                <div className={`p-3 rounded-xl ${colorClass}`}>
                    <Icon size={24} />
                </div>
            </div>
            
            {subValue && (
                <div className="flex items-center gap-2 text-sm mt-2 pt-2 border-t border-slate-50 dark:border-slate-700/50">
                    <span className="flex items-center text-slate-400 font-medium truncate">
                       {subValue}
                    </span>
                </div>
            )}
        </div>
    );

    return (
        <Layout>
            <div className="max-w-7xl mx-auto pb-10">
                
                {/* CABEÇALHO */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                           <Activity size={24} className="text-blue-600"/> Dashboard
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                            Visão geral de <span className="font-semibold text-slate-900 dark:text-slate-200">{user?.first_name || user?.username}</span>
                        </p>
                    </div>

                    <div className="flex items-center bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 px-3 py-2 border-r border-slate-100 dark:border-slate-700">
                            <Filter size={16} className="text-slate-400"/>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide hidden sm:inline">Filtros:</span>
                        </div>
                        
                        <div className="flex items-center gap-2 px-3">
                            <span className="text-xs text-slate-400">Dia:</span>
                            <input 
                                type="date" 
                                value={filtroDia} 
                                onChange={e => setFiltroDia(e.target.value)} 
                                className="bg-transparent text-sm font-semibold text-slate-700 dark:text-white outline-none cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center gap-2 px-3 border-l border-slate-100 dark:border-slate-700">
                            <span className="text-xs text-slate-400">Mês:</span>
                            <input 
                                type="month" 
                                value={filtroMes} 
                                onChange={e => setFiltroMes(e.target.value)} 
                                className="bg-transparent text-sm font-semibold text-slate-700 dark:text-white outline-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard 
                        title="Agendamentos (Dia)"
                        value={statsDia.total}
                        subValue={`${statsDia.aguardando} Aguardando atendimento`}
                        icon={CalendarCheck}
                        colorClass="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                        loading={loading}
                    />

                    <StatCard 
                        title="Atendimentos (Mês)"
                        value={statsMes.totalPacientes}
                        subValue={`Exclui faltas e cancelamentos`}
                        icon={Users}
                        colorClass="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                        loading={loading}
                    />

                    <StatCard 
                        title="Receita Confirmada"
                        value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsMes.receitaConfirmada)}
                        subValue={`Previsto Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsMes.receitaEstimada)}`}
                        icon={DollarSign}
                        colorClass="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                        loading={loading}
                        restricted={!isFinanceiro}
                        restrictedLabel="Acesso Financeiro"
                    />
                </div>

                {/* ÁREA PRINCIPAL */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* AGENDA DE HOJE */}
                    <div className="relative lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-[400px]">
                        
                        {(!isProfissional && !isRecepcao) && (
                            <RestrictedOverlay label="Restrito à Recepção/Profissionais" />
                        )}

                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                                <Clock size={20} className="text-slate-400"/> Agenda do Dia
                            </h3>
                            <Link to="/recepcao" className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                                Ir para Recepção <ChevronRight size={16}/>
                            </Link>
                        </div>
                        
                        <div className="flex-1 overflow-auto p-2">
                            {loading ? (
                                <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div> Carregando...
                                </div>
                            ) : listaHoje.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-full mb-4">
                                        <Calendar size={48} className="text-slate-300 dark:text-slate-600"/>
                                    </div>
                                    <h4 className="text-slate-900 dark:text-white font-bold text-lg">Agenda Livre</h4>
                                    <p className="text-slate-500 max-w-xs mx-auto mt-2 mb-6">
                                        Nenhum paciente agendado para hoje ({filtroDia.split('-')[2]}/{filtroDia.split('-')[1]}).
                                    </p>
                                    <button 
                                        onClick={() => isRecepcao && navigate('/agenda/marcar')} 
                                        disabled={!isRecepcao}
                                        className={`
                                            font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all 
                                            ${isRecepcao 
                                                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-none active:scale-95" 
                                                : "bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500"
                                            }
                                        `}
                                    >
                                        {isRecepcao ? <Plus size={18}/> : <Lock size={18}/>} 
                                        {isRecepcao ? "Novo Agendamento" : "Apenas Recepção/Agendamento"}
                                    </button>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-3">Horário</th>
                                            <th className="px-6 py-3">Paciente</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                                        {listaHoje.map((item) => (
                                            <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200 font-mono">
                                                    {item.horario.slice(0,5)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 dark:text-white">{item.nome_paciente}</div>
                                                    <div className="text-xs text-slate-500 group-hover:text-blue-500 transition-colors">{item.nome_profissional}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold capitalize ${getStatusStyle(item.status)}`}>
                                                        {item.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-600 dark:text-slate-400">
                                                    {item.valor > 0 ? `R$ ${Number(item.valor).toFixed(2)}` : <span className="text-slate-300">-</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* COLUNA LATERAL */}
                    <div className="flex flex-col gap-6">
                        
                        {/* CARD AGUARDANDO */}
                        <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col justify-center items-center text-center">
                            {!isProfissional && <RestrictedOverlay label="Acesso Profissional" />}
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-yellow-400"></div>
                            <div className="relative z-10 w-full">
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-full mb-4 inline-flex items-center justify-center ring-8 ring-yellow-50/50 dark:ring-yellow-900/10">
                                    <AlertCircle size={32} className="text-yellow-600 dark:text-yellow-400"/>
                                </div>
                                <h3 className="text-5xl font-extrabold text-slate-800 dark:text-white mb-1 tracking-tighter">
                                    {statsDia.aguardando}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
                                    Pacientes Aguardando
                                </p>
                                <button 
                                    onClick={handleRealizarAtendimento}
                                    disabled={!isProfissional}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Stethoscope size={18}/> Iniciar Atendimento
                                </button>
                            </div>
                        </div>
                        
                        {/* CARD PERFORMANCE */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                            <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <TrendingUp size={18} className="text-green-600"/> Performance Diária
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs mb-2 font-medium">
                                        <span className="text-slate-500">Fluxo de Agenda</span>
                                        <span className="text-slate-800 dark:text-white">Normal</span>
                                    </div>
                                    {/* Barra de progresso visual baseada na ocupação */}
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                        <div className="bg-green-500 h-full rounded-full" style={{ width: '65%' }}></div>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3 mt-2">
                                    Dados atualizados em tempo real. Faltas e cancelamentos não contabilizam nos KPIs mensais.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </Layout>
    );
}
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
    Users, DollarSign, Activity, Clock, TrendingUp, 
    CalendarCheck, AlertCircle, ChevronRight, Stethoscope,
    Calendar, Filter, ArrowUpRight, Plus, Search
} from 'lucide-react';

export default function Dashboard() {
    const { user, api } = useAuth();
    const { notify } = useNotification();
    const navigate = useNavigate();

    // --- ESTADOS DOS FILTROS ---
    const hoje = new Date().toISOString().split('T')[0];
    const mesAtual = new Date().toISOString().slice(0, 7);

    const [filtroDia, setFiltroDia] = useState(hoje);
    const [filtroMes, setFiltroMes] = useState(mesAtual);

    // --- ESTADOS DOS DADOS ---
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
            // 1. DADOS DO DIA
            const resDia = await api.get(`agendamento/?data=${filtroDia}&nopage=true`);
            const dadosDia = resDia.data.results || resDia.data;
            
            const totalAgendadosDia = dadosDia.length;
            const aguardando = dadosDia.filter(a => a.status === 'aguardando').length;

            setStatsDia({ total: totalAgendadosDia, aguardando });
            setListaHoje(dadosDia);

            // 2. DADOS DO MÊS
            const [ano, mes] = filtroMes.split('-');
            const resMes = await api.get(`agendamento/?mes=${mes}&ano=${ano}&nopage=true`);
            const dadosMes = resMes.data.results || resMes.data;

            const totalPacientesMes = dadosMes.length;

            const receitaConfirmada = dadosMes
                .filter(a => a.fatura_pago === true && a.status !== 'cancelado')
                .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);

            const receitaEstimada = dadosMes
                .filter(a => a.status !== 'cancelado' && a.status !== 'faltou')
                .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);

            setStatsMes({ 
                totalPacientes: totalPacientesMes, 
                receitaConfirmada: receitaConfirmada,
                receitaEstimada: receitaEstimada
            });

        } catch (error) {
            console.error("Erro dashboard", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRealizarAtendimento = () => {
        if (!user.profissional_id) {
            notify.error("Apenas profissionais de saúde podem realizar atendimento.");
            return;
        }
        navigate('/triagem'); // Ajuste conforme sua rota de atendimento
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'agendado': return 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
            case 'aguardando': return 'bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
            case 'em_atendimento': return 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
            case 'finalizado': return 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
            case 'faltou': return 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
            case 'cancelado': return 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    // --- NOVO COMPONENTE DE CARD (CLEAN STYLE) ---
    const StatCard = ({ title, value, subValue, icon: Icon, colorClass, loading }) => (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
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
                <div className="flex items-center gap-2 text-sm">
                    <span className="flex items-center text-slate-400 font-medium">
                       {subValue}
                    </span>
                </div>
            )}
        </div>
    );

    return (
        <Layout>
            <div className="max-w-7xl mx-auto pb-10">
                
                {/* CABEÇALHO COM TOOLBAR UNIFICADA */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                           <Activity size={24} className="text-blue-600"/> Dashboard
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                            Visão geral de <span className="font-semibold text-slate-900 dark:text-slate-200">{user?.first_name || user?.username}</span>
                        </p>
                    </div>

                    {/* BARRA DE FILTROS ESTILO "TOOLBAR" */}
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

                {/* KPI CARDS (NOVO DESIGN CLEAN) */}
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
                        title="Total Agendamentos (Mês)"
                        value={statsMes.totalPacientes}
                        subValue={`Referente a ${filtroMes.split('-')[1]}/${filtroMes.split('-')[0]}`}
                        icon={Users}
                        colorClass="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                        loading={loading}
                    />

                    <StatCard 
                        title="Receita Confirmada"
                        value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsMes.receitaConfirmada)}
                        subValue={`Estimado Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsMes.receitaEstimada)}`}
                        icon={DollarSign}
                        colorClass="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                        loading={loading}
                    />
                </div>

                {/* ÁREA PRINCIPAL */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* COLUNA ESQUERDA: AGENDA DE HOJE */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-[400px]">
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
                                // EMPTY STATE MELHORADO
                                <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-full mb-4">
                                        <Calendar size={48} className="text-slate-300 dark:text-slate-600"/>
                                    </div>
                                    <h4 className="text-slate-900 dark:text-white font-bold text-lg">Agenda Livre</h4>
                                    <p className="text-slate-500 max-w-xs mx-auto mt-2 mb-6">
                                        Nenhum paciente agendado para hoje ({filtroDia.split('-')[2]}/{filtroDia.split('-')[1]}).
                                    </p>
                                    <button 
                                        onClick={() => navigate('/agenda/marcar')} 
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
                                    >
                                        <Plus size={18}/> Novo Agendamento
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

                    {/* COLUNA DIREITA */}
                    <div className="flex flex-col gap-6">
                        
                        {/* CARD 'AGUARDANDO' (CONTRASTE CORRIGIDO) */}
                        <div className="bg-slate-900 dark:bg-black rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-center items-center text-center">
                            {/* Bolinhas decorativas ao fundo */}
                            <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-x-10 -translate-y-10"></div>
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl translate-x-10 translate-y-10"></div>

                            <div className="relative z-10">
                                <div className="bg-white/10 p-3 rounded-full mb-4 inline-flex items-center justify-center">
                                    <AlertCircle size={28} className="text-yellow-400"/>
                                </div>
                                <h3 className="text-4xl font-extrabold text-white">{statsDia.aguardando}</h3>
                                <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-widest">Pacientes Aguardando</p>
                                
                                <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto my-6"></div>

                                {user?.profissional_id ? (
                                    <button 
                                        onClick={handleRealizarAtendimento}
                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <Stethoscope size={18}/> Iniciar Atendimento
                                    </button>
                                ) : (
                                    <p className="text-xs text-slate-500 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
                                        Acesso ao atendimento restrito a médicos.
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        {/* CARD PERFORMANCE (REFINADO) */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                            <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <TrendingUp size={18} className="text-green-600"/> Performance Diária
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs mb-2 font-medium">
                                        <span className="text-slate-500">Ocupação da Agenda</span>
                                        <span className="text-slate-800 dark:text-white">Moderada</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                        <div className="bg-green-500 h-full rounded-full w-[65%]"></div>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3 mt-2">
                                    Dados atualizados em tempo real conforme movimentação da recepção.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </Layout>
    );
}
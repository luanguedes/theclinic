import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
    Users, DollarSign, Activity, Clock, TrendingUp, 
    CalendarCheck, AlertCircle, ChevronRight, Stethoscope 
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
            
            // "Pacientes Agendados no Total" = Todos (independente do status, exceto cancelados se quiser remover da contagem visual, mas geralmente conta para fluxo)
            // Aqui mantemos todos para saber o volume, mas filtramos o "Aguardando"
            const totalAgendadosDia = dadosDia.length;
            const aguardando = dadosDia.filter(a => a.status === 'aguardando').length;

            setStatsDia({ total: totalAgendadosDia, aguardando });
            setListaHoje(dadosDia);

            // 2. DADOS DO MÊS
            const [ano, mes] = filtroMes.split('-');
            const resMes = await api.get(`agendamento/?mes=${mes}&ano=${ano}&nopage=true`);
            const dadosMes = resMes.data.results || resMes.data;

            // Total de agendamentos no mês
            const totalPacientesMes = dadosMes.length;

            // RECEITA CONFIRMADA: Apenas quem já pagou (fatura_pago = true) e NÃO está cancelado
            // (Embora se pagou, teoricamente conta, mas se cancelou deveria estornar. Vamos garantir que cancelado não entra).
            const receitaConfirmada = dadosMes
                .filter(a => a.fatura_pago === true && a.status !== 'cancelado')
                .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);

            // RECEITA ESTIMADA: 
            // Soma tudo, EXCETO 'cancelado' e 'faltou'.
            // Agendado, Aguardando, Em Atendimento, Finalizado -> CONTAM.
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
        notify.info("Módulo de Prontuário será implementado em breve.");
    };

    // --- COMPONENTES VISUAIS ---
    
    const FilterInput = ({ type, value, onChange, label }) => (
        <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">{label}</span>
            <input 
                type={type} 
                value={value} 
                onChange={e => onChange(e.target.value)} 
                className="bg-transparent border-b border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm py-1 outline-none focus:border-blue-500 transition-colors font-semibold"
            />
        </div>
    );

    const GradientCard = ({ title, value, subValue, icon: Icon, gradient, loading }) => (
        <div className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-xl ${gradient} transition-all hover:scale-[1.02]`}>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                        <Icon size={24} className="text-white" />
                    </div>
                    {loading && <div className="h-6 w-16 bg-white/20 animate-pulse rounded-full"></div>}
                </div>
                <div>
                    <p className="text-blue-100 font-medium text-sm mb-1">{title}</p>
                    <h3 className="text-4xl font-bold tracking-tight">{loading ? '...' : value}</h3>
                    {subValue && (
                        <p className="text-white/80 text-xs mt-2 font-medium bg-black/10 inline-block px-2 py-1 rounded-lg">
                            {subValue}
                        </p>
                    )}
                </div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>
    );

    const getStatusStyle = (status) => {
        switch(status) {
            case 'agendado': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
            case 'aguardando': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 animate-pulse';
            case 'em_atendimento': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
            case 'finalizado': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
            case 'faltou': return 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
            case 'cancelado': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto pb-10">
                
                {/* CABEÇALHO */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                            Dashboard
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                            <Activity size={16} className="text-green-500"/> 
                            Visão geral de <span className="font-bold text-slate-700 dark:text-slate-200">{user?.first_name || user?.username}</span>
                        </p>
                    </div>

                    <div className="flex gap-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <FilterInput label="Dia Referência" type="date" value={filtroDia} onChange={setFiltroDia} />
                        <FilterInput label="Mês Financeiro" type="month" value={filtroMes} onChange={setFiltroMes} />
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <GradientCard 
                        title="Agendamentos (Dia)"
                        value={statsDia.total}
                        subValue={`${statsDia.aguardando} Aguardando`}
                        icon={CalendarCheck}
                        gradient="bg-gradient-to-br from-blue-600 to-indigo-600"
                        loading={loading}
                    />

                    <GradientCard 
                        title="Total Agendamentos (Mês)"
                        value={statsMes.totalPacientes}
                        subValue={`Referente a ${filtroMes.split('-')[1]}/${filtroMes.split('-')[0]}`}
                        icon={Users}
                        gradient="bg-gradient-to-br from-violet-600 to-purple-600"
                        loading={loading}
                    />

                    <GradientCard 
                        title="Receita Confirmada (Paga)"
                        value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsMes.receitaConfirmada)}
                        subValue={`Est. Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsMes.receitaEstimada)}`}
                        icon={DollarSign}
                        gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                        loading={loading}
                    />
                </div>

                {/* ÁREA PRINCIPAL: LISTA DE HOJE */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* COLUNA ESQUERDA: AGENDA DE HOJE */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                                    <Clock className="text-blue-500" size={20}/> Agenda do Dia
                                </h3>
                                <p className="text-xs text-slate-500">Visualização rápida dos pacientes de hoje ({filtroDia.split('-')[2]}/{filtroDia.split('-')[1]})</p>
                            </div>
                            <Link to="/recepcao" className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors">
                                Ir para Recepção <ChevronRight size={16}/>
                            </Link>
                        </div>
                        
                        <div className="flex-1 overflow-auto max-h-[400px] p-2">
                            {loading ? (
                                <div className="text-center py-10 text-slate-400">Carregando...</div>
                            ) : listaHoje.length === 0 ? (
                                <div className="text-center py-12 flex flex-col items-center">
                                    <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-full mb-3 text-slate-400"><CalendarCheck size={32}/></div>
                                    <p className="text-slate-500 font-medium">Nenhum agendamento para este dia.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="text-xs text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-800 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-3 font-bold">Horário</th>
                                            <th className="px-6 py-3 font-bold">Paciente</th>
                                            <th className="px-6 py-3 font-bold">Status</th>
                                            <th className="px-6 py-3 font-bold text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                                        {listaHoje.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{item.horario.slice(0,5)}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 dark:text-white">{item.nome_paciente}</div>
                                                    <div className="text-xs text-slate-500">{item.nome_profissional}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusStyle(item.status)}`}>
                                                        {item.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-600 dark:text-slate-400">
                                                    {item.valor > 0 ? `R$ ${Number(item.valor).toFixed(2)}` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* COLUNA DIREITA: STATUS RÁPIDO & ATENDIMENTO */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-lg flex flex-col justify-center items-center text-center h-full min-h-[200px]">
                            <div className="bg-white/10 p-4 rounded-full mb-4 animate-pulse">
                                <AlertCircle size={32} className="text-yellow-400"/>
                            </div>
                            <h3 className="text-2xl font-bold">{statsDia.aguardando}</h3>
                            <p className="text-slate-300 text-sm font-medium uppercase tracking-widest mt-1">Pacientes Aguardando</p>
                            
                            {/* BOTÃO REALIZAR ATENDIMENTO (CONDICIONAL) */}
                            {user?.profissional_id && (
                                <button 
                                    onClick={handleRealizarAtendimento}
                                    className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Stethoscope size={20}/> Realizar Atendimento
                                </button>
                            )}
                            
                            {!user?.profissional_id && (
                                <p className="text-xs text-slate-500 mt-4 bg-black/20 px-3 py-1 rounded-lg">
                                    Acesso ao atendimento restrito a profissionais médicos vinculados.
                                </p>
                            )}
                        </div>
                        
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                            <h4 className="font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
                                <TrendingUp size={18} className="text-green-500"/> Performance
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs mb-1 text-slate-500 dark:text-slate-400">
                                        <span>Fluxo Diário</span>
                                        <span>Normal</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                        <div className="bg-green-500 h-2 rounded-full" style={{width: '75%'}}></div>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Dados atualizados em tempo real conforme a movimentação da recepção.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </Layout>
    );
}
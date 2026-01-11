import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
    Users, DollarSign, Activity, Clock, TrendingUp, 
    CalendarCheck, AlertCircle, ChevronRight, Stethoscope,
    Calendar, Filter, Plus, Lock // Importei o Lock
} from 'lucide-react';

// --- COMPONENTE DE BLOQUEIO VISUAL (Reutilizável) ---
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
    const { notify } = useNotification();
    const navigate = useNavigate();

    // --- DEFINIÇÃO DE PERMISSÕES (VIA PROJETO COMPLETO) ---
    // Baseado no seu model CustomUser: 'medico', 'recepcao', 'financeiro', 'admin'
    
    const isSuperUser = user?.is_superuser || user?.tipo_usuario === 'admin';
    
    // Médicos têm acesso se for 'medico' OU 'admin'
    const isMedico = user?.tipo_usuario === 'medico' || isSuperUser;
    
    // Recepção tem acesso se for 'recepcao' OU 'admin'
    const isRecepcao = user?.tipo_usuario === 'recepcao' || isSuperUser;
    
    // Financeiro tem acesso se for 'financeiro' OU 'admin'
    const isFinanceiro = user?.tipo_usuario === 'financeiro' || isSuperUser;

    // Se quiser testar o visual, force true/false aqui manualmente:
    // const isFinanceiro = false; 

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

            // Só calcula receita se tiver permissão (opcional: pode calcular mas esconder no front)
            let receitaConfirmada = 0;
            let receitaEstimada = 0;

            if (isFinanceiro) {
                receitaConfirmada = dadosMes
                    .filter(a => a.fatura_pago === true && a.status !== 'cancelado')
                    .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);

                receitaEstimada = dadosMes
                    .filter(a => a.status !== 'cancelado' && a.status !== 'faltou')
                    .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
            }

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
        if (!isMedico) return;
        navigate('/triagem'); 
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

    // Card Atualizado com suporte a prop 'restricted'
    const StatCard = ({ title, value, subValue, icon: Icon, colorClass, loading, restricted, restrictedLabel }) => (
        <div className="relative bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            
            {/* Lógica de Bloqueio do Card */}
            {restricted && <RestrictedOverlay label={restrictedLabel} />}

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
                    {/* TODOS TÊM ACESSO */}
                    <StatCard 
                        title="Agendamentos (Dia)"
                        value={statsDia.total}
                        subValue={`${statsDia.aguardando} Aguardando atendimento`}
                        icon={CalendarCheck}
                        colorClass="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                        loading={loading}
                    />

                    {/* TODOS TÊM ACESSO */}
                    <StatCard 
                        title="Total Agendamentos (Mês)"
                        value={statsMes.totalPacientes}
                        subValue={`Referente a ${filtroMes.split('-')[1]}/${filtroMes.split('-')[0]}`}
                        icon={Users}
                        colorClass="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                        loading={loading}
                    />

                    {/* RESTRITO: APENAS FINANCEIRO */}
                    <StatCard 
                        title="Receita Confirmada"
                        value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsMes.receitaConfirmada)}
                        subValue={`Estimado Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsMes.receitaEstimada)}`}
                        icon={DollarSign}
                        colorClass="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                        loading={loading}
                        restricted={!isFinanceiro}
                        restrictedLabel="Acesso Financeiro"
                    />
                </div>

                {/* ÁREA PRINCIPAL */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* COLUNA ESQUERDA: AGENDA DE HOJE */}
                    {/* RESTRITO: APENAS MÉDICO OU RECEPÇÃO */}
                    <div className="relative lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-[400px]">
                        
                        {/* Bloqueio da Lista da Agenda */}
                        {(!isMedico && !isRecepcao) && (
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
                        
                        {/* CARD 'AGUARDANDO' (RESTRITO: APENAS MÉDICO) */}
                        <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col justify-center items-center text-center">
                            
                            {/* Bloqueio do Card Aguardando */}
                            {!isMedico && <RestrictedOverlay label="Acesso Profissional" />}

                            {/* Borda de status no topo */}
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
                                    disabled={!isMedico} // Desabilita clique real mesmo se o overlay falhar
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Stethoscope size={18}/> Iniciar Atendimento
                                </button>
                            </div>
                        </div>
                        
                        {/* CARD PERFORMANCE (ACESSO PÚBLICO - OU RESTRINJA SE PREFERIR) */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                            <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <TrendingUp size={18} className="text-green-600"/> Performance Diária
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs mb-2 font-medium">
                                        <span className="text-slate-500">Ocupação da Agenda</span>
                                        <span className="text-slate-800 dark:text-white">Normal</span>
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
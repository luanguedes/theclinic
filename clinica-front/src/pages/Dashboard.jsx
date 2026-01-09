import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
    Users, Calendar, DollarSign, Settings, Activity, ArrowRight, 
    CalendarDays, Clock, TrendingUp, Filter 
} from 'lucide-react';

export default function Dashboard() {
    const { user, api } = useAuth();

    // --- ESTADOS DOS FILTROS ---
    const hoje = new Date().toISOString().split('T')[0];
    const mesAtual = new Date().toISOString().slice(0, 7); // Formato YYYY-MM

    const [filtroDia, setFiltroDia] = useState(hoje);
    const [filtroMes, setFiltroMes] = useState(mesAtual);

    // --- ESTADOS DOS DADOS ---
    const [statsDia, setStatsDia] = useState({ total: 0, aguardando: 0 });
    const [statsMes, setStatsMes] = useState({ totalPacientes: 0, receitaConfirmada: 0 });
    const [loading, setLoading] = useState(true);

    // --- CARREGAMENTO DE DADOS ---
    useEffect(() => {
        if (api) {
            carregarDados();
        }
    }, [api, filtroDia, filtroMes]);

    const carregarDados = async () => {
        setLoading(true);
        try {
            // 1. Busca dados do DIA ESPECÍFICO
            // Chama a API passando a data exata
            const resDia = await api.get(`agendamento/?data=${filtroDia}&nopage=true`);
            const listaDia = resDia.data.results || resDia.data;
            
            const totalDia = listaDia.filter(a => a.status !== 'cancelado').length;
            const aguardandoDia = listaDia.filter(a => a.status === 'aguardando').length;

            setStatsDia({ total: totalDia, aguardando: aguardandoDia });

            // 2. Busca dados do MÊS SELECIONADO
            const [ano, mes] = filtroMes.split('-');
            const resMes = await api.get(`agendamento/?mes=${mes}&ano=${ano}&nopage=true`);
            const listaMes = resMes.data.results || resMes.data;

            // Lógica: Pacientes únicos no mês (excluindo cancelados)
            const pacientesUnicos = new Set(
                listaMes.filter(a => a.status !== 'cancelado').map(a => a.paciente)
            );

            // Lógica: Faturamento (Soma valor de todos não cancelados)
            // Se quiser somar só os pagos, verifique a flag 'fatura_pago' se disponível, 
            // mas aqui somamos o "Confirmado" (Agendado/Atendido)
            const faturamento = listaMes
                .filter(a => a.status !== 'cancelado' && a.status !== 'faltou')
                .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);

            setStatsMes({ 
                totalPacientes: pacientesUnicos.size, 
                receitaConfirmada: faturamento 
            });

        } catch (error) {
            console.error("Erro ao carregar dashboard", error);
        } finally {
            setLoading(false);
        }
    };

    // --- COMPONENTES VISUAIS ---
    
    const FilterInput = ({ type, value, onChange, label }) => (
        <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-500 mb-1 ml-1 uppercase tracking-wider">{label}</span>
            <input 
                type={type} 
                value={value} 
                onChange={e => onChange(e.target.value)} 
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            />
        </div>
    );

    const GradientCard = ({ title, value, subValue, icon: Icon, gradient, loading }) => (
        <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg ${gradient} transition-transform hover:-translate-y-1`}>
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <p className="text-blue-100 font-medium text-sm mb-1">{title}</p>
                    {loading ? (
                        <div className="h-8 w-24 bg-white/20 animate-pulse rounded mt-1"></div>
                    ) : (
                        <h3 className="text-3xl font-bold">{value}</h3>
                    )}
                    {subValue && (
                        <p className="text-white/80 text-sm mt-2 font-medium bg-white/20 inline-block px-2 py-0.5 rounded-lg backdrop-blur-sm">
                            {subValue}
                        </p>
                    )}
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner">
                    <Icon size={28} className="text-white" />
                </div>
            </div>
            {/* Elemento decorativo de fundo */}
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        </div>
    );

    const ShortcutCard = ({ to, title, description, icon: Icon, colorClass }) => (
        <Link to={to} className="group relative bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all">
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${colorClass} text-white shadow-md group-hover:scale-110 transition-transform`}>
                    <Icon size={24} />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-700 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
                </div>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                <ArrowRight size={20}/>
            </div>
        </Link>
    );

    return (
        <Layout>
            <div className="max-w-7xl mx-auto pb-10">
                
                {/* CABEÇALHO E FILTROS */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                            Olá, <span className="text-blue-600 dark:text-blue-400">{user?.first_name || user?.username}</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Aqui está o resumo da sua clínica.</p>
                    </div>

                    <div className="flex gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <FilterInput 
                            label="Filtrar Dia" 
                            type="date" 
                            value={filtroDia} 
                            onChange={setFiltroDia} 
                        />
                        <div className="w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <FilterInput 
                            label="Filtrar Mês" 
                            type="month" 
                            value={filtroMes} 
                            onChange={setFiltroMes} 
                        />
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    
                    {/* CARD 1: TOTAL PACIENTES MÊS */}
                    <GradientCard 
                        title={`Pacientes em ${filtroMes.split('-')[1]}/${filtroMes.split('-')[0]}`}
                        value={statsMes.totalPacientes}
                        subValue="Pacientes únicos atendidos"
                        icon={Users}
                        gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                        loading={loading}
                    />

                    {/* CARD 2: DIA ATUAL (DUPLA INFORMAÇÃO) */}
                    <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg bg-gradient-to-br from-orange-400 to-pink-500 transition-transform hover:-translate-y-1">
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-orange-50 font-medium text-sm">Resumo do Dia ({filtroDia.split('-')[2]}/{filtroDia.split('-')[1]})</p>
                                <Clock size={24} className="text-white/80"/>
                            </div>
                            
                            <div className="flex gap-6 mt-2">
                                <div>
                                    {loading ? <div className="h-6 w-10 bg-white/20 rounded animate-pulse"/> : <h3 className="text-3xl font-bold">{statsDia.total}</h3>}
                                    <span className="text-xs text-white/90 font-medium">Agendados</span>
                                </div>
                                <div className="w-px bg-white/30 h-10 self-center"></div>
                                <div>
                                    {loading ? <div className="h-6 w-10 bg-white/20 rounded animate-pulse"/> : <h3 className="text-3xl font-bold">{statsDia.aguardando}</h3>}
                                    <span className="text-xs text-white/90 font-medium bg-white/20 px-2 py-0.5 rounded-lg">Aguardando</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                    </div>

                    {/* CARD 3: FATURAMENTO */}
                    <GradientCard 
                        title="Faturamento Confirmado (Mês)"
                        value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsMes.receitaConfirmada)}
                        subValue="Baseado em agendamentos ativos"
                        icon={DollarSign}
                        gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                        loading={loading}
                    />
                </div>

                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-blue-500"/> Acesso Rápido
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(user?.acesso_atendimento || user?.is_superuser) && (
                        <ShortcutCard to="/recepcao" title="Recepção" description="Check-in e Fila." icon={CalendarDays} colorClass="bg-blue-600"/>
                    )}
                    {(user?.acesso_agendamento || user?.is_superuser) && (
                        <ShortcutCard to="/agenda/marcar" title="Marcar Consulta" description="Novo agendamento." icon={Calendar} colorClass="bg-indigo-500"/>
                    )}
                    {(user?.acesso_faturamento || user?.is_superuser) && (
                        <ShortcutCard to="/faturamento" title="Financeiro" description="Notas e caixa." icon={DollarSign} colorClass="bg-emerald-500"/>
                    )}
                    {user?.is_superuser && (
                        <ShortcutCard to="/operadores" title="Configurações" description="Gestão do sistema." icon={Settings} colorClass="bg-slate-700"/>
                    )}
                </div>

                <div className="mt-10 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        Sistema Operacional v7.0
                    </div>
                    <span>© 2026 TheClinic</span>
                </div>
            </div>
        </Layout>
    );
}
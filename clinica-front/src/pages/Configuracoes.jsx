import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { 
    Settings, Shield, Layout as LayoutIcon, CalendarClock, Save, Loader2, AlertTriangle, 
    Lock, MessageCircle, Play, Clock, Bell, Activity, Check, QrCode, X
} from 'lucide-react';

export default function Configuracoes() {
    const { api, user } = useAuth();
    const { notify, confirmDialog } = useNotification();
    
    const [activeTab, setActiveTab] = useState('comunicacao'); // Começa na aba principal
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [runningBot, setRunningBot] = useState(false);
    const [whatsappStatus, setWhatsappStatus] = useState({ loading: true, connected: null, state: 'carregando', error: null });
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [qrLoading, setQrLoading] = useState(false);
    const [qrImage, setQrImage] = useState('');
    const [qrError, setQrError] = useState('');

    // Estado completo com todos os campos do seu sistema
    const [config, setConfig] = useState({
        // Segurança
        max_tentativas_login: 5,
        tempo_bloqueio_minutos: 15,
        tempo_sessao_minutos: 60,
        
        // Interface
        itens_por_pagina: 10,
        modo_manutencao: false,
        
        // Agendamento
        janela_agendamento_meses: 6,
        
        // Automação (WhatsApp)
        enviar_whatsapp_global: true,
        enviar_wpp_confirmacao: true,
        enviar_wpp_bloqueio: true,
        enviar_wpp_lembrete: true,
        horario_disparo_lembrete: '08:00',
        data_ultima_execucao_lembrete: null,
        
        // Stats do Robô
        stats_hoje: { total: 0, enviados: 0, pendentes: 0 },
        stats_amanha: { total: 0, enviados: 0, pendentes: 0 }
    });

    // --- CÁLCULOS AUXILIARES (Correção do erro jaRodouHoje) ---
    const hojeIso = new Date().toISOString().split('T')[0];
    const ultimaExecucaoIso = config.data_ultima_execucao_lembrete 
        ? String(config.data_ultima_execucao_lembrete).split('T')[0] 
        : '';
    const jaRodouHoje = ultimaExecucaoIso === hojeIso;

    // Bloqueio de Acesso para não-admins
    if (user && !user.is_superuser) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                    <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                        <Lock size={48} className="text-slate-400"/>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Acesso Restrito</h2>
                    <p className="max-w-xs text-center mt-2 text-sm">Apenas administradores de nível superior podem gerenciar as chaves do sistema.</p>
                </div>
            </Layout>
        );
    }

    useEffect(() => {
        if (api) {
            loadConfig();
            loadWhatsappStatus();
        }
    }, [api]);

    useEffect(() => {
        if (qrModalOpen) carregarQrCode();
    }, [qrModalOpen]);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const res = await api.get('configuracoes/sistema/');
            if(res.data) {
                setConfig(prev => ({ ...prev, ...res.data }));
            }
        } catch (error) {
            notify.error("Não foi possível carregar as configurações globais.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // Validações
        if (config.tempo_sessao_minutos < 5) return notify.warning("O tempo de sessão mínimo é 5 minutos.");
        if (config.itens_por_pagina < 1) return notify.warning("A paginação mínima é 1 item.");

        setSaving(true);
        try {
            await api.put('configuracoes/sistema/', config);
            notify.success("Configurações aplicadas com sucesso!");
        } catch (error) {
            notify.error("Falha ao salvar. Tente novamente.");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = async (e) => {
        const { name, value, type, checked } = e.target;
        
        // Confirmação para Modo Manutenção
        if (name === 'modo_manutencao' && checked) {
            const confirm = await confirmDialog(
                "Ao ativar o Modo Manutenção, todos os operadores serão desconectados e novos logins serão bloqueados. Deseja continuar?",
                "Ativar Modo Crítico", "Sim, Bloquear Sistema", "Cancelar", "danger"
            );
            if (!confirm) return;
        }

        setConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleExecutarAgora = async () => {
        const pendentes = config.stats_amanha?.pendentes || 0;
        const confirm = await confirmDialog(
            `Existem ${pendentes} lembretes pendentes para amanhã. O disparo manual iniciará agora. Confirmar?`,
            "Executar Robô Manual",
            "Sim, Disparar Agora", "Cancelar", "info"
        );
        if (!confirm) return;

        setRunningBot(true);
        try {
            const res = await api.post('configuracoes/sistema/executar_lembretes/');
            notify.success("Processamento concluído!");
            if(res.data) {
                // Atualiza stats na tela
                setConfig(prev => ({
                    ...prev, 
                    data_ultima_execucao_lembrete: res.data.ultima_execucao,
                    stats_hoje: res.data.stats_hoje,
                    stats_amanha: res.data.stats_amanha
                }));
            }
        } catch (e) {
            notify.error("Erro na execução do robô.");
        } finally {
            setRunningBot(false);
        }
    };

    const loadWhatsappStatus = async () => {
        setWhatsappStatus(prev => ({ ...prev, loading: true }));
        try {
            const res = await api.get('configuracoes/sistema/whatsapp_status/');
            const data = res.data || {};
            setWhatsappStatus({
                loading: false,
                connected: data.connected,
                state: data.state || 'desconhecido',
                error: data.error || null
            });
        } catch (error) {
            setWhatsappStatus({
                loading: false,
                connected: null,
                state: 'erro',
                error: 'Falha ao consultar status do WhatsApp.'
            });
        }
    };

    const carregarQrCode = async () => {
        setQrLoading(true);
        setQrError('');
        setQrImage('');
        try {
            const res = await api.get('configuracoes/sistema/whatsapp_qrcode/');
            const dataUri = res.data?.data_uri;
            if (!dataUri) throw new Error('QR Code indisponivel.');
            setQrImage(dataUri);
        } catch (error) {
            const message = error?.response?.data?.error || 'Erro ao carregar QR Code.';
            setQrError(message);
            notify.error(message);
        } finally {
            setQrLoading(false);
        }
    };

    // Estilos reutilizáveis
    const tabClass = (tab) => `
        flex items-center gap-2 px-6 py-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all whitespace-nowrap outline-none
        ${activeTab === tab 
            ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' 
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}
    `;

    const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold dark:text-white transition-all";
    const labelClass = "block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest";

    return (
        <Layout>
            <div className="max-w-5xl mx-auto pb-20 tracking-tight">
                
                {/* CABEÇALHO */}
                <div className="mb-10 flex items-center gap-4">
                    <div className="bg-slate-900 dark:bg-blue-600 p-3 rounded-2xl shadow-xl shadow-slate-900/20 text-white">
                        <Settings size={32}/>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Configurações Gerais</h1>
                        <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Sistema &gt; Parâmetros Globais</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[600px] flex flex-col">
                    
                    {/* TAB BAR */}
                    <div className="flex border-b border-slate-100 dark:border-slate-700 overflow-x-auto scrollbar-hide bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                        <button type="button" onClick={()=>setActiveTab('comunicacao')} className={tabClass('comunicacao')}><MessageCircle size={16}/> Automação</button>
                        <button type="button" onClick={()=>setActiveTab('seguranca')} className={tabClass('seguranca')}><Shield size={16}/> Segurança</button>
                        <button type="button" onClick={()=>setActiveTab('interface')} className={tabClass('interface')}><LayoutIcon size={16}/> Interface</button>
                        <button type="button" onClick={()=>setActiveTab('agendamento')} className={tabClass('agendamento')}><CalendarClock size={16}/> Agendas</button>
                    </div>

                    <div className="p-8 md:p-12 flex-1">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                                <Loader2 className="animate-spin text-blue-600" size={48}/>
                                <span className="text-xs font-black uppercase tracking-widest">Carregando parâmetros...</span>
                            </div>
                        ) : (
                            <form onSubmit={handleSave} className="space-y-12 h-full flex flex-col">
                                <div className="flex-1">
                                    
                                    {/* === ABA SEGURANÇA === */}
                                    {activeTab === 'seguranca' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div>
                                                <label className={labelClass}>Max. Tentativas de Login</label>
                                                <input type="number" name="max_tentativas_login" value={config.max_tentativas_login} onChange={handleChange} className={inputClass}/>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Tempo de Bloqueio (Minutos)</label>
                                                <input type="number" name="tempo_bloqueio_minutos" value={config.tempo_bloqueio_minutos} onChange={handleChange} className={inputClass}/>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className={labelClass}>Expiração Automática de Sessão (Minutos)</label>
                                                <input type="number" name="tempo_sessao_minutos" value={config.tempo_sessao_minutos} onChange={handleChange} className={inputClass}/>
                                            </div>
                                            
                                            <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex gap-3 items-start">
                                                <Shield size={20} className="text-blue-600 mt-0.5 shrink-0"/>
                                                <p className="text-xs text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                                                    Alterações nestes parâmetros afetam imediatamente a política de segurança de todos os usuários. Recomenda-se cautela ao reduzir os tempos de sessão.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* === ABA INTERFACE === */}
                                    {activeTab === 'interface' && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div>
                                                <label className={labelClass}>Registros por Página nas Listagens</label>
                                                <input type="number" name="itens_por_pagina" value={config.itens_por_pagina} onChange={handleChange} className={inputClass + " max-w-[150px] font-mono text-lg text-blue-600"}/>
                                            </div>
                                            
                                            <div className="bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 p-8 rounded-[32px]">
                                                <div className="flex items-center gap-3 mb-4 text-rose-700 dark:text-rose-400 font-black uppercase text-xs tracking-widest">
                                                    <AlertTriangle size={20}/> Modo de Manutenção do Sistema
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-rose-600/70 font-medium max-w-md leading-relaxed">
                                                        Ative apenas para atualizações críticas. Todos os operadores (exceto Admin) serão desconectados imediatamente e novos logins serão bloqueados.
                                                    </p>
                                                    <label className="relative inline-flex items-center cursor-pointer scale-125 mr-4">
                                                        <input type="checkbox" name="modo_manutencao" className="sr-only peer" checked={config.modo_manutencao} onChange={handleChange}/>
                                                        <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600 shadow-inner"></div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* === ABA AGENDAMENTO === */}
                                    {activeTab === 'agendamento' && (
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <label className={labelClass}>Janela Máxima de Agendamento Futuro</label>
                                            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
                                                <input type="number" name="janela_agendamento_meses" value={config.janela_agendamento_meses} onChange={handleChange} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl p-3 w-24 text-center font-black text-2xl text-blue-600 outline-none focus:ring-2 focus:ring-blue-500"/>
                                                <span className="text-slate-500 font-bold text-sm uppercase tracking-wide">Meses à frente</span>
                                            </div>
                                            <p className="mt-4 text-xs text-slate-400 font-medium max-w-md">
                                                Define até quando a agenda estará aberta para marcação. Datas além deste limite aparecerão bloqueadas para os operadores.
                                            </p>
                                        </div>
                                    )}

                                    {/* === ABA AUTOMAÇÃO (MANTIDA COMPLETA) === */}
                                    {activeTab === 'comunicacao' && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[28px] border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-6">
                                                <div>
                                                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                                        <Activity size={16}/> Status da Conexão WhatsApp
                                                    </h3>
                                                    <div className="mt-3 flex items-center gap-3">
                                                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${whatsappStatus.connected === true ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : whatsappStatus.connected === false ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                            {whatsappStatus.loading ? 'Verificando' : whatsappStatus.connected === true ? 'Conectado' : whatsappStatus.connected === false ? 'Desconectado' : 'Indefinido'}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            Estado: {whatsappStatus.state || 'desconhecido'}
                                                        </span>
                                                    </div>
                                                    {whatsappStatus.error && (
                                                        <p className="mt-2 text-[10px] font-bold text-rose-500 uppercase tracking-widest">
                                                            {whatsappStatus.error}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setQrModalOpen(true)}
                                                        className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2"
                                                    >
                                                        <QrCode size={14}/> Conectar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={loadWhatsappStatus}
                                                        disabled={whatsappStatus.loading}
                                                        className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-slate-900 text-white hover:bg-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        {whatsappStatus.loading ? <Loader2 className="animate-spin" size={14}/> : 'Atualizar'}
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Master Switch */}
                                            <div className={`p-8 rounded-[32px] border-2 transition-all ${config.enviar_whatsapp_global ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700'}`}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className={`font-black text-lg uppercase tracking-tight ${config.enviar_whatsapp_global ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-500'}`}>
                                                            {config.enviar_whatsapp_global ? 'Serviço de WhatsApp Ativo' : 'Serviço de WhatsApp Pausado'}
                                                        </h3>
                                                        <p className="text-xs font-medium opacity-60 mt-1">Status da API de mensageria em tempo real.</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer scale-150 mr-4">
                                                        <input type="checkbox" name="enviar_whatsapp_global" className="sr-only peer" checked={!!config.enviar_whatsapp_global} onChange={handleChange}/>
                                                        <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${config.enviar_whatsapp_global ? 'bg-slate-300 peer-checked:bg-emerald-600' : 'bg-slate-300'}`}></div>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Gatilhos e Monitor */}
                                            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 transition-all duration-500 ${!config.enviar_whatsapp_global ? 'opacity-40 grayscale pointer-events-none blur-[1px]' : ''}`}>
                                                
                                                {/* Coluna Esquerda: Gatilhos */}
                                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-6 text-slate-400 flex items-center gap-2">
                                                        <Bell size={16}/> Gatilhos de Disparo
                                                    </h3>
                                                    <div className="space-y-6">
                                                        {[
                                                            { id: 'enviar_wpp_confirmacao', label: 'Confirmação', sub: 'No ato da marcação.' },
                                                            { id: 'enviar_wpp_bloqueio', label: 'Agenda', sub: 'Bloqueios/Feriados.' },
                                                            { id: 'enviar_wpp_lembrete', label: 'Lembretes', sub: '24h antes da data.' }
                                                        ].map((item) => (
                                                            <div key={item.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors">
                                                                <div>
                                                                    <span className="block text-sm font-black text-slate-700 dark:text-white uppercase tracking-tight">{item.label}</span>
                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{item.sub}</span>
                                                                </div>
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input type="checkbox" name={item.id} className="sr-only peer" checked={config[item.id]} onChange={handleChange}/>
                                                                    <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Coluna Direita: Monitor do Robô */}
                                                <div className={`p-8 rounded-[32px] border flex flex-col justify-between ${config.enviar_wpp_lembrete ? 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' : 'bg-slate-50 border-slate-200'}`}>
                                                    <div>
                                                        <div className="flex justify-between items-start mb-6">
                                                            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-blue-600 flex items-center gap-2">
                                                                <Activity size={16}/> Monitor do Robô
                                                            </h3>
                                                            <div className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-[9px] font-black text-blue-600 uppercase tracking-widest shadow-sm border border-blue-100 dark:border-blue-900">
                                                                {jaRodouHoje ? 'Finalizado Hoje' : 'Aguardando'}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Enviados Hoje</p>
                                                                <span className="text-3xl font-black text-blue-600">{config.stats_hoje?.enviados || 0}</span>
                                                            </div>
                                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Fila Amanhã</p>
                                                                <span className="text-3xl font-black text-slate-700 dark:text-white">{config.stats_amanha?.pendentes || 0}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">Horário de Disparo:</span>
                                                            <input type="time" name="horario_disparo_lembrete" value={config.horario_disparo_lembrete} onChange={handleChange} className="bg-slate-100 dark:bg-slate-900 border-none rounded-lg px-2 py-1 font-black text-sm text-blue-600 outline-none focus:ring-2 focus:ring-blue-500"/>
                                                        </div>
                                                    </div>

                                                    <button 
                                                        type="button"
                                                        onClick={handleExecutarAgora}
                                                        disabled={runningBot || !config.enviar_wpp_lembrete || !config.enviar_whatsapp_global || config.stats_amanha?.pendentes === 0}
                                                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                                    >
                                                        {runningBot ? <Loader2 className="animate-spin" size={16}/> : <Play size={14} fill="currentColor"/>}
                                                        Disparar Fila Agora
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-8 border-t border-slate-100 dark:border-slate-700 flex justify-end shrink-0">
                                    <button type="submit" disabled={saving} className="bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3">
                                        {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} 
                                        Salvar Alterações
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL QR CODE WHATSAPP */}
            {qrModalOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/10">
                        <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
                            <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                                <QrCode size={18} className="text-green-400"/> Conectar WhatsApp
                            </h3>
                            <button onClick={() => setQrModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escaneie o QR Code no WhatsApp</p>
                                <button
                                    onClick={carregarQrCode}
                                    disabled={qrLoading}
                                    className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    {qrLoading ? 'Carregando...' : 'Atualizar'}
                                </button>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 flex items-center justify-center min-h-[280px]">
                                {qrLoading ? (
                                    <Loader2 className="animate-spin text-blue-600" size={40}/>
                                ) : qrImage ? (
                                    <img src={qrImage} alt="QR Code WhatsApp" className="w-64 h-64 object-contain"/>
                                ) : (
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{qrError || 'QR Code indisponivel.'}</p>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                Abra o WhatsApp no celular, acesse &quot;Dispositivos conectados&quot; e escaneie o QR Code.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { 
    Settings, Shield, Layout as LayoutIcon, CalendarClock, Save, Loader2, AlertTriangle, Lock, MessageCircle, Play, CheckCircle2, Clock, Check
} from 'lucide-react';

export default function Configuracoes() {
    const { api, user } = useAuth();
    const { notify, confirmDialog } = useNotification();
    
    const [activeTab, setActiveTab] = useState('comunicacao');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [runningBot, setRunningBot] = useState(false);

    const [config, setConfig] = useState({
        max_tentativas_login: 5,
        tempo_bloqueio_minutos: 15,
        tempo_sessao_minutos: 60,
        itens_por_pagina: 10,
        modo_manutencao: false,
        janela_agendamento_meses: 6,
        enviar_whatsapp_global: true,
        enviar_wpp_confirmacao: true,
        enviar_wpp_bloqueio: true,
        enviar_wpp_lembrete: true,
        horario_disparo_lembrete: '08:00',
        data_ultima_execucao_lembrete: null,
        stats_hoje: { total: 0, enviados: 0, pendentes: 0 },
        stats_amanha: { total: 0, enviados: 0, pendentes: 0 }
    });

    if (user && !user.is_superuser) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                    <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                        <Lock size={48} className="text-slate-400"/>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Acesso Restrito</h2>
                    <p className="max-w-xs text-center mt-2">Apenas administradores de nível superior podem gerenciar as chaves do sistema.</p>
                </div>
            </Layout>
        );
    }

    useEffect(() => {
        if (api) loadConfig();
    }, [api]);

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

        // Validações Básicas
        if (config.tempo_sessao_minutos < 5) return notify.warning("O tempo de sessão mínimo é 5 minutos.");
        if (config.itens_por_pagina < 1) return notify.warning("A paginação mínima é 1 item.");

        setSaving(true);
        try {
            await api.put('configuracoes/sistema/', config);
            notify.success("Alterações aplicadas com sucesso!");
        } catch (error) {
            notify.error("Falha ao salvar. Tente novamente em instantes.");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = async (e) => {
        const { name, value, type, checked } = e.target;
        
        // Proteção extra para Modo Manutenção
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

    const tabClass = (tab) => `
        flex items-center gap-2 px-6 py-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all whitespace-nowrap
        ${activeTab === tab 
            ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' 
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}
    `;

    const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold dark:text-white transition-all";
    const labelClass = "block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest";

    return (
        <Layout>
            <div className="max-w-4xl mx-auto pb-20 tracking-tight">
                <div className="mb-10 flex items-center gap-4">
                    <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-500/20 text-white">
                        <Settings size={32}/>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Configurações</h1>
                        <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Painel de controle de políticas globais da clínica.</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex border-b border-slate-100 dark:border-slate-700 overflow-x-auto scrollbar-hide bg-slate-50/50 dark:bg-slate-800/50">
                        <button type="button" onClick={()=>setActiveTab('seguranca')} className={tabClass('seguranca')}><Shield size={16}/> Segurança</button>
                        <button type="button" onClick={()=>setActiveTab('interface')} className={tabClass('interface')}><LayoutIcon size={16}/> Interface</button>
                        <button type="button" onClick={()=>setActiveTab('agendamento')} className={tabClass('agendamento')}><CalendarClock size={16}/> Agendas</button>
                        <button type="button" onClick={()=>setActiveTab('comunicacao')} className={tabClass('comunicacao')}><MessageCircle size={16}/> Automação</button>
                    </div>

                    <div className="p-10">
                        {loading ? (
                            <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40}/></div>
                        ) : (
                            <form onSubmit={handleSave} className="space-y-10">
                                
                                {activeTab === 'seguranca' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div><label className={labelClass}>Max. Tentativas de Login</label><input type="number" name="max_tentativas_login" value={config.max_tentativas_login} onChange={handleChange} className={inputClass}/></div>
                                        <div><label className={labelClass}>Tempo de Bloqueio (Minutos)</label><input type="number" name="tempo_bloqueio_minutos" value={config.tempo_bloqueio_minutos} onChange={handleChange} className={inputClass}/></div>
                                        <div className="md:col-span-2"><label className={labelClass}>Expiração Automática de Sessão (Minutos)</label><input type="number" name="tempo_sessao_minutos" value={config.tempo_sessao_minutos} onChange={handleChange} className={inputClass}/></div>
                                    </div>
                                )}

                                {activeTab === 'interface' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div><label className={labelClass}>Registros por Página nas Listagens</label><input type="number" name="itens_por_pagina" value={config.itens_por_pagina} onChange={handleChange} className={inputClass + " max-w-[150px] font-mono text-lg text-blue-600"}/></div>
                                        <div className="bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 p-6 rounded-3xl">
                                            <div className="flex items-center gap-3 mb-4 text-rose-700 dark:text-rose-400 font-black uppercase text-xs tracking-widest"><AlertTriangle size={20}/> Modo de Manutenção do Sistema</div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs text-rose-600/70 font-medium max-w-sm">Ative apenas para atualizações críticas. Todos os acessos serão suspensos imediatamente.</p>
                                                <label className="relative inline-flex items-center cursor-pointer scale-125 mr-4">
                                                    <input type="checkbox" name="modo_manutencao" className="sr-only peer" checked={config.modo_manutencao} onChange={handleChange}/>
                                                    <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600 shadow-inner"></div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'agendamento' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <label className={labelClass}>Janela Máxima de Agendamento Futuro (Meses)</label>
                                        <div className="flex items-center gap-4">
                                            <input type="number" name="janela_agendamento_meses" value={config.janela_agendamento_meses} onChange={handleChange} className={inputClass + " max-w-[150px] font-mono text-lg text-blue-600"}/>
                                            <span className="text-slate-400 font-medium text-sm">meses à frente da data atual.</span>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'comunicacao' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                                        {/* Master Switch */}
                                        <div className={`p-8 rounded-3xl border-2 transition-all ${config.enviar_whatsapp_global ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700'}`}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className={`font-black text-lg uppercase tracking-tight ${config.enviar_whatsapp_global ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-500'}`}>
                                                        {config.enviar_whatsapp_global ? 'Serviço de WhatsApp Ativo' : 'Serviço de WhatsApp Pausado'}
                                                    </h3>
                                                    <p className="text-xs font-medium opacity-60">Status da API de mensageria em tempo real.</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer scale-150 mr-4">
                                                    <input type="checkbox" name="enviar_whatsapp_global" className="sr-only peer" checked={!!config.enviar_whatsapp_global} onChange={handleChange}/>
                                                    <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${config.enviar_whatsapp_global ? 'bg-slate-300 peer-checked:bg-emerald-600' : 'bg-slate-300'}`}></div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Sub Gatilhos */}
                                        <div className={`bg-slate-50/50 dark:bg-slate-900/30 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 ${!config.enviar_whatsapp_global ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                                            <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-8 text-slate-400 flex items-center gap-2"><MessageCircle size={16}/> Gatilhos de Disparo</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                {[
                                                    { id: 'enviar_wpp_confirmacao', label: 'Confirmação', sub: 'No ato da marcação.' },
                                                    { id: 'enviar_wpp_bloqueio', label: 'Agenda', sub: 'Bloqueios/Feriados.' },
                                                    { id: 'enviar_wpp_lembrete', label: 'Lembretes', sub: '24h antes da data.' }
                                                ].map((item) => (
                                                    <div key={item.id} className="flex flex-col gap-3">
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input type="checkbox" name={item.id} className="sr-only peer" checked={config[item.id]} onChange={handleChange}/>
                                                            <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                                                            <span className="ml-3 text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter">{item.label}</span>
                                                        </label>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase ml-1">{item.sub}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Monitor do Robô */}
                                        <div className={`p-8 rounded-[32px] border transition-all ${config.enviar_whatsapp_global && config.enviar_wpp_lembrete ? 'bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-700 shadow-xl shadow-blue-500/5' : 'bg-slate-100 opacity-50'}`}>
                                            <div className="flex items-center justify-between mb-8">
                                                <div>
                                                    <h3 className="font-black text-lg text-blue-600 uppercase tracking-tighter flex items-center gap-2"><CalendarClock size={24}/> Monitor do Robô</h3>
                                                    <div className="flex items-center gap-2 mt-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full text-[9px] font-black text-blue-600 uppercase tracking-widest w-fit">
                                                        <Clock size={12}/> Último Ciclo: {jaRodouHoje ? 'Finalizado Hoje' : config.data_ultima_execucao_lembrete || 'Nunca Executado'}
                                                    </div>
                                                </div>
                                                <input type="time" name="horario_disparo_lembrete" value={config.horario_disparo_lembrete} onChange={handleChange} className="bg-slate-100 dark:bg-slate-900 border-none rounded-xl p-3 font-black text-xl text-blue-600 outline-none ring-2 ring-slate-100 dark:ring-slate-700 focus:ring-blue-500"/>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-4 tracking-widest">Consultas de HOJE</p>
                                                    <div className="flex items-end gap-1">
                                                        <span className="text-4xl font-black text-blue-600 leading-none">{config.stats_hoje?.enviados || 0}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase pb-1">/ {config.stats_hoje?.total || 0} Enviados</span>
                                                    </div>
                                                </div>
                                                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                                    <p className="text-[9px] font-black text-blue-400 uppercase mb-4 tracking-widest">Aguardando p/ AMANHÃ</p>
                                                    <div className="flex items-end gap-1">
                                                        <span className="text-4xl font-black text-slate-700 dark:text-white leading-none">{config.stats_amanha?.pendentes || 0}</span>
                                                        <span className="text-[10px] font-bold text-orange-500 uppercase pb-1 italic">Pendentes</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button 
                                                type="button"
                                                onClick={handleExecutarAgora}
                                                disabled={runningBot || !config.enviar_wpp_lembrete || !config.enviar_whatsapp_global || config.stats_amanha?.pendentes === 0}
                                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-3"
                                            >
                                                {runningBot ? <Loader2 className="animate-spin" size={20}/> : <Play size={18} fill="currentColor"/>}
                                                Disparar Fila de Lembretes Agora
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-8 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                                    <button type="submit" disabled={saving} className="bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white px-12 py-5 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3">
                                        {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} 
                                        Aplicar Todas as Configurações
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
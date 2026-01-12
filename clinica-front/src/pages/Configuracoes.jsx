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
                    <Lock size={48} className="mb-4"/>
                    <h2 className="text-xl font-bold">Acesso Restrito</h2>
                    <p>Apenas administradores podem acessar as configurações do sistema.</p>
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
            console.error(error);
            notify.error("Erro ao carregar configurações.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put('configuracoes/sistema/', config);
            notify.success("Configurações atualizadas com sucesso!");
        } catch (error) {
            notify.error("Erro ao salvar.");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleExecutarAgora = async () => {
        const confirm = await confirmDialog(
            `Existem ${config.stats_amanha?.pendentes || 0} pacientes pendentes para amanhã. Deseja disparar agora?`,
            "Executar Disparo Manual?",
            "Sim, Executar", "Cancelar"
        );
        if (!confirm) return;

        setRunningBot(true);
        try {
            const res = await api.post('configuracoes/sistema/executar_lembretes/');
            notify.success("Rotina executada com sucesso!");
            
            if(res.data) {
                setConfig(prev => ({
                    ...prev, 
                    data_ultima_execucao_lembrete: res.data.ultima_execucao,
                    stats_hoje: res.data.stats_hoje,
                    stats_amanha: res.data.stats_amanha
                }));
            }
        } catch (e) {
            notify.error("Erro ao executar rotina.");
        } finally {
            setRunningBot(false);
        }
    };

    const hojeIso = new Date().toISOString().split('T')[0];
    const jaRodouHoje = config.data_ultima_execucao_lembrete === hojeIso;

    const tabClass = (tab) => `
        flex items-center gap-2 px-6 py-4 font-bold border-b-2 transition-all whitespace-nowrap
        ${activeTab === tab 
            ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' 
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:text-slate-300 dark:hover:bg-slate-800'}
    `;

    const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white transition-all";
    const labelClass = "block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide";

    return (
        <Layout>
            <div className="max-w-4xl mx-auto pb-20">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <Settings className="text-blue-600" size={32}/> Configurações do Sistema
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Gerencie a segurança, interface e automação de comunicações da clínica.
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-hide">
                        <button type="button" onClick={()=>setActiveTab('seguranca')} className={tabClass('seguranca')}><Shield size={18}/> Segurança</button>
                        <button type="button" onClick={()=>setActiveTab('interface')} className={tabClass('interface')}><LayoutIcon size={18}/> Interface</button>
                        <button type="button" onClick={()=>setActiveTab('agendamento')} className={tabClass('agendamento')}><CalendarClock size={18}/> Regras</button>
                        <button type="button" onClick={()=>setActiveTab('comunicacao')} className={tabClass('comunicacao')}><MessageCircle size={18}/> Comunicação</button>
                    </div>

                    <div className="p-8">
                        {loading ? (
                            <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={32}/></div>
                        ) : (
                            <form onSubmit={handleSave} className="space-y-8">
                                
                                {activeTab === 'seguranca' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                                        <div><label className={labelClass}>Max. Tentativas de Login</label><input type="number" name="max_tentativas_login" value={config.max_tentativas_login} onChange={handleChange} className={inputClass}/></div>
                                        <div><label className={labelClass}>Tempo de Bloqueio (Min)</label><input type="number" name="tempo_bloqueio_minutos" value={config.tempo_bloqueio_minutos} onChange={handleChange} className={inputClass}/></div>
                                        <div className="md:col-span-2"><label className={labelClass}>Expiração de Sessão (Minutos)</label><input type="number" name="tempo_sessao_minutos" value={config.tempo_sessao_minutos} onChange={handleChange} className={inputClass}/></div>
                                    </div>
                                )}

                                {activeTab === 'interface' && (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        <div><label className={labelClass}>Itens por Página</label><input type="number" name="itens_por_pagina" value={config.itens_por_pagina} onChange={handleChange} className={inputClass + " max-w-[150px]"}/></div>
                                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-5 rounded-xl">
                                            <div className="flex items-center gap-2 mb-3 text-red-700 dark:text-red-400 font-bold"><AlertTriangle size={20}/> Modo Manutenção</div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" name="modo_manutencao" className="sr-only peer" checked={config.modo_manutencao} onChange={handleChange}/>
                                                <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                                <span className="ml-3 font-bold text-slate-700 dark:text-slate-300">{config.modo_manutencao ? 'BLOQUEADO' : 'NORMAL'}</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'agendamento' && (
                                    <div className="animate-in fade-in duration-300">
                                        <label className={labelClass}>Janela de Agendamento Futuro (Meses)</label>
                                        <input type="number" name="janela_agendamento_meses" value={config.janela_agendamento_meses} onChange={handleChange} className={inputClass + " max-w-[150px]"}/>
                                    </div>
                                )}

                                {activeTab === 'comunicacao' && (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        <div className={`p-6 rounded-xl border-2 transition-all ${config.enviar_whatsapp_global ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'}`}>
                                            <div className="flex items-center justify-between">
                                                <div><h3 className={`font-bold text-lg ${config.enviar_whatsapp_global ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>{config.enviar_whatsapp_global ? 'Mensagens Ativadas' : 'Mensagens Desativadas'}</h3><p className="text-sm opacity-80">Controle mestre de envios.</p></div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" name="enviar_whatsapp_global" className="sr-only peer" checked={!!config.enviar_whatsapp_global} onChange={handleChange}/>
                                                    <div className={`w-14 h-7 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all ${config.enviar_whatsapp_global ? 'bg-slate-200 peer-checked:bg-green-600' : 'bg-slate-200 peer-checked:bg-red-600'}`}></div>
                                                </label>
                                            </div>
                                        </div>

                                        <div className={`bg-slate-50 dark:bg-slate-900/30 p-5 rounded-xl border border-slate-200 dark:border-slate-700 ${!config.enviar_whatsapp_global ? 'opacity-40 grayscale' : ''}`}>
                                            <h3 className="font-bold mb-4 flex items-center gap-2"><MessageCircle size={18}/> Gatilhos de Mensagem</h3>
                                            <div className="space-y-4">
                                                {[
                                                    { id: 'enviar_wpp_confirmacao', label: 'Confirmação Imediata', sub: 'No ato da marcação.' },
                                                    { id: 'enviar_wpp_bloqueio', label: 'Aviso de Cancelamento', sub: 'Em caso de bloqueio de agenda.' },
                                                    { id: 'enviar_wpp_lembrete', label: 'Lembrete Automático', sub: 'Enviado 24h antes da consulta.' }
                                                ].map((item) => (
                                                    <div key={item.id} className="flex items-center justify-between pb-3 border-b last:border-0 dark:border-slate-700">
                                                        <div><p className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.label}</p><p className="text-[10px] text-slate-500">{item.sub}</p></div>
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input type="checkbox" name={item.id} className="sr-only peer" checked={config[item.id]} onChange={handleChange} disabled={!config.enviar_whatsapp_global}/>
                                                            <div className="w-10 h-5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className={`p-6 rounded-2xl border transition-all ${config.enviar_whatsapp_global && config.enviar_wpp_lembrete ? 'bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600' : 'bg-slate-100 opacity-50 grayscale'}`}>
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="font-bold flex items-center gap-2 text-blue-600"><CalendarClock size={20}/> Monitoramento do Robô</h3>
                                                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-[10px] font-bold text-slate-500 uppercase">
                                                    <Clock size={12}/> Última Execução: {jaRodouHoje ? 'Hoje' : config.data_ultima_execucao_lembrete || 'Pendente'}
                                                </div>
                                            </div>

                                            {/* PAINEL DE STATUS DUPLO */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex justify-between">
                                                        <span>Consultas de HOJE</span>
                                                        <span>{new Date().toLocaleDateString()}</span>
                                                    </p>
                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <span className="block text-2xl font-bold text-blue-600">{config.stats_hoje?.enviados || 0}</span>
                                                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Enviados</span>
                                                        </div>
                                                        <div className="w-px h-10 bg-slate-200 dark:bg-slate-700"></div>
                                                        <div className="flex-1">
                                                            <span className="block text-2xl font-bold text-red-400">{config.stats_hoje?.pendentes || 0}</span>
                                                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Não Enviados</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-blue-50/30 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                                    <p className="text-[10px] font-bold text-blue-400 uppercase mb-3 flex justify-between">
                                                        <span>Consultas de AMANHÃ</span>
                                                        <span>{new Date(Date.now() + 86400000).toLocaleDateString()}</span>
                                                    </p>
                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <span className="block text-2xl font-bold text-slate-700 dark:text-white">{config.stats_amanha?.enviados || 0}</span>
                                                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Antecipados</span>
                                                        </div>
                                                        <div className="w-px h-10 bg-slate-200 dark:bg-slate-700"></div>
                                                        <div className="flex-1">
                                                            <span className="block text-2xl font-bold text-orange-500">{config.stats_amanha?.pendentes || 0}</span>
                                                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Aguardando</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col md:flex-row gap-4 items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                                <div className="flex-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Configuração de Horário</label>
                                                    <div className="flex items-center gap-3">
                                                        <input type="time" name="horario_disparo_lembrete" value={config.horario_disparo_lembrete} onChange={handleChange} className="bg-white dark:bg-slate-800 border-none rounded-lg p-2 font-bold text-blue-600 outline-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-blue-500"/>
                                                        <span className="text-[10px] text-slate-500 leading-tight">O robô executará automaticamente neste horário (UTC-3).</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={handleExecutarAgora}
                                                    disabled={runningBot || !config.enviar_wpp_lembrete || !config.enviar_whatsapp_global || config.stats_amanha?.pendentes === 0}
                                                    className={`h-12 px-6 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50
                                                        ${config.stats_amanha?.pendentes > 0 ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                                                    `}
                                                >
                                                    {runningBot ? <Loader2 className="animate-spin" size={18}/> : config.stats_amanha?.pendentes === 0 ? <Check size={18}/> : <Play size={18} fill="currentColor"/>}
                                                    {config.stats_amanha?.pendentes === 0 ? 'Tudo Enviado' : 'Disparar Amanhã Agora'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                                    <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95">
                                        {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} 
                                        Salvar Configurações
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
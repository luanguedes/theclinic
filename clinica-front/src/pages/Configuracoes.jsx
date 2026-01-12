import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { 
    Settings, Shield, Layout as LayoutIcon, CalendarClock, Save, Loader2, AlertTriangle, Lock, MessageCircle, Play, CheckCircle2, Clock
} from 'lucide-react';

export default function Configuracoes() {
    const { api, user } = useAuth();
    const { notify, confirmDialog } = useNotification();
    
    const [activeTab, setActiveTab] = useState('comunicacao'); // Começa na aba nova para facilitar
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [runningBot, setRunningBot] = useState(false);

    // Estado inicial com valores padrão
    const [config, setConfig] = useState({
        max_tentativas_login: 5,
        tempo_bloqueio_minutos: 15,
        tempo_sessao_minutos: 60,
        itens_por_pagina: 10,
        modo_manutencao: false,
        janela_agendamento_meses: 6,
        
        // Comunicação
        enviar_whatsapp_global: true, // Master Switch
        enviar_wpp_confirmacao: true,
        enviar_wpp_bloqueio: true,
        enviar_wpp_lembrete: true,
        horario_disparo_lembrete: '08:00',
        data_ultima_execucao_lembrete: null
    });

    // Se não for admin, nem carrega
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

    // --- FUNÇÃO PARA EXECUTAR O ROBÔ MANUALMENTE ---
    const handleExecutarAgora = async () => {
        const confirm = await confirmDialog(
            "Isso irá buscar agendamentos de AMANHÃ que ainda não receberam lembrete e enviará a mensagem.",
            "Executar Disparo Manual?",
            "Sim, Executar", "Cancelar"
        );
        if (!confirm) return;

        setRunningBot(true);
        try {
            // Chama a rota de execução manual
            const res = await api.post('configuracoes/sistema/executar_lembretes/');
            
            notify.success("Rotina executada com sucesso!");
            // Atualiza a data na tela se retornada
            if(res.data.ultima_execucao) {
                setConfig(prev => ({...prev, data_ultima_execucao_lembrete: res.data.ultima_execucao}));
            }
        } catch (e) {
            notify.error("Erro ao executar rotina.");
        } finally {
            setRunningBot(false);
        }
    };

    // Verifica se já rodou hoje
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
                        Defina as regras globais de comportamento, segurança e interface da plataforma.
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    
                    {/* ABAS */}
                    <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-hide">
                        <button type="button" onClick={()=>setActiveTab('seguranca')} className={tabClass('seguranca')}>
                            <Shield size={18}/> Segurança
                        </button>
                        <button type="button" onClick={()=>setActiveTab('interface')} className={tabClass('interface')}>
                            <LayoutIcon size={18}/> Interface
                        </button>
                        <button type="button" onClick={()=>setActiveTab('agendamento')} className={tabClass('agendamento')}>
                            <CalendarClock size={18}/> Regras de Negócio
                        </button>
                        <button type="button" onClick={()=>setActiveTab('comunicacao')} className={tabClass('comunicacao')}>
                            <MessageCircle size={18}/> Comunicação
                        </button>
                    </div>

                    {/* CONTEÚDO */}
                    <div className="p-8">
                        {loading ? (
                            <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={32}/></div>
                        ) : (
                            <form onSubmit={handleSave} className="space-y-8">
                                
                                {/* ABA SEGURANÇA */}
                                {activeTab === 'seguranca' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className={labelClass}>Max. Tentativas de Login</label>
                                                <input type="number" name="max_tentativas_login" min="1" max="10" value={config.max_tentativas_login} onChange={handleChange} className={inputClass}/>
                                                <p className="text-xs text-slate-400 mt-1.5">Bloqueia o usuário após X erros consecutivos.</p>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Tempo de Bloqueio (Min)</label>
                                                <input type="number" name="tempo_bloqueio_minutos" min="1" max="1440" value={config.tempo_bloqueio_minutos} onChange={handleChange} className={inputClass}/>
                                                <p className="text-xs text-slate-400 mt-1.5">Duração do bloqueio por excesso de tentativas.</p>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className={labelClass}>Expiração de Sessão (Minutos)</label>
                                                <input type="number" name="tempo_sessao_minutos" min="5" max="1440" value={config.tempo_sessao_minutos} onChange={handleChange} className={inputClass}/>
                                                <p className="text-xs text-slate-400 mt-1.5">Desloga automaticamente por inatividade (Compliance LGPD).</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ABA INTERFACE */}
                                {activeTab === 'interface' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                        <div>
                                            <label className={labelClass}>Paginação Padrão (Itens por Página)</label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <input type="number" name="itens_por_pagina" min="5" max="100" value={config.itens_por_pagina} onChange={handleChange} className={inputClass}/>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1.5">Define quantos registros aparecem nas tabelas de listagem.</p>
                                        </div>

                                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-5 rounded-xl">
                                            <div className="flex items-center gap-2 mb-3 text-red-700 dark:text-red-400 font-bold">
                                                <AlertTriangle size={20}/> Modo Manutenção
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        name="modo_manutencao"
                                                        className="sr-only peer" 
                                                        checked={config.modo_manutencao} 
                                                        onChange={handleChange} 
                                                    />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                                                </label>
                                                <span className="font-bold text-slate-700 dark:text-slate-300 select-none">
                                                    {config.modo_manutencao ? 'SISTEMA BLOQUEADO' : 'Operação Normal'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-red-600/80 mt-3 leading-relaxed">
                                                Ao ativar, <strong>apenas administradores</strong> conseguirão fazer login. Use durante atualizações críticas.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ABA AGENDAMENTO */}
                                {activeTab === 'agendamento' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                        <div>
                                            <label className={labelClass}>Janela de Agendamento Futuro (Meses)</label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <input type="number" name="janela_agendamento_meses" min="1" max="24" value={config.janela_agendamento_meses} onChange={handleChange} className={inputClass}/>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1.5">Define até quantos meses à frente a agenda fica aberta para marcação.</p>
                                        </div>
                                    </div>
                                )}

                                {/* ABA COMUNICAÇÃO (NOVA) */}
                                {activeTab === 'comunicacao' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                                        
                                        {/* SEÇÃO 0: MASTER SWITCH */}
                                        <div className={`p-6 rounded-xl border-2 transition-all ${config.enviar_whatsapp_global ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className={`font-bold text-lg mb-1 ${config.enviar_whatsapp_global ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                                                        {config.enviar_whatsapp_global ? 'Sistema de Mensagens ATIVO' : 'Sistema de Mensagens DESATIVADO'}
                                                    </h3>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                                        Este é o controle mestre. Se desligado, nenhuma mensagem será enviada, independente das configurações abaixo.
                                                    </p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        name="enviar_whatsapp_global" 
                                                        className="sr-only peer" 
                                                        checked={!!config.enviar_whatsapp_global} 
                                                        onChange={handleChange} 
                                                    />
                                                    <div className={`w-14 h-7 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all ${config.enviar_whatsapp_global ? 'bg-slate-200 peer-checked:bg-green-600' : 'bg-slate-200 peer-checked:bg-red-600'}`}></div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* SEÇÃO 1: TIPOS DE MENSAGENS (COM OPACIDADE CONDICIONAL) */}
                                        <div className={`bg-slate-50 dark:bg-slate-900/30 p-5 rounded-xl border border-slate-100 dark:border-slate-700 transition-opacity duration-300 ${!config.enviar_whatsapp_global ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                            <h3 className="font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
                                                <Settings size={18}/> Tipos de Mensagens Ativos
                                            </h3>
                                            <div className="space-y-4">
                                                
                                                {/* TOGGLE CONFIRMAÇÃO */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Confirmação de Agendamento</p>
                                                        <p className="text-xs text-slate-500">Enviada imediatamente após criar um agendamento.</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            name="enviar_wpp_confirmacao" 
                                                            className="sr-only peer" 
                                                            checked={config.enviar_wpp_confirmacao} 
                                                            onChange={handleChange}
                                                            disabled={!config.enviar_whatsapp_global} // TRAVA
                                                        />
                                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>

                                                <hr className="dark:border-slate-700"/>

                                                {/* TOGGLE BLOQUEIO */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Aviso de Bloqueio/Cancelamento</p>
                                                        <p className="text-xs text-slate-500">Enviada ao bloquear agenda e cancelar pacientes.</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            name="enviar_wpp_bloqueio" 
                                                            className="sr-only peer" 
                                                            checked={config.enviar_wpp_bloqueio} 
                                                            onChange={handleChange}
                                                            disabled={!config.enviar_whatsapp_global} // TRAVA
                                                        />
                                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>

                                                <hr className="dark:border-slate-700"/>

                                                {/* TOGGLE LEMBRETE */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Lembrete Automático (24h antes)</p>
                                                        <p className="text-xs text-slate-500">Enviada no dia anterior à consulta.</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            name="enviar_wpp_lembrete" 
                                                            className="sr-only peer" 
                                                            checked={config.enviar_wpp_lembrete} 
                                                            onChange={handleChange} 
                                                            disabled={!config.enviar_whatsapp_global} // TRAVA
                                                        />
                                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* SEÇÃO 2: CONFIGURAÇÃO DO ROBÔ (COM OPACIDADE CONDICIONAL) */}
                                        <div className={`p-5 rounded-xl border transition-all ${config.enviar_whatsapp_global && config.enviar_wpp_lembrete ? 'bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 opacity-50 pointer-events-none'}`}>
                                            <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                                <CalendarClock size={20} className="text-blue-600"/> Configuração do Robô de Lembretes
                                            </h3>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Horário do Disparo</label>
                                                        <div className="flex items-center gap-2">
                                                            <input 
                                                                type="time" 
                                                                name="horario_disparo_lembrete"
                                                                value={config.horario_disparo_lembrete} 
                                                                onChange={handleChange} 
                                                                className={inputClass}
                                                            />
                                                            <span className="text-xs text-slate-400 w-32">Horário alvo para execução diária.</span>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status de Hoje ({new Date().toLocaleDateString()})</label>
                                                        <div className={`flex items-center gap-2 font-bold ${jaRodouHoje ? 'text-green-600' : 'text-orange-500'}`}>
                                                            {jaRodouHoje ? <CheckCircle2 size={20}/> : <Clock size={20}/>}
                                                            {jaRodouHoje ? 'Executado com Sucesso' : 'Ainda não executado'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                                                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">
                                                        Precisa reenviar ou adiantar o envio?
                                                    </p>
                                                    <button 
                                                        type="button"
                                                        onClick={handleExecutarAgora}
                                                        // Desabilita se o Global OU o Lembrete estiverem desligados
                                                        disabled={runningBot || !config.enviar_wpp_lembrete || !config.enviar_whatsapp_global}
                                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {runningBot ? <Loader2 className="animate-spin" size={20}/> : <Play size={20} fill="currentColor"/>}
                                                        Executar Disparo Manualmente
                                                    </button>
                                                    <p className="text-[10px] text-slate-400 mt-2">
                                                        O sistema ignorará automaticamente pacientes que já receberam o lembrete hoje.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                )}

                                <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                                    <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 transition-transform active:scale-95">
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
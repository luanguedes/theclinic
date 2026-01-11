import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { 
    Settings, Shield, Layout as LayoutIcon, CalendarClock, Save, Loader2, AlertTriangle, Lock, MessageCircle
} from 'lucide-react';

export default function Configuracoes() {
    const { api, user } = useAuth();
    const { notify } = useNotification();
    
    const [activeTab, setActiveTab] = useState('seguranca');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

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
        // Comunicação (NOVO)
        enviar_whatsapp_global: true
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
            if(res.data) setConfig(res.data);
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
                        <button onClick={()=>setActiveTab('seguranca')} className={tabClass('seguranca')}>
                            <Shield size={18}/> Segurança
                        </button>
                        <button onClick={()=>setActiveTab('interface')} className={tabClass('interface')}>
                            <LayoutIcon size={18}/> Interface
                        </button>
                        <button onClick={()=>setActiveTab('agendamento')} className={tabClass('agendamento')}>
                            <CalendarClock size={18}/> Regras de Negócio
                        </button>
                        <button onClick={()=>setActiveTab('comunicacao')} className={tabClass('comunicacao')}>
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
                                                <input type="number" min="1" max="10" value={config.max_tentativas_login} onChange={e=>setConfig({...config, max_tentativas_login: e.target.value})} className={inputClass}/>
                                                <p className="text-xs text-slate-400 mt-1.5">Bloqueia o usuário após X erros consecutivos.</p>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Tempo de Bloqueio (Min)</label>
                                                <input type="number" min="1" max="1440" value={config.tempo_bloqueio_minutos} onChange={e=>setConfig({...config, tempo_bloqueio_minutos: e.target.value})} className={inputClass}/>
                                                <p className="text-xs text-slate-400 mt-1.5">Duração do bloqueio por excesso de tentativas.</p>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className={labelClass}>Expiração de Sessão (Minutos)</label>
                                                <input type="number" min="5" max="1440" value={config.tempo_sessao_minutos} onChange={e=>setConfig({...config, tempo_sessao_minutos: e.target.value})} className={inputClass}/>
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
                                                <input type="number" min="5" max="100" value={config.itens_por_pagina} onChange={e=>setConfig({...config, itens_por_pagina: e.target.value})} className={inputClass}/>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1.5">Define quantos registros aparecem nas tabelas de listagem.</p>
                                        </div>

                                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-5 rounded-xl">
                                            <div className="flex items-center gap-2 mb-3 text-red-700 dark:text-red-400 font-bold">
                                                <AlertTriangle size={20}/> Modo Manutenção
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={config.modo_manutencao} onChange={e=>setConfig({...config, modo_manutencao: e.target.checked})} />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                                                </div>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">
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
                                                <input type="number" min="1" max="24" value={config.janela_agendamento_meses} onChange={e=>setConfig({...config, janela_agendamento_meses: e.target.value})} className={inputClass}/>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1.5">Define até quantos meses à frente a agenda fica aberta para marcação.</p>
                                        </div>
                                    </div>
                                )}

                                {/* ABA COMUNICAÇÃO (NOVO) */}
                                {activeTab === 'comunicacao' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                        <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 p-5 rounded-xl">
                                            <div className="flex items-center gap-2 mb-3 text-green-700 dark:text-green-400 font-bold">
                                                <MessageCircle size={20}/> Disparos de WhatsApp
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={config.enviar_whatsapp_global} onChange={e=>setConfig({...config, enviar_whatsapp_global: e.target.checked})} />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                                                </div>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                                    {config.enviar_whatsapp_global ? 'ENVIO ATIVADO' : 'ENVIO DESATIVADO'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-green-600/80 mt-3 leading-relaxed">
                                                Controle Mestre: Se desativado aqui, <strong>nenhuma</strong> mensagem será enviada pelo sistema, independente da configuração individual do agendamento.
                                            </p>
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
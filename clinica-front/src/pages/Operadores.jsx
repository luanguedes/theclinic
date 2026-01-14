import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { Search, UserPlus, Shield, Pencil, Trash2, Loader2, Stethoscope } from 'lucide-react';

export default function Operadores() {
    const { api } = useAuth();
    const { notify, confirmDialog } = useNotification();
    const navigate = useNavigate();

    const [operadores, setOperadores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    useEffect(() => {
        if (api) fetchOperadores();
    }, [api]);

    const fetchOperadores = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('operadores/');
            setOperadores(Array.isArray(data) ? data : data.results);
        } catch (error) {
            notify.error("Erro ao carregar operadores.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const confirm = await confirmDialog("Remover este operador permanentemente?", "Exclusão", "Sim, Remover", "Cancelar", "danger");
        if (confirm) {
            try {
                await api.delete(`operadores/${id}/`);
                notify.success("Operador removido.");
                fetchOperadores();
            } catch (e) { notify.error("Erro ao excluir."); }
        }
    };

    const filtered = operadores.filter(op => 
        op.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        op.first_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout>
            <div className="max-w-6xl mx-auto pb-20">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                            <Shield className="text-blue-600"/> Gestão de Operadores
                        </h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Controle de acesso e segurança</p>
                    </div>
                    <button onClick={() => navigate('/operadores/novo')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center gap-2 active:scale-95 transition-all">
                        <UserPlus size={18}/> Novo Operador
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                        <input 
                            placeholder="Buscar por nome ou usuário..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full pl-12 bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40}/></div>
                    ) : filtered.map(op => (
                        <div key={op.id} className="bg-white dark:bg-slate-800 rounded-[24px] p-6 shadow-sm border border-slate-200 dark:border-slate-700 relative group hover:shadow-lg transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg ${op.is_superuser ? 'bg-slate-900' : 'bg-blue-600'}`}>
                                        {op.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm">{op.first_name || op.username}</h3>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${op.is_superuser ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {op.is_superuser ? 'Administrador' : 'Operador'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => navigate(`/operadores/editar/${op.id}`)} className="p-2 hover:bg-slate-100 rounded-lg text-blue-600"><Pencil size={16}/></button>
                                    {!op.is_superuser && <button onClick={() => handleDelete(op.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16}/></button>}
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                    <Shield size={14} className={op.is_superuser ? 'text-slate-900' : 'text-slate-300'}/>
                                    {op.is_superuser ? 'Acesso Irrestrito (Root)' : 'Permissões Limitadas'}
                                </div>
                                {op.profissional_nome && (
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <Stethoscope size={14} className="text-emerald-500"/>
                                        <span className="uppercase tracking-widest">{op.profissional_nome}</span>
                                    </div>
                                )}
                                {!op.is_superuser && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {op.acesso_agendamento && <span className="px-2 py-1 bg-green-50 text-green-700 text-[9px] font-black uppercase rounded border border-green-100">Agenda</span>}
                                        {op.acesso_atendimento && <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[9px] font-black uppercase rounded border border-purple-100">Médico</span>}
                                        {op.acesso_faturamento && <span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-[9px] font-black uppercase rounded border border-yellow-100">Financeiro</span>}
                                        {op.privilegios_detalhes?.length > 0 && (
                                            <span className="px-2 py-1 bg-slate-50 text-slate-500 text-[9px] font-black uppercase rounded border border-slate-100">
                                                {new Set(op.privilegios_detalhes.map((p) => p.module_label)).size} módulos
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
}

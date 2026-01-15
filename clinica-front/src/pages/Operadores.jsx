import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { Search, UserPlus, Shield, Pencil, Trash2, Loader2, Stethoscope, Filter, ChevronDown, X } from 'lucide-react';

export default function Operadores() {
    const { api } = useAuth();
    const { notify, confirmDialog } = useNotification();
    const navigate = useNavigate();

    const [operadores, setOperadores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filterType, setFilterType] = useState('texto');
    const [filterValue, setFilterValue] = useState('');
    const [activeFilters, setActiveFilters] = useState([]);
    
    useEffect(() => {
        if (api) fetchOperadores();
    }, [api, page, activeFilters]);

    const fetchOperadores = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', page);
            activeFilters.forEach((f) => {
                if (!f.value) return;
                if (f.type === 'texto') params.append('search', f.value);
                else params.append(f.type, f.value);
            });
            const { data } = await api.get(`operadores/?${params.toString()}`);
            setOperadores(data.results || []);
            setTotalPages(data.num_pages || Math.max(1, Math.ceil((data.count || 0) / (data.page_size || 1))));
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

    const statusOptions = [
        { value: 'true', label: 'Ativo' },
        { value: 'false', label: 'Inativo' }
    ];

    const perfilOptions = [
        { value: 'true', label: 'Administrador' },
        { value: 'false', label: 'Operador' }
    ];

    const filterTypeOptions = [
        { value: 'texto', label: 'Busca Geral' },
        { value: 'is_active', label: 'Status' },
        { value: 'is_superuser', label: 'Perfil' }
    ];

    const addFilter = () => {
        if (!filterValue) return;
        const typeLabel = filterTypeOptions.find((o) => o.value === filterType)?.label || 'Filtro';
        let display = filterValue;
        if (filterType === 'is_active') {
            display = statusOptions.find((o) => o.value === filterValue)?.label || filterValue;
        }
        if (filterType === 'is_superuser') {
            display = perfilOptions.find((o) => o.value === filterValue)?.label || filterValue;
        }
        const newFilter = { id: Date.now(), type: filterType, value: filterValue, display: `${typeLabel}: ${display}` };
        const cleanFilters = activeFilters.filter((f) => f.type !== filterType);
        setActiveFilters([...cleanFilters, newFilter]);
        setFilterValue('');
        setPage(1);
    };

    const removeFilter = (id) => {
        setActiveFilters(activeFilters.filter((f) => f.id !== id));
        setPage(1);
    };

    const clearAllFilters = () => {
        setActiveFilters([]);
        setFilterValue('');
        setPage(1);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') addFilter();
    };

    const renderDynamicInput = () => {
        const commonClass = 'w-full h-11 pl-3 pr-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white focus:ring-2 focus:ring-blue-100 transition-all text-sm font-bold';
        if (filterType === 'is_active') {
            return (
                <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className={commonClass}>
                    <option value="">Selecione...</option>
                    {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            );
        }
        if (filterType === 'is_superuser') {
            return (
                <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className={commonClass}>
                    <option value="">Selecione...</option>
                    {perfilOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            );
        }
        return (
            <input
                placeholder="Digite para buscar..."
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className={commonClass}
                onKeyDown={handleKeyDown}
            />
        );
    };

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
                    <div className="flex flex-col md:flex-row gap-3 items-center">
                        <div className="w-full md:w-60">
                            <div className="relative h-11">
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="w-full h-full pl-10 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 appearance-none cursor-pointer"
                                >
                                    {filterTypeOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Filter size={14} /></div>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><ChevronDown size={14} /></div>
                            </div>
                        </div>
                        <div className="flex-1 relative">
                            {renderDynamicInput()}
                            <button onClick={addFilter} className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-xl shadow-lg hover:bg-blue-700 transition">
                                <Search size={14} />
                            </button>
                        </div>
                        <button onClick={clearAllFilters} className="h-11 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
                            Limpar
                        </button>
                    </div>
                    {activeFilters.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            {activeFilters.map((f) => (
                                <span key={f.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest">
                                    {f.display}
                                    <button onClick={() => removeFilter(f.id)} className="text-blue-500 hover:text-blue-700"><X size={12} /></button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40}/></div>
                    ) : operadores.map(op => (
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
                                {!op.is_superuser && op.privilegios_detalhes?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        <span className="px-2 py-1 bg-slate-50 text-slate-500 text-[9px] font-black uppercase rounded border border-slate-100">
                                            {new Set(op.privilegios_detalhes.map((p) => p.module_label)).size} módulos
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-between">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Pagina {page} de {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Proxima
                        </button>
                    </div>
                )}
            </div>
        </Layout>
    );
}

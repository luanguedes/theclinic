import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { Search, Plus, Heart, Edit, Trash2, Save, X, Loader2, Activity, Filter, ChevronDown } from 'lucide-react';

export default function Especialidades() {
    const { api } = useAuth();
    const { notify, confirmDialog } = useNotification();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filterType, setFilterType] = useState('texto');
    const [filterValue, setFilterValue] = useState('');
    const [activeFilters, setActiveFilters] = useState([]);
    
    // Removida descrição, mantido apenas nome
    const [form, setForm] = useState({ nome: '' });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => { if (api) fetchItems(); }, [api, page, activeFilters]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            // CORREÇÃO DE ROTA: Removido 'configuracoes/'
            const params = new URLSearchParams();
            params.append('page', page);
            activeFilters.forEach((f) => {
                if (!f.value) return;
                if (f.type === 'texto') params.append('search', f.value);
                else params.append(f.type, f.value);
            });
            const { data } = await api.get(`especialidades/?${params.toString()}`);
            setItems(data.results || []);
            setTotalPages(data.num_pages || Math.max(1, Math.ceil((data.count || 0) / (data.page_size || 1))));
        } catch { notify.error("Erro ao carregar especialidades."); } 
        finally { setLoading(false); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`especialidades/${editingId}/`, form);
                notify.success("Atualizado!");
            } else {
                await api.post('especialidades/', form);
                notify.success("Criado!");
            }
            setModalOpen(false); 
            fetchItems();
        } catch { notify.error("Erro ao salvar."); }
    };

    const handleDelete = async (id) => {
        if (await confirmDialog("Excluir especialidade?", "Exclusão", "Sim", "Não", "danger")) {
            try { await api.delete(`especialidades/${id}/`); notify.success("Removido."); fetchItems(); } 
            catch { notify.error("Erro ao excluir."); }
        }
    };

    const filterTypeOptions = [
        { value: 'texto', label: 'Busca Geral' },
        { value: 'id', label: 'Codigo' }
    ];

    const addFilter = () => {
        if (!filterValue) return;
        const typeLabel = filterTypeOptions.find((o) => o.value === filterType)?.label || 'Filtro';
        const newFilter = { id: Date.now(), type: filterType, value: filterValue, display: `${typeLabel}: ${filterValue}` };
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
        const commonClass = "w-full h-11 pl-3 pr-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 text-sm font-bold";
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
            <div className="max-w-4xl mx-auto pb-20">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-2"><Heart className="text-pink-600"/> Especialidades</h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Áreas de atuação da clínica</p>
                    </div>
                    <button onClick={() => { setForm({nome:''}); setEditingId(null); setModalOpen(true); }} className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center gap-2 active:scale-95 transition-all"><Plus size={18}/> Nova</button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b dark:border-slate-700 bg-slate-50/50">
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
                                <button onClick={addFilter} className="absolute right-2 top-1/2 -translate-y-1/2 bg-pink-600 text-white p-2 rounded-xl shadow-lg hover:bg-pink-700 transition">
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
                                    <span key={f.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-50 text-pink-700 text-[10px] font-black uppercase tracking-widest">
                                        {f.display}
                                        <button onClick={() => removeFilter(f.id)} className="text-pink-500 hover:text-pink-700"><X size={12} /></button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {loading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-pink-600"/></div> : 
                        items.map(item => (
                            <div key={item.id} className="p-6 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-pink-50 text-pink-600 rounded-xl"><Activity size={20}/></div>
                                    <div><h3 className="font-black text-slate-800 dark:text-white uppercase text-sm">{item.nome}</h3></div>
                                </div>
                                <div className="flex gap-2"><button onClick={() => { setForm({ nome: item.nome }); setEditingId(item.id); setModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16}/></button><button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div>
                            </div>
                        ))}
                    </div>
                </div>
                {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between">
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

                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="bg-pink-600 p-6 flex justify-between items-center text-white"><h3 className="font-black uppercase">{editingId ? 'Editar' : 'Nova'} Especialidade</h3><button onClick={() => setModalOpen(false)}><X/></button></div>
                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div><label className="text-xs font-bold text-slate-500 uppercase">Nome da Especialidade</label><input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full bg-slate-50 border rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-pink-500" required autoFocus/></div>
                                <button type="submit" className="w-full bg-pink-600 hover:bg-pink-700 text-white py-3 rounded-xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all">Salvar</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

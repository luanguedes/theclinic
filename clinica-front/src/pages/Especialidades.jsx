import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { Search, Plus, Heart, Edit, Trash2, Save, X, Loader2, Activity } from 'lucide-react';

export default function Especialidades() {
    const { api } = useAuth();
    const { notify, confirmDialog } = useNotification();
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    
    // Removida descrição, mantido apenas nome
    const [form, setForm] = useState({ nome: '' });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => { if (api) fetchItems(); }, [api]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            // CORREÇÃO DE ROTA: Removido 'configuracoes/'
            const { data } = await api.get('especialidades/');
            setItems(Array.isArray(data) ? data : data.results);
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
                        <div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-pink-500 text-sm font-bold"/></div>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {loading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-pink-600"/></div> : 
                        items.filter(i => i.nome.toLowerCase().includes(search.toLowerCase())).map(item => (
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
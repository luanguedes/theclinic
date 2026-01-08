import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext'; // <--- NOVO
import Layout from '../components/Layout';
import { 
  Building2, Search, Plus, Pencil, Trash2, X, Save, Percent, Loader2 
} from 'lucide-react';

export default function Convenios() {
  const { api } = useAuth();
  const { notify, confirmDialog } = useNotification(); // <--- HOOK
  
  const [convenios, setConvenios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [nome, setNome] = useState('');
  const [desconto, setDesconto] = useState('');

  useEffect(() => {
    if (api) loadData();
  }, [api, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`configuracoes/convenios/?search=${search}`);
      setConvenios(res.data.results || res.data);
    } catch (e) {
      console.error("Erro ao carregar convênios", e);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    if (item) {
        setNome(item.nome || '');
        setDesconto(item.percentual_desconto || '0.00');
    } else {
        setNome('');
        setDesconto('');
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = { 
        nome, 
        percentual_desconto: desconto === '' ? 0 : parseFloat(desconto) 
    };

    try {
      if (editingItem) {
        await api.put(`configuracoes/convenios/${editingItem.id}/`, payload);
        notify.success('Convênio atualizado!'); // <---
      } else {
        await api.post('configuracoes/convenios/', payload);
        notify.success('Convênio criado!'); // <---
      }
      setModalOpen(false);
      loadData();
    } catch (error) {
      notify.error("Erro ao salvar convênio."); // <---
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    // --- DIALOG BONITO ---
    const confirmado = await confirmDialog("Excluir este convênio?", "Exclusão", "Sim, excluir", "Cancelar", "danger");
    if(confirmado) {
        try {
            await api.delete(`configuracoes/convenios/${id}/`);
            notify.success("Convênio excluído.");
            loadData();
        } catch(e) {
            notify.error("Erro ao excluir.");
        }
    }
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white transition-all";

  return (
    <Layout>
      <div className="max-w-4xl mx-auto pb-20">
        
        <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Building2 className="text-blue-600"/> Convênios
                </h1>
                <p className="text-slate-500 text-sm">Gerencie os planos de saúde e descontos.</p>
            </div>
            <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95">
                <Plus size={20}/> Novo Convênio
            </button>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
            <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                    placeholder="Pesquisar convênio..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    className="w-full pl-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none dark:text-white"
                />
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Desconto (%)</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {convenios.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-700 dark:text-white">{item.nome}</td>
                            <td className="px-6 py-4">
                                <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-lg text-xs font-bold">
                                    {Number(item.percentual_desconto).toFixed(2)}%
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                <button onClick={() => openModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 rounded-lg transition-colors"><Pencil size={18}/></button>
                                <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 rounded-lg transition-colors"><Trash2 size={18}/></button>
                            </td>
                        </tr>
                    ))}
                    {convenios.length === 0 && !loading && (
                        <tr><td colSpan="3" className="p-8 text-center text-slate-400">Nenhum convênio encontrado.</td></tr>
                    )}
                </tbody>
            </table>
        </div>

        {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                    <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">{editingItem ? 'Editar Convênio' : 'Novo Convênio'}</h3>
                        <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    
                    <form onSubmit={handleSave} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Convênio</label>
                            <input 
                                required 
                                value={nome} 
                                onChange={e => setNome(e.target.value)} 
                                className={inputClass} 
                                placeholder="Ex: Unimed, Bradesco..."
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Desconto Padrão (%)</label>
                            <div className="relative">
                                <Percent className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={desconto} 
                                    onChange={e => setDesconto(e.target.value)} 
                                    className={`${inputClass} pl-10`} 
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3 justify-end">
                            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold">Cancelar</button>
                            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95">
                                {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

      </div>
    </Layout>
  );
}
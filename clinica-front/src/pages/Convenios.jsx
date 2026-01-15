import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { 
    Building2, Search, Plus, Pencil, Trash2, X, Save, Percent, Loader2 
} from 'lucide-react';

export default function Convenios() {
  const { api } = useAuth();
  const { notify, confirmDialog } = useNotification();
  
  const [convenios, setConvenios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [nome, setNome] = useState('');
  const [desconto, setDesconto] = useState('');

  useEffect(() => {
    if (api) loadData();
  }, [api, search, page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      if (search) params.append('search', search);
      const res = await api.get(`configuracoes/convenios/?${params.toString()}`);
      setConvenios(res.data.results || []);
      setTotalPages(res.data.num_pages || Math.max(1, Math.ceil((res.data.count || 0) / (res.data.page_size || 1))));
    } catch (e) {
      notify.error("Erro ao carregar lista de convênios.");
      setConvenios([]);
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
        setDesconto('0.00');
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return notify.warning("Informe o nome do convênio.");

    setSaving(true);
    const payload = { 
        nome, 
        percentual_desconto: desconto === '' ? 0 : parseFloat(desconto) 
    };

    try {
      if (editingItem) {
        await api.put(`configuracoes/convenios/${editingItem.id}/`, payload);
        notify.success('Convênio atualizado com sucesso!');
      } else {
        await api.post('configuracoes/convenios/', payload);
        notify.success('Novo convênio cadastrado!');
      }
      setModalOpen(false);
      loadData();
    } catch (error) {
      notify.error("Erro ao salvar convênio. Verifique se o nome já existe.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmado = await confirmDialog(
        "Deseja excluir este convênio? Pacientes vinculados a ele podem perder o desconto configurado.", 
        "Excluir Convênio", 
        "Confirmar Exclusão", 
        "Cancelar", 
        "danger"
    );

    if(confirmado) {
        try {
            await api.delete(`configuracoes/convenios/${id}/`);
            notify.success("Convênio removido com sucesso.");
            loadData();
        } catch(e) {
            notify.error("Não é possível excluir convênios que possuem históricos de faturamento vinculados.");
        }
    }
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white transition-all";
  const labelClass = "block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-tight";

  return (
    <Layout>
      <div className="max-w-4xl mx-auto pb-20">
        
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg shadow-blue-500/20">
                    <Building2 size={24}/>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Convênios</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Planos de saúde e políticas de desconto.</p>
                </div>
            </div>
            <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95">
                <Plus size={20}/> Novo Convênio
            </button>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 relative">
            <Search className="absolute left-7 top-7 text-slate-400" size={18} />
            <input 
                placeholder="Pesquisar convênio pelo nome..." 
                value={search} 
                onChange={e => { setSearch(e.target.value); setPage(1); }} 
                className="w-full pl-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none dark:text-white transition-colors focus:border-blue-500"
            />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Nome</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Desconto</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {loading ? (
                        <tr>
                            <td colSpan="3" className="p-10 text-center">
                                <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" size={32}/>
                                <span className="text-slate-400 font-medium">Carregando dados...</span>
                            </td>
                        </tr>
                    ) : (
                        <>
                            {convenios.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-white">{item.nome}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold">
                                            {Number(item.percentual_desconto).toFixed(2)}% de desconto
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => openModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Editar"><Pencil size={18}/></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Excluir"><Trash2 size={18}/></button>
                                    </td>
                                </tr>
                            ))}
                            {convenios.length === 0 && (
                                <tr><td colSpan="3" className="p-10 text-center text-slate-400 font-medium italic">Nenhum convênio encontrado.</td></tr>
                            )}
                        </>
                    )}
                </tbody>
            </table>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">{editingItem ? 'Editar Convênio' : 'Novo Convênio'}</h3>
                        <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={24}/></button>
                    </div>
                    
                    <form onSubmit={handleSave} className="p-6 space-y-5">
                        <div>
                            <label className={labelClass}>Nome do Convênio</label>
                            <input 
                                required 
                                autoFocus
                                value={nome} 
                                onChange={e => setNome(e.target.value)} 
                                className={inputClass} 
                                placeholder="Ex: Unimed, Bradesco..."
                            />
                        </div>
                        
                        <div>
                            <label className={labelClass}>Desconto Padrão (%)</label>
                            <div className="relative">
                                <Percent className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    min="0"
                                    max="100"
                                    value={desconto} 
                                    onChange={e => setDesconto(e.target.value)} 
                                    className={`${inputClass} pl-10 font-mono`} 
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Este valor será sugerido automaticamente no momento do pagamento.</p>
                        </div>

                        <div className="pt-4 flex gap-3 justify-end">
                            <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
                            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50">
                                {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                {saving ? 'Salvando...' : 'Salvar Dados'}
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

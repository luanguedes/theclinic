import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { FileText, Search, Plus, Pencil, X, Save, Loader2, Filter, ChevronDown } from 'lucide-react';

export default function Cids() {
  const { api } = useAuth();
  const { notify, confirmDialog } = useNotification();

  const [cids, setCids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState('texto');
  const [filterValue, setFilterValue] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    situacao: true
  });

  useEffect(() => {
    if (api) loadData();
  }, [api, page, activeFilters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      activeFilters.forEach((f) => {
        if (!f.value) return;
        if (f.type === 'texto') params.append('search', f.value);
        else params.append(f.type, f.value);
      });
      const res = await api.get(`configuracoes/cids/?${params.toString()}`);
      setCids(res.data.results || []);
      setTotalPages(res.data.num_pages || Math.max(1, Math.ceil((res.data.count || 0) / (res.data.page_size || 1))));
    } catch (e) {
      notify.error("Erro ao carregar lista de CIDs.");
      setCids([]);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setFormData({
        codigo: item.codigo || '',
        nome: item.nome || '',
        situacao: item.situacao ?? true
      });
    } else {
      setFormData({
        codigo: '',
        nome: '',
        situacao: true
      });
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.codigo.trim()) return notify.warning("Informe o codigo CID.");
    if (!formData.nome.trim()) return notify.warning("Informe a descricao do CID.");

    setSaving(true);
    try {
      if (editingItem) {
        await api.put(`configuracoes/cids/${editingItem.id}/`, formData);
        notify.success('CID atualizado com sucesso!');
      } else {
        await api.post('configuracoes/cids/', formData);
        notify.success('Novo CID cadastrado!');
      }
      setModalOpen(false);
      loadData();
    } catch (error) {
      notify.error("Erro ao salvar CID.");
    } finally {
      setSaving(false);
    }
  };

  const handleInativar = async (item) => {
    if (!item.situacao) return;
    const confirmado = await confirmDialog(
      "Deseja inativar este CID? Ele continuara visivel em registros antigos.",
      "Inativar CID",
      "Confirmar Inativacao",
      "Cancelar",
      "warning"
    );
    if (!confirmado) return;
    try {
      await api.post(`configuracoes/cids/${item.id}/inativar/`);
      notify.success("CID inativado.");
      loadData();
    } catch (e) {
      notify.error("Erro ao inativar CID.");
    }
  };

  const statusOptions = [
    { value: 'true', label: 'Ativo' },
    { value: 'false', label: 'Inativo' }
  ];

  const filterTypeOptions = [
    { value: 'texto', label: 'Busca Geral' },
    { value: 'codigo', label: 'Codigo' },
    { value: 'nome', label: 'Descricao' },
    { value: 'situacao', label: 'Situacao' }
  ];

  const addFilter = () => {
    if (!filterValue) return;
    const typeLabel = filterTypeOptions.find((o) => o.value === filterType)?.label || 'Filtro';
    let display = filterValue;
    if (filterType === 'situacao') {
      display = statusOptions.find((o) => o.value === filterValue)?.label || filterValue;
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
    const commonClass = "w-full h-11 pl-3 pr-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold";
    if (filterType === 'situacao') {
      return (
        <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className={commonClass}>
          <option value="">Selecione...</option>
          {statusOptions.map((opt) => (
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

  const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white transition-all";
  const labelClass = "block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-tight";

  return (
    <Layout>
      <div className="max-w-6xl mx-auto pb-20">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-3 rounded-xl text-white shadow-lg shadow-slate-900/20">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">CIDs</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Classificacao internacional de doencas.</p>
            </div>
          </div>
          <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95">
            <Plus size={20} /> Novo CID
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

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Codigo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Descricao</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-10 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" size={32} />
                    <span className="text-slate-400 font-medium">Carregando dados...</span>
                  </td>
                </tr>
              ) : (
                <>
                  {cids.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-white">{item.codigo}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.nome}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.situacao ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {item.situacao ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button onClick={() => openModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Editar"><Pencil size={18} /></button>
                        <button onClick={() => handleInativar(item)} className="p-2 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20 rounded-lg transition-colors disabled:opacity-40" title="Inativar" disabled={!item.situacao}><X size={18} /></button>
                      </td>
                    </tr>
                  ))}
                  {cids.length === 0 && (
                    <tr><td colSpan="4" className="p-10 text-center text-slate-400 font-medium italic">Nenhum CID encontrado.</td></tr>
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
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">{editingItem ? 'Editar CID' : 'Novo CID'}</h3>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-5">
                <div>
                  <label className={labelClass}>Codigo</label>
                  <input
                    required
                    autoFocus
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className={inputClass}
                    placeholder="Ex: J00.0"
                  />
                </div>
                <div>
                  <label className={labelClass}>Descricao</label>
                  <input
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className={inputClass}
                    placeholder="Ex: Resfriado comum"
                  />
                </div>
                <div>
                  <label className={labelClass}>Situacao</label>
                  <select
                    value={formData.situacao ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, situacao: e.target.value === 'true' })}
                    className={inputClass}
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
                <div className="pt-4 flex gap-3 justify-end">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
                  <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50">
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
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

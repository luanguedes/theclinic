import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
// MUDANÇA 1: Troquei 'Edit' por 'Pencil' para padronizar com as outras telas
import { Plus, Pencil, Trash2, Tag, X, Save, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Especialidades() {
  const { api } = useAuth();
  
  const [especialidades, setEspecialidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (api) loadData();
  }, [api, page, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      let pageSize = 15;
      try {
          const conf = await api.get('operadores/config/');
          if (conf.data?.itens_por_pagina) pageSize = conf.data.itens_por_pagina;
      } catch {}

      const response = await api.get(`especialidades/?page=${page}&page_size=${pageSize}&search=${search}`);
      const data = response.data;

      if (data.results) {
        setEspecialidades(data.results);
        setTotalCount(data.count);
        setTotalPages(Math.ceil(data.count / pageSize));
      } else {
        setEspecialidades(data);
        setTotalPages(1);
        setTotalCount(data.length);
      }
    } catch (error) {
      console.error("Erro", error);
      if (page > 1) setPage(1);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    setNome(item ? item.nome : '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingItem) {
        await api.put(`especialidades/${editingItem.id}/`, { nome });
      } else {
        await api.post('especialidades/', { nome });
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      alert("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Tem certeza que deseja excluir?")) {
      try {
        await api.delete(`especialidades/${id}/`);
        loadData();
      } catch (error) {
        alert("Não é possível excluir item em uso.");
      }
    }
  };

  const paginationBtnClass = "p-2 border rounded-lg transition-colors disabled:opacity-50 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700";
  
  // PADRÃO DE BOTÃO IDENTICO AO DE PACIENTES/OPERADORES
  const actionBtnClass = "p-2 bg-transparent rounded-lg transition-colors";
  const editBtnClass = `${actionBtnClass} text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30`;
  const deleteBtnClass = `${actionBtnClass} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30`;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Tag className="text-blue-600"/> Especialidades
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie as áreas de atuação médica.</p>
            </div>
            <button 
                onClick={() => handleOpenModal()} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95"
            >
                <Plus size={20}/> Nova Especialidade
            </button>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 relative">
            <Search className="absolute left-7 top-7 text-slate-400" size={18} />
            <input 
                placeholder="Pesquisar especialidade..." 
                value={search} 
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none text-slate-700 dark:text-white transition-colors focus:border-blue-500"
            />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                        <th className="px-6 py-4">Nome da Especialidade</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {especialidades.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-700 dark:text-white">
                                {item.nome}
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                {/* BOTÕES PADRONIZADOS */}
                                <button onClick={() => handleOpenModal(item)} className={editBtnClass} title="Editar">
                                    <Pencil size={18}/>
                                </button>
                                <button onClick={() => handleDelete(item.id)} className={deleteBtnClass} title="Excluir">
                                    <Trash2 size={18}/>
                                </button>
                            </td>
                        </tr>
                    ))}
                    {especialidades.length === 0 && !loading && (
                        <tr><td colSpan="2" className="p-8 text-center text-slate-400">Nenhuma especialidade encontrada.</td></tr>
                    )}
                </tbody>
            </table>

            {totalPages > 1 && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-slate-500 text-sm">
                    <span>Página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalCount} itens)</span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={paginationBtnClass}><ChevronLeft size={16}/></button>
                        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={paginationBtnClass}><ChevronRight size={16}/></button>
                    </div>
                </div>
            )}
        </div>

        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
                    <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            {editingItem ? 'Editar Especialidade' : 'Nova Especialidade'}
                        </h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome</label>
                            <input 
                                autoFocus
                                required
                                type="text"
                                placeholder="Ex: Cardiologia"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={nome}
                                onChange={e => setNome(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-bold transition-colors">Cancelar</button>
                            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2">
                                {saving ? 'Salvando...' : <><Save size={18}/> Salvar</>}
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
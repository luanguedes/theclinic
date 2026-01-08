import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Search, UserCog, Plus, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';

export default function Operadores() {
  const { api } = useAuth();
  const navigate = useNavigate();
  
  const [operadores, setOperadores] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOperadores = async () => {
    try {
        let pageSize = 15;
        try {
            const conf = await api.get('operadores/config/');
            if (conf.data?.itens_por_pagina) pageSize = conf.data.itens_por_pagina;
        } catch {}

        const res = await api.get(`operadores/listar/?page=${page}&page_size=${pageSize}&search=${search}`);
        const lista = res.data.results || res.data;
        
        if (Array.isArray(lista)) {
            setOperadores(lista);
            setTotalPages(res.data.count ? Math.ceil(res.data.count / pageSize) : 1);
        } else {
            setOperadores([]);
        }
    } catch (e) { setOperadores([]); }
  };

  useEffect(() => { if (api) fetchOperadores(); }, [page, search, api]);

  const handleExcluir = async (id) => {
    if (confirm('Tem certeza que deseja excluir?')) {
        try {
            await api.delete(`operadores/${id}/`);
            fetchOperadores();
        } catch (error) { alert('Erro ao excluir.'); }
    }
  };

  // CLASSE DOS BOTÕES DE PAGINAÇÃO (Branco no claro, Escuro no dark)
  const paginationBtnClass = "p-2 border rounded-lg transition-colors disabled:opacity-50 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700";

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-3 rounded-xl text-white shadow"><UserCog size={28}/></div>
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Operadores</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie o acesso ao sistema.</p>
            </div>
          </div>
          <button onClick={() => navigate('/operadores/novo')} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md active:scale-95">
            <Plus size={20}/> Novo Operador
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
            <div className="relative">
                <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none text-slate-700 dark:text-white"/>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
              <tr>
                {/* COLUNAS SEPARADAS AGORA */}
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4 text-center">Usuário</th>
                <th className="px-6 py-4 text-center">Tipo</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {operadores.map(op => (
                <tr key={op.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    {/* DADOS SEPARADOS */}
                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-white">
                        {op.first_name}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {op.email}
                    </td>
                    
                    <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-300">{op.username}</td>
                    
                    <td className="px-6 py-4 text-center">
                        {op.is_superuser ? <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-bold">ADMIN</span> : <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-full font-bold">OPERADOR</span>}
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={() => navigate(`/operadores/${op.id}`)} title="Editar" className="p-2 bg-transparent text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                                <Pencil size={18} />
                            </button>
                            <button onClick={() => handleExcluir(op.id)} title="Excluir" className="p-2 bg-transparent text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-slate-500">
            <span>Página {page} de {totalPages}</span>
            <div className="flex gap-2">
                <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className={paginationBtnClass}><ChevronLeft size={16}/></button>
                <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className={paginationBtnClass}><ChevronRight size={16}/></button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
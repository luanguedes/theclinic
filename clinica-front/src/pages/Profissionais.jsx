import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Pencil, Trash2, Stethoscope } from 'lucide-react';

export default function Profissionais() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [profissionais, setProfissionais] = useState([]);
  const [search, setSearch] = useState('');

  // --- FUNÇÃO AUXILIAR PARA FORMATAR O CPF NA TELA ---
  const formatCPF = (cpf) => {
    if (!cpf) return '';
    const v = cpf.replace(/\D/g, ''); // Remove tudo que não é dígito
    return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  useEffect(() => {
    if(api) api.get(`profissionais/?search=${search}`).then(res => setProfissionais(res.data.results || res.data));
  }, [api, search]);

  const handleExcluir = async (id) => {
    if(confirm("Excluir profissional?")) {
        await api.delete(`profissionais/${id}/`);
        setProfissionais(prev => prev.filter(p => p.id !== id));
    }
  }

  const actionBtnClass = "p-2 bg-transparent rounded-lg transition-colors";
  const editBtnClass = `${actionBtnClass} text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30`;
  const deleteBtnClass = `${actionBtnClass} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30`;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex gap-2"><Stethoscope/> Profissionais</h1>
            <button onClick={()=>navigate('/profissionais/novo')} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex gap-2"><UserPlus size={20}/> Novo Profissional</button>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border mb-6 border-slate-200 dark:border-slate-700 relative">
            <Search className="absolute left-7 top-7 text-slate-400" size={18} />
            <input placeholder="Buscar por nome ou CPF..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none dark:text-white"/>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300">
                    <tr><th className="px-6 py-4">Nome</th><th className="px-6 py-4">Especialidades</th><th className="px-6 py-4 text-right">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {profissionais.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="px-6 py-4 font-medium text-slate-700 dark:text-white">
                                {p.nome}
                                <br/>
                                {/* APLICAÇÃO DA MÁSCARA AQUI */}
                                <span className="text-xs text-slate-400">{formatCPF(p.cpf)}</span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                    {p.especialidades.map((esp, i) => (
                                        <span key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                {esp.nome_especialidade}
                                            </span>
                                            <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                                {esp.sigla_conselho}/{esp.uf_conselho}-{esp.registro_conselho}
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                <button onClick={()=>navigate(`/profissionais/${p.id}`)} className={editBtnClass}><Pencil size={18}/></button>
                                <button onClick={()=>handleExcluir(p.id)} className={deleteBtnClass}><Trash2 size={18}/></button>
                            </td>
                        </tr>
                    ))}
                    {profissionais.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-slate-400">Nenhum profissional encontrado.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>
    </Layout>
  );
}
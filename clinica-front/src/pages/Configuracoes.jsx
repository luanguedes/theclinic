import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { Settings, Save } from 'lucide-react';

export default function Configuracoes() {
  const { api } = useAuth();
  const [itensPorPagina, setItensPorPagina] = useState(15);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (api) {
        api.get('operadores/config/')
           .then(res => setItensPorPagina(res.data.itens_por_pagina))
           .catch(() => console.log("Usando padrão"));
    }
  }, [api]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('operadores/config/', { itens_por_pagina: itensPorPagina });
      alert('Configuração salva!');
    } catch (error) { alert('Erro ao salvar.'); } 
    finally { setLoading(false); }
  };

  if (!api) return <div>Carregando...</div>;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center space-x-3">
            <div className="bg-slate-700 p-3 rounded-xl text-white shadow"><Settings size={28}/></div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Configurações</h1>
        </div>
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Itens por página</label>
            <div className="flex gap-4">
                <input type="number" value={itensPorPagina} onChange={e => setItensPorPagina(e.target.value)} className="w-32 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 dark:text-white"/>
                <button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex gap-2">
                    <Save size={20}/> Salvar
                </button>
            </div>
        </div>
      </div>
    </Layout>
  );
}
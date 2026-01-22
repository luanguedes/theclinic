import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { Upload, Database, Loader2 } from 'lucide-react';

export default function ImportacaoTabelas() {
  const { api } = useAuth();
  const { notify } = useNotification();

  const [tipo, setTipo] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [arquivoNome, setArquivoNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setArquivo(file);
    setArquivoNome(file ? file.name : '');
  };

  const resetForm = () => {
    setTipo('');
    setArquivo(null);
    setArquivoNome('');
    setFileKey((prev) => prev + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tipo) return notify.warning("Selecione o tipo de importacao.");
    if (!arquivo) return notify.warning("Selecione um arquivo para importar.");

    const formData = new FormData();
    formData.append('tipo', tipo);
    formData.append('arquivo', arquivo);

    setLoading(true);
    try {
      const endpoint = tipo === 'cids'
        ? 'configuracoes/cids/importar/'
        : 'configuracoes/importacao/tabelas/';
      await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      notify.success("Importacao concluida com sucesso.");
      resetForm();
    } catch (error) {
      const msg = error?.response?.data?.error || "Erro ao importar tabela.";
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto pb-20">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg shadow-slate-900/20">
            <Database size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Importacao de Tabelas</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Sistema &gt; Importacao</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[28px] p-8 space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">Tipo de Importacao</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-bold text-slate-700 dark:text-slate-200"
            >
              <option value="">Selecione...</option>
              <option value="medicamentos">Medicamentos</option>
              <option value="exames">Exames (TUSS)</option>
              <option value="cids">CIDs</option>
            </select>
          </div>

          <div className={`transition-all ${!tipo ? 'opacity-50 pointer-events-none' : ''}`}>
            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">Arquivo CSV ou XLSX</label>
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <input
                key={fileKey}
                id="importacao-arquivo"
                type="file"
                accept=".csv,.xlsx,.xls,.zip"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="importacao-arquivo"
                className="w-full h-12 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <span className={`truncate ${arquivoNome ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>
                  {arquivoNome || 'Selecionar arquivo (.csv, .xlsx, .xls, .zip)'}
                </span>
                <span className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                  Escolher
                </span>
              </label>
              <button
                type="submit"
                disabled={!arquivo || loading}
                className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                {loading ? 'Importando...' : 'Importar'}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-2">
              Selecione o tipo de importacao para habilitar o upload.
            </p>
          </div>
        </form>
      </div>
    </Layout>
  );
}

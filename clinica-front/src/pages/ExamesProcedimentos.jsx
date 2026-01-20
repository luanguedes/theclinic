import React from 'react';
import Layout from '../components/Layout';
import { ClipboardList } from 'lucide-react';

export default function ExamesProcedimentos() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto pb-20">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg shadow-slate-900/20">
            <ClipboardList size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Exames e Procedimentos</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Modulo em preparacao</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[28px] p-8 text-slate-500 text-sm font-medium">
          Esta tela sera configurada quando iniciarmos o cadastro oficial de exames e procedimentos.
        </div>
      </div>
    </Layout>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
    Users, UserPlus, Pencil, Trash2, Shield, Stethoscope, Loader2
} from 'lucide-react';

export default function Operadores() {
    const { api } = useAuth();
    const { notify, confirmDialog } = useNotification();
    const navigate = useNavigate();
    
    const [operadores, setOperadores] = useState([]);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (api) loadData();
    }, [api]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get('operadores/');
            const data = res.data.results || res.data;
            setOperadores(Array.isArray(data) ? data : []);
        } catch (error) {
            notify.error("Não foi possível carregar a lista de operadores.");
            setOperadores([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        // Mudança para o padrão 'danger' e mensagens mais claras
        const confirmado = await confirmDialog(
            "Deseja realmente remover o acesso deste operador? Ele não poderá mais entrar no sistema.", 
            "Excluir Operador", 
            "Confirmar Exclusão", 
            "Cancelar", 
            "danger"
        );

        if (confirmado) {
            try {
                await api.delete(`operadores/${id}/`);
                notify.success("Operador removido com sucesso.");
                loadData();
            } catch (error) {
                notify.error("Erro ao excluir operador. Verifique se existem registros vinculados.");
            }
        }
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
                            <Users className="text-blue-600" size={28}/> Gestão de Operadores
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie usuários, acessos e permissões da equipe.</p>
                    </div>
                    <button 
                        onClick={() => navigate('/operadores/novo')} 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                        <UserPlus size={20}/> Novo Operador
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4">Nome / Usuário</th>
                                    <th className="px-6 py-4">Profissional Vinculado</th>
                                    <th className="px-6 py-4">Módulos de Acesso</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="p-12 text-center">
                                            <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" size={32}/>
                                            <span className="text-slate-400 font-medium">Carregando operadores...</span>
                                        </td>
                                    </tr>
                                ) : operadores.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-12 text-center text-slate-400 italic">
                                            Nenhum operador encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    operadores.map(op => (
                                        <tr key={op.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-700 dark:text-white uppercase text-xs tracking-tight">{op.first_name || 'Sem nome'}</div>
                                                <div className="text-xs text-slate-400 font-mono">{op.username}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {op.profissional_nome ? (
                                                    <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg text-[10px] font-black uppercase border border-blue-100 dark:border-blue-800 flex items-center gap-1 w-fit">
                                                        <Stethoscope size={12}/> {op.profissional_nome}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 dark:text-slate-600 text-xs italic">Acesso Administrativo</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {op.is_superuser ? (
                                                        <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1 shadow-sm"><Shield size={10}/> Admin Total</span>
                                                    ) : (
                                                        <>
                                                            {op.acesso_cadastros && <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter">Cadastros</span>}
                                                            {op.acesso_agendamento && <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter">Recepção</span>}
                                                            {op.acesso_atendimento && <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter">Médico</span>}
                                                            {op.acesso_faturamento && <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter">Financeiro</span>}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button 
                                                    onClick={() => navigate(`/operadores/editar/${op.id}`)} 
                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                    title="Editar Operador"
                                                >
                                                    <Pencil size={18}/>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(op.id)} 
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                    title="Excluir Operador"
                                                >
                                                    <Trash2 size={18}/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
    Users, UserPlus, Pencil, Trash2, Shield, Search 
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
            notify.error("Erro ao carregar operadores.");
            setOperadores([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (await confirmDialog("Excluir este operador?", "Exclusão", "Sim, excluir", "Cancelar")) {
            try {
                await api.delete(`operadores/${id}/`);
                loadData();
                notify.success("Operador removido.");
            } catch (error) {
                notify.error("Erro ao excluir.");
            }
        }
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Users className="text-blue-600"/> Gestão de Operadores
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie o acesso e permissões da equipe.</p>
                    </div>
                    {/* BOTÃO QUE NAVEGA PARA A PÁGINA DE CADASTRO */}
                    <button onClick={() => navigate('/operadores/novo')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95">
                        <UserPlus size={20}/> Novo Operador
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 text-xs uppercase font-bold">
                            <tr>
                                <th className="px-6 py-4">Nome / Usuário</th>
                                <th className="px-6 py-4">Profissional Vinculado</th>
                                <th className="px-6 py-4">Permissões</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {operadores.map(op => (
                                <tr key={op.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-700 dark:text-white">{op.first_name || 'Sem nome'}</div>
                                        <div className="text-xs text-slate-500">{op.username}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                    {op.profissional_nome ? (
                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold border border-blue-100 flex items-center gap-1 w-fit">
                                            <Stethoscope size={12}/> {op.profissional_nome}
                                        </span>
                                        ) : (
                                        <span className="text-slate-400 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {op.is_superuser ? (
                                                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><Shield size={10}/> Admin Total</span>
                                            ) : (
                                                <>
                                                    {op.acesso_cadastros && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Cadastros</span>}
                                                    {op.acesso_agendamento && <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Recepção</span>}
                                                    {op.acesso_atendimento && <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold">Atendimento</span>}
                                                    {op.acesso_faturamento && <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">Financeiro</span>}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => navigate(`/operadores/editar/${op.id}`)} className="text-blue-600 hover:bg-blue-50 p-2 rounded"><Pencil size={18}/></button>
                                        <button onClick={() => handleDelete(op.id)} className="text-red-600 hover:bg-red-50 p-2 rounded"><Trash2 size={18}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
}
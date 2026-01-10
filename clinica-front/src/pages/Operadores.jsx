import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { 
    Users, UserPlus, Pencil, Trash2, Shield, Search, X, Save, Check 
} from 'lucide-react';

export default function Operadores() {
    const { api, user } = useAuth();
    const { notify, confirmDialog } = useNotification();
    
    const [operadores, setOperadores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        first_name: '',
        username: '',
        email: '',
        password: '',
        is_superuser: false,
        acesso_agendamento: false,
        acesso_atendimento: false,
        acesso_faturamento: false,
        acesso_cadastros: false // <--- NOVO CAMPO
    });

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

    const handleOpenModal = (op = null) => {
        if (op) {
            setEditingId(op.id);
            setForm({
                first_name: op.first_name || '',
                username: op.username,
                email: op.email || '',
                password: '', // Senha em branco na edição
                is_superuser: op.is_superuser,
                acesso_agendamento: op.acesso_agendamento,
                acesso_atendimento: op.acesso_atendimento,
                acesso_faturamento: op.acesso_faturamento,
                acesso_cadastros: op.acesso_cadastros // <--- Carrega valor
            });
        } else {
            setEditingId(null);
            setForm({
                first_name: '', username: '', email: '', password: '',
                is_superuser: false,
                acesso_agendamento: false, acesso_atendimento: false, 
                acesso_faturamento: false, acesso_cadastros: false
            });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validação simples
        if (!editingId && !form.password) {
            return notify.warning("Defina uma senha para o novo operador.");
        }

        try {
            const payload = { ...form };
            if (!payload.password) delete payload.password; // Remove senha vazia na edição

            if (editingId) {
                await api.put(`operadores/${editingId}/`, payload);
                notify.success("Operador atualizado!");
            } else {
                await api.post('operadores/', payload);
                notify.success("Operador criado!");
            }
            setModalOpen(false);
            loadData();
        } catch (error) {
            notify.error("Erro ao salvar. Verifique se o usuário já existe.");
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

    const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white";
    const checkboxClass = "w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600";

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
                    <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95">
                        <UserPlus size={20}/> Novo Operador
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 text-xs uppercase font-bold">
                            <tr>
                                <th className="px-6 py-4">Nome / Usuário</th>
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
                                        <div className="flex flex-wrap gap-1">
                                            {op.is_superuser ? (
                                                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><Shield size={10}/> Admin Total</span>
                                            ) : (
                                                <>
                                                    {op.acesso_cadastros && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Cadastros</span>}
                                                    {op.acesso_agendamento && <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Recepção</span>}
                                                    {op.acesso_atendimento && <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold">Médico</span>}
                                                    {op.acesso_faturamento && <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">Financeiro</span>}
                                                    {!op.acesso_cadastros && !op.acesso_agendamento && !op.acesso_atendimento && !op.acesso_faturamento && <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs">Sem acesso</span>}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => handleOpenModal(op)} className="text-blue-600 hover:bg-blue-50 p-2 rounded"><Pencil size={18}/></button>
                                        <button onClick={() => handleDelete(op.id)} className="text-red-600 hover:bg-red-50 p-2 rounded"><Trash2 size={18}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* MODAL */}
                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="bg-slate-100 dark:bg-slate-900/50 p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="font-bold text-lg dark:text-white">{editingId ? 'Editar Operador' : 'Novo Operador'}</h3>
                                <button onClick={() => setModalOpen(false)}><X className="text-slate-400"/></button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-slate-500 mb-1 block">Nome</label><input required value={form.first_name} onChange={e=>setForm({...form, first_name: e.target.value})} className={inputClass}/></div>
                                    <div><label className="text-xs font-bold text-slate-500 mb-1 block">Usuário (Login)</label><input required value={form.username} onChange={e=>setForm({...form, username: e.target.value})} className={inputClass}/></div>
                                </div>
                                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Email</label><input type="email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className={inputClass}/></div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Senha {editingId && '(Deixe em branco para manter)'}</label>
                                    <input type="password" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} className={inputClass} placeholder="******"/>
                                </div>

                                <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mt-2">
                                    <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Permissões de Acesso</p>
                                    
                                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer mb-2 border-purple-100 dark:border-purple-900/30">
                                        <input type="checkbox" checked={form.is_superuser} onChange={e=>setForm({...form, is_superuser: e.target.checked})} className={checkboxClass}/>
                                        <div>
                                            <span className="block font-bold text-sm text-purple-700 dark:text-purple-400">Administrador Total</span>
                                            <span className="text-xs text-slate-500">Acesso irrestrito a configurações e sistema.</span>
                                        </div>
                                    </label>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* AQUI ESTÁ O NOVO CHECKBOX */}
                                        <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                                            <input type="checkbox" checked={form.acesso_cadastros} onChange={e=>setForm({...form, acesso_cadastros: e.target.checked})} className={checkboxClass} disabled={form.is_superuser}/>
                                            <span className="text-sm font-medium dark:text-slate-300">Gestão de Cadastros</span>
                                        </label>

                                        <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                                            <input type="checkbox" checked={form.acesso_agendamento} onChange={e=>setForm({...form, acesso_agendamento: e.target.checked})} className={checkboxClass} disabled={form.is_superuser}/>
                                            <span className="text-sm font-medium dark:text-slate-300">Recepção / Agenda</span>
                                        </label>
                                        
                                        <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                                            <input type="checkbox" checked={form.acesso_atendimento} onChange={e=>setForm({...form, acesso_atendimento: e.target.checked})} className={checkboxClass} disabled={form.is_superuser}/>
                                            <span className="text-sm font-medium dark:text-slate-300">Área Médica</span>
                                        </label>

                                        <label className="flex items-center gap-2 p-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                                            <input type="checkbox" checked={form.acesso_faturamento} onChange={e=>setForm({...form, acesso_faturamento: e.target.checked})} className={checkboxClass} disabled={form.is_superuser}/>
                                            <span className="text-sm font-medium dark:text-slate-300">Financeiro</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 gap-3">
                                    <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
                                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg">
                                        <Save size={18}/> Salvar Operador
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
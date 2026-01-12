import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { 
    Search, UserPlus, Shield, Pencil, Trash2, Save, X, 
    Check, Loader2, UserCog, Lock, Eye, EyeOff, LayoutDashboard, 
    Calendar, Stethoscope, DollarSign
} from 'lucide-react';

export default function Operadores() {
    const { api, user } = useAuth();
    const { notify, confirmDialog } = useNotification();

    const [operadores, setOperadores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados do Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);

    const formInicial = {
        username: '',
        first_name: '',
        email: '',
        password: '',
        is_superuser: false,
        acesso_agendamento: false,
        acesso_atendimento: false,
        acesso_faturamento: false,
        acesso_cadastros: false
    };
    const [form, setForm] = useState(formInicial);

    useEffect(() => {
        if (api) fetchOperadores();
    }, [api]);

    const fetchOperadores = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('operadores/');
            setOperadores(Array.isArray(data) ? data : data.results);
        } catch (error) {
            notify.error("Erro ao carregar operadores.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form };
            if (editingId) {
                // Se não digitou senha na edição, remove o campo para não sobrescrever
                if (!payload.password) delete payload.password;
                await api.put(`operadores/${editingId}/`, payload);
                notify.success("Operador atualizado!");
            } else {
                if (!payload.password) throw new Error("Senha é obrigatória.");
                await api.post('operadores/', payload);
                notify.success("Operador criado!");
            }
            setIsModalOpen(false);
            fetchOperadores();
        } catch (error) {
            notify.error(error.message || "Erro ao salvar operador.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const confirm = await confirmDialog("Remover este operador permanentemente?", "Exclusão", "Sim, Remover", "Cancelar", "danger");
        if (confirm) {
            try {
                await api.delete(`operadores/${id}/`);
                notify.success("Operador removido.");
                fetchOperadores();
            } catch (e) { notify.error("Erro ao excluir."); }
        }
    };

    const openModal = (op = null) => {
        if (op) {
            setEditingId(op.id);
            setForm({ ...op, password: '' }); // Limpa senha para não exibir hash
        } else {
            setEditingId(null);
            setForm(formInicial);
        }
        setShowPassword(false);
        setIsModalOpen(true);
    };

    const togglePermissao = (campo) => {
        setForm(prev => ({ ...prev, [campo]: !prev[campo] }));
    };

    const filtered = operadores.filter(op => 
        op.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        op.first_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const PermissionSwitch = ({ label, icon: Icon, field, checked }) => (
        <div onClick={() => !form.is_superuser && togglePermissao(field)} 
             className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${form.is_superuser ? 'opacity-50 pointer-events-none bg-slate-50 border-slate-200' : checked ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${checked || form.is_superuser ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Icon size={18}/>
                </div>
                <span className={`text-xs font-bold uppercase tracking-wide ${checked || form.is_superuser ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${checked || form.is_superuser ? 'bg-blue-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${checked || form.is_superuser ? 'left-6' : 'left-1'}`}></div>
            </div>
        </div>
    );

    const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold dark:text-white transition-all";

    return (
        <Layout>
            <div className="max-w-6xl mx-auto pb-20">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                            <Shield className="text-blue-600"/> Gestão de Operadores
                        </h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Controle de acesso e segurança</p>
                    </div>
                    <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center gap-2 active:scale-95 transition-all">
                        <UserPlus size={18}/> Novo Operador
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                        <input 
                            placeholder="Buscar por nome ou usuário..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full pl-12 bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40}/></div>
                    ) : filtered.map(op => (
                        <div key={op.id} className="bg-white dark:bg-slate-800 rounded-[24px] p-6 shadow-sm border border-slate-200 dark:border-slate-700 relative group hover:shadow-lg transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg ${op.is_superuser ? 'bg-slate-900' : 'bg-blue-600'}`}>
                                        {op.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm">{op.first_name || op.username}</h3>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${op.is_superuser ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {op.is_superuser ? 'Administrador' : 'Operador'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(op)} className="p-2 hover:bg-slate-100 rounded-lg text-blue-600"><Pencil size={16}/></button>
                                    {!op.is_superuser && <button onClick={() => handleDelete(op.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16}/></button>}
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                    <Shield size={14} className={op.is_superuser ? 'text-slate-900' : 'text-slate-300'}/>
                                    {op.is_superuser ? 'Acesso Irrestrito (Root)' : 'Permissões Limitadas'}
                                </div>
                                {!op.is_superuser && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {op.acesso_agendamento && <span className="px-2 py-1 bg-green-50 text-green-700 text-[9px] font-black uppercase rounded border border-green-100">Agenda</span>}
                                        {op.acesso_atendimento && <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[9px] font-black uppercase rounded border border-purple-100">Médico</span>}
                                        {op.acesso_faturamento && <span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-[9px] font-black uppercase rounded border border-yellow-100">Financeiro</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* MODAL */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/10">
                            <div className="bg-slate-50 dark:bg-slate-900 p-6 flex justify-between items-center border-b dark:border-slate-700">
                                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    <UserCog className="text-blue-600"/> {editingId ? 'Editar Operador' : 'Novo Operador'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><X size={20}/></button>
                            </div>
                            
                            <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Usuário (Login)</label><input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className={inputClass} required disabled={!!editingId}/></div>
                                    <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome Completo</label><input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className={inputClass} required/></div>
                                </div>
                                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">E-mail</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inputClass} /></div>
                                
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Senha {editingId && '(Deixe em branco para manter)'}</label>
                                    <div className="relative">
                                        <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className={inputClass} required={!editingId}/>
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-blue-600"><ShowIcon show={showPassword}/></button>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t dark:border-slate-700">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Níveis de Acesso</p>
                                    
                                    <div onClick={() => setForm(prev => ({ ...prev, is_superuser: !prev.is_superuser }))} 
                                         className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${form.is_superuser ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                        <div className="flex items-center gap-3">
                                            <Shield size={18} className={form.is_superuser ? 'text-yellow-400' : 'text-slate-400'}/>
                                            <span className="text-xs font-bold uppercase tracking-wide">Administrador Total (Root)</span>
                                        </div>
                                        {form.is_superuser && <Check size={16} className="text-green-400"/>}
                                    </div>

                                    {!form.is_superuser && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <PermissionSwitch label="Recepção" icon={Calendar} field="acesso_agendamento" checked={form.acesso_agendamento} />
                                            <PermissionSwitch label="Médico" icon={Stethoscope} field="acesso_atendimento" checked={form.acesso_atendimento} />
                                            <PermissionSwitch label="Financeiro" icon={DollarSign} field="acesso_faturamento" checked={form.acesso_faturamento} />
                                            <PermissionSwitch label="Cadastros" icon={LayoutDashboard} field="acesso_cadastros" checked={form.acesso_cadastros} />
                                        </div>
                                    )}
                                </div>

                                <button disabled={saving} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex justify-center gap-2">
                                    {saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Salvar Operador
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

const ShowIcon = ({ show }) => show ? <EyeOff size={18}/> : <Eye size={18}/>;
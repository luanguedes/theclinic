import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
    User, Phone, Mail, MapPin, Save, ArrowLeft, 
    Stethoscope, FileText, Check, Loader2, Award, Briefcase
} from 'lucide-react';

export default function ProfissionalForm() {
    const { api } = useAuth();
    const { notify } = useNotification();
    const navigate = useNavigate();
    const { id } = useParams();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Listas Auxiliares
    const [especialidadesDisponiveis, setEspecialidadesDisponiveis] = useState([]);

    const formInicial = {
        nome: '',
        registro_profissional: '', // CRM/CRO
        cpf: '',
        email: '',
        telefone: '',
        especialidades: [] // Array de IDs
    };
    const [form, setForm] = useState(formInicial);

    useEffect(() => {
        if (api) {
            carregarEspecialidades();
            if (id) carregarProfissional();
        }
    }, [api, id]);

    const carregarEspecialidades = async () => {
        try {
            const { data } = await api.get('configuracoes/especialidades/');
            setEspecialidadesDisponiveis(Array.isArray(data) ? data : data.results);
        } catch (error) {
            notify.error("Erro ao carregar lista de especialidades.");
        }
    };

    const carregarProfissional = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`profissionais/${id}/`);
            // Ajuste para garantir que especialidades seja um array de IDs para o formulário
            const specsIds = data.especialidades.map(e => e.id || e.especialidade_id || e);
            setForm({ ...data, especialidades: specsIds });
        } catch (error) {
            notify.error("Erro ao carregar dados do profissional.");
            navigate('/profissionais');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const toggleEspecialidade = (specId) => {
        setForm(prev => {
            const exists = prev.especialidades.includes(specId);
            if (exists) {
                return { ...prev, especialidades: prev.especialidades.filter(id => id !== specId) };
            } else {
                return { ...prev, especialidades: [...prev.especialidades, specId] };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nome || !form.registro_profissional) {
            return notify.warning("Nome e Registro Profissional são obrigatórios.");
        }
        
        setSaving(true);
        try {
            if (id) {
                await api.put(`profissionais/${id}/`, form);
                notify.success("Dados atualizados com sucesso!");
            } else {
                await api.post('profissionais/', form);
                notify.success("Profissional cadastrado com sucesso!");
            }
            navigate('/profissionais');
        } catch (error) {
            console.error(error);
            notify.error("Erro ao salvar profissional. Verifique os dados.");
        } finally {
            setSaving(false);
        }
    };

    const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold dark:text-white transition-all";
    const labelClass = "block text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest";

    return (
        <Layout>
            <div className="max-w-4xl mx-auto pb-20">
                <button onClick={() => navigate('/profissionais')} className="mb-6 flex items-center gap-2 text-slate-500 font-bold hover:text-blue-600 transition-colors text-sm">
                    <ArrowLeft size={18}/> Voltar para Lista
                </button>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                            <Stethoscope className="text-blue-600"/> {id ? 'Editar Profissional' : 'Novo Profissional'}
                        </h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Dados cadastrais e especialidades</p>
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40}/></div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* BLOCO 1: IDENTIFICAÇÃO */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b dark:border-slate-700">
                                <User size={20} className="text-blue-500"/>
                                <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-wide">Dados Pessoais</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className={labelClass}>Nome Completo</label>
                                    <input name="nome" value={form.nome} onChange={handleChange} className={inputClass} required placeholder="Ex: Dr. João Silva"/>
                                </div>
                                <div>
                                    <label className={labelClass}>CPF</label>
                                    <input name="cpf" value={form.cpf} onChange={handleChange} className={inputClass} placeholder="000.000.000-00"/>
                                </div>
                                <div>
                                    <label className={labelClass}>Registro Profissional (CRM/CRO)</label>
                                    <div className="relative">
                                        <Award className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                                        <input name="registro_profissional" value={form.registro_profissional} onChange={handleChange} className={`${inputClass} pl-10`} required placeholder="Ex: 123456-SP"/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BLOCO 2: CONTATO */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b dark:border-slate-700">
                                <Phone size={20} className="text-green-500"/>
                                <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-wide">Contato</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>Telefone / Celular</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                                        <input name="telefone" value={form.telefone} onChange={handleChange} className={`${inputClass} pl-10`} placeholder="(00) 00000-0000"/>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>E-mail Corporativo</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                                        <input type="email" name="email" value={form.email} onChange={handleChange} className={`${inputClass} pl-10`} placeholder="medico@clinica.com"/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BLOCO 3: ESPECIALIDADES */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b dark:border-slate-700">
                                <Briefcase size={20} className="text-purple-500"/>
                                <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-wide">Áreas de Atuação</h3>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {especialidadesDisponiveis.map(spec => {
                                    const isSelected = form.especialidades.includes(spec.id);
                                    return (
                                        <div 
                                            key={spec.id} 
                                            onClick={() => toggleEspecialidade(spec.id)}
                                            className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center gap-2 ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-700 hover:border-blue-200'}`}
                                        >
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                                                {isSelected && <Check size={12} className="text-white"/>}
                                            </div>
                                            <span className={`text-xs font-bold uppercase ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}`}>
                                                {spec.nome || spec.nome_especialidade}
                                            </span>
                                        </div>
                                    );
                                })}
                                {especialidadesDisponiveis.length === 0 && (
                                    <div className="col-span-full text-center py-8 text-slate-400 text-xs uppercase font-bold border-2 border-dashed rounded-2xl">
                                        Nenhuma especialidade cadastrada no sistema.
                                        <br/>Vá em Configurações > Especialidades para adicionar.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50">
                                {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} 
                                {id ? 'Salvar Alterações' : 'Cadastrar Profissional'}
                            </button>
                        </div>

                    </form>
                )}
            </div>
        </Layout>
    );
}
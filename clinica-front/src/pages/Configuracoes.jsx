import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { 
    Building2, Users, CreditCard, Save, Plus, Trash2, Pencil, 
    Shield, Check, X, Loader2 
} from 'lucide-react';

export default function Configuracoes() {
    const { api, user } = useAuth();
    const [activeTab, setActiveTab] = useState('clinica');
    const [loading, setLoading] = useState(false);

    // --- ESTADOS: DADOS DA CLÍNICA ---
    const [clinica, setClinica] = useState({
        nome_fantasia: '', razao_social: '', cnpj: '',
        telefone: '', email: '',
        logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: ''
    });
    const [logoPreview, setLogoPreview] = useState(null);
    const [logoFile, setLogoFile] = useState(null);

    // --- ESTADOS: CONVÊNIOS ---
    const [convenios, setConvenios] = useState([]);
    const [modalConvenioOpen, setModalConvenioOpen] = useState(false);
    const [editConvenio, setEditConvenio] = useState(null);
    const [nomeConvenio, setNomeConvenio] = useState('');

    // --- ESTADOS: OPERADORES ---
    const [operadores, setOperadores] = useState([]);

    // --- CARREGAMENTO INICIAL ---
    useEffect(() => {
        if (api) {
            if (activeTab === 'clinica') loadClinica();
            if (activeTab === 'convenios') loadConvenios();
            if (activeTab === 'operadores') loadOperadores();
        }
    }, [api, activeTab]);

    // --- FUNÇÕES DE CARREGAMENTO (BLINDADAS) ---
    const loadClinica = async () => {
        setLoading(true);
        try {
            const res = await api.get('configuracoes/clinica/');
            if (res.data) {
                setClinica(res.data);
                if (res.data.logo) setLogoPreview(res.data.logo);
            }
        } catch (error) {
            console.log("Dados da clínica ainda não configurados ou erro API.");
        } finally {
            setLoading(false);
        }
    };

    const loadConvenios = async () => {
        setLoading(true);
        try {
            const res = await api.get('configuracoes/convenios/');
            const data = res.data.results || res.data;
            setConvenios(Array.isArray(data) ? data : []);
        } catch (error) {
            setConvenios([]);
        } finally {
            setLoading(false);
        }
    };

    const loadOperadores = async () => {
        setLoading(true);
        try {
            const res = await api.get('operadores/');
            const data = res.data.results || res.data;
            setOperadores(Array.isArray(data) ? data : []);
        } catch (error) {
            setOperadores([]);
        } finally {
            setLoading(false);
        }
    };

    // --- SALVAR CLÍNICA ---
    const handleSaveClinica = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            Object.keys(clinica).forEach(key => {
                if(clinica[key]) formData.append(key, clinica[key]);
            });
            if (logoFile) {
                formData.append('logo', logoFile);
            }

            // Tenta POST, se der erro tenta PUT (ou vice-versa dependendo da sua API)
            // Geralmente se usa um endpoint que aceita POST para criar/atualizar
            try {
                await api.post('configuracoes/clinica/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } catch (err) {
                 await api.put('configuracoes/clinica/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            alert("Dados salvos com sucesso!");
        } catch (error) {
            alert("Erro ao salvar dados da clínica.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    // --- AÇÕES CONVÊNIOS ---
    const handleSaveConvenio = async (e) => {
        e.preventDefault();
        try {
            if (editConvenio) {
                await api.put(`configuracoes/convenios/${editConvenio.id}/`, { nome: nomeConvenio });
            } else {
                await api.post('configuracoes/convenios/', { nome: nomeConvenio });
            }
            setModalConvenioOpen(false);
            setNomeConvenio('');
            setEditConvenio(null);
            loadConvenios();
        } catch (error) {
            alert("Erro ao salvar convênio.");
        }
    };

    const handleDeleteConvenio = async (id) => {
        if (window.confirm("Excluir convênio?")) {
            try {
                await api.delete(`configuracoes/convenios/${id}/`);
                loadConvenios();
            } catch (error) {
                alert("Erro ao excluir.");
            }
        }
    };

    const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white";

    return (
        <Layout>
            <div className="max-w-5xl mx-auto pb-20">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Configurações</h1>

                {/* ABAS */}
                <div className="flex overflow-x-auto gap-2 mb-6 border-b border-slate-200 dark:border-slate-700 pb-1">
                    <button onClick={()=>setActiveTab('clinica')} className={`px-4 py-2 rounded-t-lg font-bold text-sm flex items-center gap-2 transition-colors ${activeTab==='clinica' ? 'bg-white dark:bg-slate-800 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Building2 size={16}/> Dados da Clínica
                    </button>
                    <button onClick={()=>setActiveTab('convenios')} className={`px-4 py-2 rounded-t-lg font-bold text-sm flex items-center gap-2 transition-colors ${activeTab==='convenios' ? 'bg-white dark:bg-slate-800 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                        <CreditCard size={16}/> Convênios
                    </button>
                    <button onClick={()=>setActiveTab('operadores')} className={`px-4 py-2 rounded-t-lg font-bold text-sm flex items-center gap-2 transition-colors ${activeTab==='operadores' ? 'bg-white dark:bg-slate-800 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Users size={16}/> Operadores
                    </button>
                </div>

                {/* CONTEÚDO: DADOS DA CLÍNICA */}
                {activeTab === 'clinica' && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <form onSubmit={handleSaveClinica} className="space-y-4">
                            <div className="flex items-center gap-6 mb-6">
                                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 relative group">
                                    {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover"/> : <Building2 className="text-slate-300" size={32}/>}
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <label htmlFor="logo-upload" className="cursor-pointer text-white text-xs font-bold">Alterar</label>
                                    </div>
                                    <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoChange}/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg dark:text-white">Logotipo</h3>
                                    <p className="text-sm text-slate-500">Recomendado: 500x500px (PNG ou JPG)</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-slate-500">Nome Fantasia</label><input value={clinica.nome_fantasia || ''} onChange={e=>setClinica({...clinica, nome_fantasia: e.target.value})} className={inputClass}/></div>
                                <div><label className="text-xs font-bold text-slate-500">Razão Social</label><input value={clinica.razao_social || ''} onChange={e=>setClinica({...clinica, razao_social: e.target.value})} className={inputClass}/></div>
                                <div><label className="text-xs font-bold text-slate-500">CNPJ</label><input value={clinica.cnpj || ''} onChange={e=>setClinica({...clinica, cnpj: e.target.value})} className={inputClass}/></div>
                                <div><label className="text-xs font-bold text-slate-500">Telefone</label><input value={clinica.telefone || ''} onChange={e=>setClinica({...clinica, telefone: e.target.value})} className={inputClass}/></div>
                                <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500">Email</label><input value={clinica.email || ''} onChange={e=>setClinica({...clinica, email: e.target.value})} className={inputClass}/></div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                <h4 className="font-bold mb-3 dark:text-white">Endereço</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-1"><label className="text-xs font-bold text-slate-500">CEP</label><input value={clinica.cep || ''} onChange={e=>setClinica({...clinica, cep: e.target.value})} className={inputClass}/></div>
                                    <div className="md:col-span-3"><label className="text-xs font-bold text-slate-500">Logradouro</label><input value={clinica.logradouro || ''} onChange={e=>setClinica({...clinica, logradouro: e.target.value})} className={inputClass}/></div>
                                    <div className="md:col-span-1"><label className="text-xs font-bold text-slate-500">Número</label><input value={clinica.numero || ''} onChange={e=>setClinica({...clinica, numero: e.target.value})} className={inputClass}/></div>
                                    <div className="md:col-span-1"><label className="text-xs font-bold text-slate-500">Bairro</label><input value={clinica.bairro || ''} onChange={e=>setClinica({...clinica, bairro: e.target.value})} className={inputClass}/></div>
                                    <div className="md:col-span-1"><label className="text-xs font-bold text-slate-500">Cidade</label><input value={clinica.cidade || ''} onChange={e=>setClinica({...clinica, cidade: e.target.value})} className={inputClass}/></div>
                                    <div className="md:col-span-1"><label className="text-xs font-bold text-slate-500">Estado</label><input value={clinica.estado || ''} onChange={e=>setClinica({...clinica, estado: e.target.value})} className={inputClass}/></div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 disabled:opacity-50">
                                    {loading ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* CONTEÚDO: CONVÊNIOS */}
                {activeTab === 'convenios' && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <button onClick={()=>{setEditConvenio(null); setNomeConvenio(''); setModalConvenioOpen(true)}} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex gap-2">
                                <Plus size={18}/> Novo Convênio
                            </button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 text-xs uppercase font-bold">
                                    <tr><th className="px-6 py-4">Nome</th><th className="px-6 py-4 text-right">Ações</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {Array.isArray(convenios) && convenios.length > 0 ? convenios.map(c => (
                                        <tr key={c.id}>
                                            <td className="px-6 py-4 font-bold text-slate-700 dark:text-white">{c.nome}</td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button onClick={()=>{setEditConvenio(c); setNomeConvenio(c.nome); setModalConvenioOpen(true)}} className="text-blue-600 p-2 hover:bg-slate-50 rounded"><Pencil size={16}/></button>
                                                <button onClick={()=>handleDeleteConvenio(c.id)} className="text-red-600 p-2 hover:bg-slate-50 rounded"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    )) : <tr><td colSpan="2" className="p-8 text-center text-slate-400">Nenhum convênio cadastrado.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* CONTEÚDO: OPERADORES */}
                {activeTab === 'operadores' && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                         <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 text-xs uppercase font-bold">
                                    <tr><th className="px-6 py-4">Nome</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Tipo</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {Array.isArray(operadores) && operadores.map(op => (
                                        <tr key={op.id}>
                                            <td className="px-6 py-4 font-bold text-slate-700 dark:text-white">{op.first_name || op.username}</td>
                                            <td className="px-6 py-4 text-slate-500">{op.email}</td>
                                            <td className="px-6 py-4">
                                                {op.is_superuser ? 
                                                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit"><Shield size={12}/> Admin</span> : 
                                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">Operador</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL CONVÊNIO */}
            {modalConvenioOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-lg mb-4 dark:text-white">{editConvenio ? 'Editar Convênio' : 'Novo Convênio'}</h3>
                        <input 
                            value={nomeConvenio} 
                            onChange={e=>setNomeConvenio(e.target.value)} 
                            placeholder="Nome do Convênio (Ex: Unimed)"
                            className={inputClass}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={()=>setModalConvenioOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-bold">Cancelar</button>
                            <button onClick={handleSaveConvenio} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
    Search, Plus, Stethoscope, Mail, Phone, MapPin, 
    Edit, Trash2, Calendar, Clock, User, Briefcase
} from 'lucide-react';

export default function Profissionais() {
    const { api } = useAuth();
    const { notify, confirmDialog } = useNotification();
    const [profissionais, setProfissionais] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (api) fetchProfissionais();
    }, [api]);

    const fetchProfissionais = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('profissionais/');
            setProfissionais(Array.isArray(data) ? data : data.results);
        } catch (error) {
            notify.error("Erro ao carregar profissionais.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const confirm = await confirmDialog("Excluir este profissional e seus vínculos?", "Exclusão", "Sim, Excluir", "Cancelar", "danger");
        if (confirm) {
            try {
                await api.delete(`profissionais/${id}/`);
                notify.success("Profissional removido.");
                fetchProfissionais();
            } catch (e) { notify.error("Erro ao excluir."); }
        }
    };

    const filtered = profissionais.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()));

    return (
        <Layout>
            <div className="max-w-6xl mx-auto pb-20">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                            <Stethoscope className="text-blue-600"/> Corpo Clínico
                        </h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Gestão de Médicos e Especialistas</p>
                    </div>
                    <Link to="/profissionais/novo" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center gap-2 active:scale-95 transition-all">
                        <Plus size={18}/> Novo Profissional
                    </Link>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                        <input 
                            placeholder="Buscar médico por nome..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            className="w-full pl-12 bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(p => (
                        <div key={p.id} className="bg-white dark:bg-slate-800 rounded-[24px] p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-bl-[100px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            
                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-black text-xl shadow-inner">
                                        {p.nome.charAt(0)}
                                    </div>
                                    <div className="flex gap-1">
                                        <Link to={`/profissionais/${p.id}`} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"><Edit size={16}/></Link>
                                        <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                </div>

                                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight mb-1">{p.nome}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{p.registro_profissional || 'Sem Registro'}</p>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <Briefcase size={14} className="text-blue-500"/>
                                        {p.especialidades && p.especialidades.length > 0 
                                            ? p.especialidades.map(e => e.nome_especialidade).join(', ') 
                                            : 'Clínico Geral'}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <Phone size={14} className="text-slate-400"/>
                                        {p.telefone || 'Sem telefone'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
}
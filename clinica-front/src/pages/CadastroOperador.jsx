import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
  UserCog, Mail, Lock, Shield, Save, Check, Stethoscope, CalendarDays, DollarSign, KeyRound, ArrowLeft, Loader2, Search, ChevronDown, X, Users 
} from 'lucide-react';

const SearchableSelect = ({ label, options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);

    useEffect(() => { 
        const selected = options.find(o => String(o.id) === String(value)); 
        if (selected) setQuery(selected.label);
        else if (!value) setQuery('');
    }, [value, options]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                const selected = options.find(o => String(o.id) === String(value));
                setQuery(selected ? selected.label : '');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [containerRef, value, options]);

    const filtered = (query === '' || query === (options.find(o => String(o.id) === String(value))?.label)) 
        ? options 
        : options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));
    
    return (
        <div className="relative mb-4" ref={containerRef}>
            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">{label}</label>
            <div className="relative">
                <input 
                    type="text"
                    className="w-full pl-10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-400" 
                    value={query} 
                    onFocus={() => setIsOpen(true)}
                    onClick={() => setIsOpen(true)}
                    onChange={e => { setQuery(e.target.value); setIsOpen(true); }} 
                    placeholder={placeholder} autoComplete="off"
                />
                <div className="absolute left-3 top-3.5 text-slate-400"><Search size={18}/></div>
                <div className="absolute right-3 top-3.5 flex items-center gap-1 text-slate-400">
                    {value && <button type="button" onClick={(e)=>{e.stopPropagation(); onChange(null); setQuery('')}} className="hover:text-red-500 transition-colors"><X size={16}/></button>}
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
                </div>
            </div>
            {isOpen && (
                <ul className="absolute top-full mt-1 z-[100] w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-150">
                    {filtered.length > 0 ? filtered.map(opt => (
                        <li key={opt.id} onMouseDown={() => { onChange(opt.id); setQuery(opt.label); setIsOpen(false); }} className={`p-3 cursor-pointer text-sm border-b last:border-0 border-slate-50 dark:border-slate-700 flex justify-between items-center hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-200 transition-colors`}>
                            {opt.label}
                            {String(value) === String(opt.id) && <Check size={16} className="text-blue-500" strokeWidth={3}/>}
                        </li>
                    )) : <li className="p-4 text-sm text-slate-400 text-center italic">Nenhum resultado encontrado</li>}
                </ul>
            )}
        </div>
    );
};

export default function CadastroOperador() {
  const { api } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(id ? true : false);
  const [profissionais, setProfissionais] = useState([]);
  
  const [formData, setFormData] = useState({
    username: '', password: '', first_name: '', email: '',
    acesso_atendimento: false, acesso_agendamento: false, 
    acesso_faturamento: false, acesso_cadastros: false,
    is_superuser: false,
    force_password_change: true,
    profissional: null
  });

  useEffect(() => {
    if (api) {
        api.get('profissionais/').then(res => {
            const lista = res.data.results || res.data;
            setProfissionais(lista.map(p => ({ id: p.id, label: `${p.nome} (CPF: ${p.cpf})` })));
        }).catch(() => notify.error("Erro ao carregar lista de profissionais para vínculo."));

        if (id) {
            api.get(`operadores/${id}/`)
                .then(res => {
                    const data = res.data;
                    setFormData({
                        username: data.username || '',
                        first_name: data.first_name || '',
                        email: data.email || '',
                        acesso_atendimento: data.acesso_atendimento || false,
                        acesso_agendamento: data.acesso_agendamento || false,
                        acesso_faturamento: data.acesso_faturamento || false,
                        acesso_cadastros: data.acesso_cadastros || false,
                        is_superuser: data.is_superuser || false,
                        force_password_change: data.force_password_change || false,
                        profissional: data.profissional || null,
                        password: ''
                    });
                })
                .catch(() => {
                    notify.error("Operador não encontrado.");
                    navigate('/operadores');
                })
                .finally(() => setFetching(false));
        }
    }
  }, [id, api, navigate]);

  const handleChange = (e) => {
    const { name, checked, value, type } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    
    // UX Helper: Se marcar como Administrador, habilita todos os acessos
    if (name === 'is_superuser' && checked) {
        setFormData(prev => ({
            ...prev,
            is_superuser: true,
            acesso_cadastros: true,
            acesso_atendimento: true,
            acesso_agendamento: true,
            acesso_faturamento: true
        }));
    } else {
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dadosParaEnviar = { ...formData };
      
      if (!dadosParaEnviar.password) delete dadosParaEnviar.password;
      if (!dadosParaEnviar.profissional) dadosParaEnviar.profissional = null;

      if (id) {
          await api.put(`operadores/${id}/`, dadosParaEnviar);
          notify.success('Dados do operador atualizados!');
      } else {
          await api.post('operadores/', dadosParaEnviar);
          notify.success('Novo operador criado com sucesso!');
      }
      navigate('/operadores');
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.username || 'Erro ao salvar operador.';
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-400";
  const labelClass = "block text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest";

  if (fetching) return (
    <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={40}/>
            <span className="font-bold uppercase tracking-widest text-xs">Carregando perfil do operador...</span>
        </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-5xl mx-auto pb-20 tracking-tight">
        <button 
            onClick={() => navigate('/operadores')} 
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm text-xs font-black uppercase tracking-widest"
        >
            <ArrowLeft size={16}/> Voltar para lista
        </button>

        <div className="mb-10 flex items-center space-x-5">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-xl shadow-blue-500/20 text-white">
            <UserCog size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{id ? 'Editar Perfil' : 'Criar Operador'}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Controle de credenciais e níveis de privilégio no sistema.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 mb-8 flex items-center gap-2 uppercase tracking-[0.2em]">
                  <Shield size={18} className="text-blue-600"/> Identificação e Segurança
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className={labelClass}>Nome Completo do Colaborador</label>
                    <input name="first_name" value={formData.first_name} onChange={handleChange} className={inputClass.replace('pl-10', 'px-4')} placeholder="Ex: Dra. Ana Paula Silveira" required />
                  </div>

                  <div className="col-span-2">
                    <label className={labelClass}>Endereço de E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                      <input name="email" value={formData.email} type="email" onChange={handleChange} className={inputClass} placeholder="ana.paula@theclinic.com" />
                    </div>
                  </div>

                  <div className="col-span-2 pt-2">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <SearchableSelect 
                            label="Vínculo com Profissional de Saúde" 
                            placeholder="Pesquisar por nome ou CPF..." 
                            options={profissionais} 
                            value={formData.profissional}
                            onChange={(val) => setFormData({...formData, profissional: val})}
                        />
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-2 flex items-center gap-1">
                            <AlertCircle size={12} className="text-blue-500"/> Operadores vinculados têm acesso automático ao módulo de prontuários.
                        </p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <label className={labelClass}>Usuário de Acesso</label>
                    <div className="relative">
                      <UserCog className="absolute left-3 top-3.5 text-slate-400" size={18} />
                      <input name="username" value={formData.username} onChange={handleChange} className={inputClass} placeholder="ana.paula" required />
                    </div>
                  </div>

                  <div className="pt-4">
                    <label className={labelClass}>Senha {id && <span className="text-amber-500 text-[10px] ml-1">(Deixe vazio para não alterar)</span>}</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                      <input name="password" type="password" value={formData.password} onChange={handleChange} className={inputClass} placeholder="••••••••" required={!id} />
                    </div>
                  </div>
                  
                   <div className="col-span-2 mt-4">
                     <label className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${formData.force_password_change ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-slate-50 border-transparent dark:bg-slate-900/40'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${formData.force_password_change ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                <KeyRound size={20}/>
                            </div>
                            <div>
                                <span className="block text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter">Exigir Troca de Senha</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No primeiro acesso do usuário</span>
                            </div>
                        </div>
                        <input type="checkbox" name="force_password_change" checked={formData.force_password_change} onChange={handleChange} className="w-6 h-6 rounded-lg text-blue-600 border-slate-300 focus:ring-blue-500"/>
                     </label>
                   </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
                <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-[0.2em]">Permissões</h2>
                <p className="text-xs font-bold text-slate-400 mb-8 uppercase tracking-tight">Liberar acesso aos módulos:</p>

                <div className="space-y-4 flex-grow">
                  {[
                    { id: 'acesso_cadastros', label: 'Cadastros', icon: Users, color: 'text-blue-500' },
                    { id: 'acesso_agendamento', label: 'Recepção', icon: CalendarDays, color: 'text-green-500' },
                    { id: 'acesso_atendimento', label: 'Prontuário', icon: Stethoscope, color: 'text-indigo-500' },
                    { id: 'acesso_faturamento', label: 'Financeiro', icon: DollarSign, color: 'text-amber-500' }
                  ].map((perm) => (
                    <label key={perm.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${formData[perm.id] ? 'bg-slate-50 border-blue-100 dark:bg-slate-700/50' : 'bg-transparent border-transparent opacity-60'}`}>
                        <div className="flex items-center gap-3">
                            <perm.icon size={18} className={formData[perm.id] ? perm.color : 'text-slate-400'}/>
                            <span className={`text-xs font-black uppercase tracking-widest ${formData[perm.id] ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>{perm.label}</span>
                        </div>
                        <input type="checkbox" name={perm.id} checked={formData[perm.id]} onChange={handleChange} className="w-5 h-5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 transition-all"/>
                    </label>
                  ))}
                  
                  <hr className="border-slate-100 dark:border-slate-700 my-6"/>
                  
                  <label className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${formData.is_superuser ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20' : 'bg-slate-50 border-transparent opacity-60'}`}>
                        <div className="flex items-center gap-3">
                            <Shield size={20} className={formData.is_superuser ? 'text-purple-600' : 'text-slate-400'}/>
                            <span className={`text-xs font-black uppercase tracking-[0.1em] ${formData.is_superuser ? 'text-purple-900 dark:text-purple-200' : 'text-slate-400'}`}>Admin Total</span>
                        </div>
                        <input type="checkbox" name="is_superuser" checked={formData.is_superuser} onChange={handleChange} className="w-6 h-6 rounded-lg text-purple-600 border-slate-300 focus:ring-purple-500 transition-all"/>
                  </label>
                </div>

                <div className="mt-10 space-y-3">
                    <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest py-5 rounded-[20px] shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
                      {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />}
                      {id ? 'Atualizar Perfil' : 'Criar Operador'}
                    </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
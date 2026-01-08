import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext'; // <--- NOVO
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
  UserCog, Mail, Lock, Shield, Save, Check, Stethoscope, CalendarDays, DollarSign, KeyRound, ArrowLeft, Loader2 
} from 'lucide-react';

export default function CadastroOperador() {
  const { api } = useAuth();
  const { notify } = useNotification(); // <--- HOOK
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(id ? true : false);
  
  const [formData, setFormData] = useState({
    username: '', password: '', first_name: '', email: '',
    acesso_atendimento: false, acesso_agendamento: false, 
    acesso_faturamento: false, is_superuser: false,
    force_password_change: true
  });

  useEffect(() => {
    if (id && api) {
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
                    is_superuser: data.is_superuser || false,
                    force_password_change: data.force_password_change || false,
                    password: ''
                });
           })
           .catch(err => {
               console.error(err);
               if (err.response?.status === 401) notify.error("Sessão expirada. Faça login novamente.");
               navigate('/operadores');
           })
           .finally(() => setFetching(false));
    }
  }, [id, api, navigate]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (id) {
          const dadosParaEnviar = { ...formData };
          if (!dadosParaEnviar.password) delete dadosParaEnviar.password;
          await api.put(`operadores/${id}/`, dadosParaEnviar);
          notify.success('Operador atualizado com sucesso!'); // <---
      } else {
          await api.post('operadores/novo/', formData);
          notify.success('Operador criado com sucesso!'); // <---
      }
      navigate('/operadores');
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.error || 'Erro ao salvar operador.';
      notify.error(msg); // <---
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-600";
  const labelClass = "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5";
  const backButtonClass = "mb-4 flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-sm font-bold w-fit";

  const PermissionToggle = ({ name, label, icon: Icon, checked, onChange }) => {
    const activeContainer = "bg-blue-50 border-blue-600 ring-1 ring-blue-600 dark:bg-blue-900/30 dark:border-blue-400 dark:ring-blue-400";
    const inactiveContainer = "bg-white border-slate-200 hover:border-blue-300 dark:bg-slate-800 dark:border-slate-700";

    return (
      <label className={`relative flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all duration-200 ${checked ? activeContainer : inactiveContainer}`}>
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-lg transition-colors ${checked ? 'bg-white shadow-sm dark:bg-slate-800 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
            <Icon size={24} />
          </div>
          <div>
            <span className={`block font-bold text-base ${checked ? 'text-blue-900 dark:text-blue-100' : 'text-slate-600 dark:text-slate-300'}`}>
              {label}
            </span>
            <span className={`text-xs font-medium ${checked ? 'text-blue-600 dark:text-blue-300' : 'text-slate-400 dark:text-slate-500'}`}>
              {checked ? 'Habilitado' : 'Desabilitado'}
            </span>
          </div>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${checked ? 'bg-blue-600 border-blue-600 scale-110 shadow-md' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}>
          {checked && <Check size={18} className="text-white" strokeWidth={3} />}
        </div>
        <input type="checkbox" name={name} checked={checked} onChange={onChange} className="sr-only" />
      </label>
    );
  };

  if (fetching) return <Layout><div className="flex justify-center p-10 text-slate-400">Carregando dados do operador...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate('/operadores')} className={backButtonClass}>
            <ArrowLeft size={18}/> Voltar
        </button>

        <div className="mb-8 flex items-center space-x-4">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg text-white">
            <UserCog size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{id ? 'Editar Operador' : 'Novo Operador'}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie as credenciais e permissões de acesso.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-700 dark:text-white mb-6 flex items-center gap-2">
                  <Shield size={20} className="text-blue-600 dark:text-blue-400"/> Credenciais
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className={labelClass}>Nome Completo</label>
                    <input name="first_name" value={formData.first_name} onChange={handleChange} className={inputClass.replace('pl-10', 'px-4')} placeholder="Ex: Dra. Ana Paula" required />
                  </div>

                  <div className="col-span-2">
                    <label className={labelClass}>Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                      <input name="email" value={formData.email} type="email" onChange={handleChange} className={inputClass} placeholder="email@clinica.com" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Nome de Usuário</label>
                    <div className="relative">
                      <UserCog className="absolute left-3 top-3.5 text-slate-400" size={18} />
                      <input name="username" value={formData.username} onChange={handleChange} className={inputClass} placeholder="usuario.sistema" required />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                      <input name="password" type="password" value={formData.password} onChange={handleChange} className={inputClass} placeholder={id ? "•••••• (Vazio p/ manter)" : "••••••"} required={!id} />
                    </div>
                  </div>
                  
                   <div className="col-span-2 mt-2">
                     <PermissionToggle 
                        name="force_password_change" 
                        label="Forçar Troca de Senha" 
                        icon={KeyRound} 
                        checked={formData.force_password_change} 
                        onChange={handleChange} 
                      />
                   </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
                <h2 className="text-lg font-bold text-slate-700 dark:text-white mb-2">Permissões de Acesso</h2>
                <p className="text-sm text-slate-400 mb-6">Selecione os módulos liberados:</p>

                <div className="space-y-4 flex-grow">
                  <PermissionToggle name="acesso_atendimento" label="Atendimento" icon={Stethoscope} checked={formData.acesso_atendimento} onChange={handleChange} />
                  <PermissionToggle name="acesso_agendamento" label="Agendamento" icon={CalendarDays} checked={formData.acesso_agendamento} onChange={handleChange} />
                  <PermissionToggle name="acesso_faturamento" label="Financeiro" icon={DollarSign} checked={formData.acesso_faturamento} onChange={handleChange} />
                  <hr className="border-slate-100 dark:border-slate-700 my-4"/>
                  <PermissionToggle name="is_superuser" label="Administrador" icon={Shield} checked={formData.is_superuser} onChange={handleChange} />
                </div>

                <div className="mt-8 flex flex-col gap-3">
                    <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50">
                      {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />}
                      {loading ? 'Salvando...' : 'Salvar Operador'}
                    </button>
                     <button type="button" onClick={() => navigate('/operadores')} className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-xl transition-colors">
                        Cancelar
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
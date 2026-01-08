import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Users, Calendar, DollarSign, Settings, Activity, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();

  const ShortcutCard = ({ to, title, description, icon: Icon, colorClass }) => (
    <Link to={to} className="group relative bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:-translate-y-1 transition-all overflow-hidden">
      <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass.replace('bg-', 'text-')}`}>
        <Icon size={80} />
      </div>
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <div className={`p-3 rounded-lg inline-flex mb-4 ${colorClass} text-white shadow-lg`}>
            <Icon size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-white mb-1">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{description}</p>
        </div>
      </div>
      <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400">
        Acessar <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );

  const StatWidget = ({ label, value, trend, positive }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">{label}</p>
        <h4 className="text-2xl font-bold text-slate-800 dark:text-white">{value}</h4>
      </div>
      <div className={`text-sm px-2 py-1 rounded-full ${positive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
        {trend}
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Olá, <span className="text-blue-600 dark:text-blue-400">{user?.first_name || user?.username}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Resumo da clínica.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatWidget label="Pacientes Hoje" value="12" trend="+2 novos" positive={true} />
          <StatWidget label="Consultas" value="4" trend="Pendentes" positive={false} />
          <StatWidget label="Faturamento" value="R$ 1.250" trend="+15%" positive={true} />
        </div>

        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Acesso Rápido</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(user?.acesso_atendimento || user?.is_superuser) && (
             <ShortcutCard to="/pacientes" title="Atendimento" description="Gestão de pacientes." icon={Users} colorClass="bg-blue-600"/>
          )}
          {(user?.acesso_agendamento || user?.is_superuser) && (
             <ShortcutCard to="/agenda" title="Agendamento" description="Agenda médica." icon={Calendar} colorClass="bg-indigo-500"/>
          )}
          {(user?.acesso_faturamento || user?.is_superuser) && (
             <ShortcutCard to="/faturamento" title="Financeiro" description="Notas e caixa." icon={DollarSign} colorClass="bg-emerald-500"/>
          )}
          {user?.is_superuser && (
             <ShortcutCard to="/cadastro-operador" title="Configurações" description="Gestão do sistema." icon={Settings} colorClass="bg-slate-700"/>
          )}
        </div>

        <div className="mt-10 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-6 border border-blue-100 dark:border-slate-700">
          <div className="flex items-center space-x-3 text-blue-800 dark:text-blue-300 mb-2">
            <Activity size={20} />
            <h3 className="font-bold">Status do Sistema</h3>
          </div>
          <p className="text-sm text-blue-600 dark:text-slate-400">
            Todas as integrações operando normalmente.
          </p>
        </div>
      </div>
    </Layout>
  );
}
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Stethoscope,
  CalendarDays,
  Settings,
  ClipboardList,
  Bell,
  Users,
  Plus,
  CalendarClock,
  CalendarX,
  ShieldCheck,
  Briefcase,
  Heart,
  Building2,
  ChevronRight
} from 'lucide-react';

const MENU = [
  {
    key: 'atendimento',
    label: 'Atendimento',
    icon: Stethoscope,
    access: (u) => u?.is_superuser || u?.acesso_atendimento,
    items: [
      { to: '/prontuarios', label: 'Prontuários', icon: ClipboardList },
      { to: '/triagem', label: 'Triagem', icon: Bell }
    ]
  },
  {
    key: 'agenda',
    label: 'Agenda',
    icon: CalendarDays,
    access: (u) => u?.is_superuser || u?.acesso_agendamento,
    items: [
      { to: '/recepcao', label: 'Recepção', icon: Users },
      { to: '/agenda/marcar', label: 'Marcar Consulta', icon: Plus },
      { to: '/agenda/configurar', label: 'Configurar Agenda', icon: CalendarDays },
      { to: '/agenda/criar', label: 'Criar Agenda', icon: CalendarClock },
      { to: '/agenda/bloqueios', label: 'Bloqueios e Feriados', icon: CalendarX }
    ]
  },
  {
    key: 'sistema',
    label: 'Sistema',
    icon: Settings,
    access: (u) => u?.is_superuser || u?.acesso_cadastros,
    items: [
      { to: '/pacientes', label: 'Pacientes', icon: Users },
      { to: '/operadores', label: 'Operadores', icon: ShieldCheck },
      { to: '/profissionais', label: 'Profissionais', icon: Briefcase },
      { to: '/especialidades', label: 'Especialidades', icon: Heart },
      { to: '/convenios', label: 'Convênios', icon: ShieldCheck },
      { to: '/clinica', label: 'Dados da Clínica', icon: Building2 }
    ]
  }
];

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <aside className="flex flex-col w-16 md:w-20 px-1 md:px-2 py-6 border-r border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md sticky top-16 h-[calc(100vh-64px)]">
      <div className="flex flex-col gap-3">
        {MENU.filter((m) => m.access(user)).map((menu) => {
          const Icon = menu.icon;
          const isActive = menu.items.some((i) => location.pathname.startsWith(i.to));
          return (
            <div key={menu.key} className="relative group">
              <div className={`flex flex-col items-center gap-1 py-3 rounded-2xl transition-all cursor-pointer ${
                isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}>
                <Icon size={20} />
                <span className="text-[9px] font-black uppercase tracking-widest">{menu.label}</span>
              </div>

              <div className="absolute left-full top-0 ml-3 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-40">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="p-3 border-b border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Icon size={14}/> {menu.label}
                  </div>
                  <div className="p-2 space-y-1">
                    {menu.items.map((item) => {
                      const ItemIcon = item.icon;
                      const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            active
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <ItemIcon size={14} className={active ? 'text-blue-600' : 'text-slate-400'} />
                            {item.label}
                          </span>
                          <ChevronRight size={12} className="text-slate-300" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

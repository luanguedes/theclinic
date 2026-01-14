import {
  LayoutDashboard,
  Stethoscope,
  CalendarDays,
  CalendarClock,
  CalendarX,
  Settings,
  ClipboardList,
  Bell,
  Users,
  ShieldCheck,
  Briefcase,
  Heart,
  Building2
} from 'lucide-react';

export const DASHBOARD_ITEM = {
  to: '/dashboard',
  label: 'Dashboard',
  icon: LayoutDashboard
};

export const MENU_ITEMS = [
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
      { to: '/agenda/marcar', label: 'Agendar Consulta', icon: CalendarDays },
      { to: '/agenda/configurar', label: 'Criar Agenda', icon: CalendarClock },
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

export const getFlatMenuItems = () => (
  MENU_ITEMS.flatMap((m) => m.items).sort((a, b) => b.to.length - a.to.length)
);

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
  Building2,
  FileText
} from 'lucide-react';

export const DASHBOARD_ITEM = {
  to: '/dashboard',
  label: 'Dashboard',
  icon: LayoutDashboard
};

const ATENDIMENTO_ITEMS = [
  { to: '/prontuarios', label: 'Prontuarios', icon: ClipboardList },
  { to: '/triagem', label: 'Triagem', icon: Bell }
];

const AGENDA_ITEMS = [
  { to: '/recepcao', label: 'Recepcao', icon: Users },
  { to: '/agenda/marcar', label: 'Agendar Consulta', icon: CalendarDays },
  { to: '/agenda/configurar', label: 'Criar Agenda', icon: CalendarClock },
  { to: '/agenda/bloqueios', label: 'Bloqueios e Feriados', icon: CalendarX }
];

const SISTEMA_ITEMS = [
  { to: '/pacientes', label: 'Pacientes', icon: Users },
  { to: '/operadores', label: 'Operadores', icon: ShieldCheck },
  { to: '/profissionais', label: 'Profissionais', icon: Briefcase },
  { to: '/especialidades', label: 'Especialidades', icon: Heart },
  { to: '/convenios', label: 'Convenios', icon: ShieldCheck },
  { to: '/clinica', label: 'Dados da Clinica', icon: Building2 },
  { to: '/logs', label: 'Logs de Acesso', icon: FileText }
];

const SISTEMA_PRIVILEGE_ITEMS = [
  ...SISTEMA_ITEMS.filter((item) => item.to !== '/logs'),
  { to: '/configuracoes', label: 'Configuracoes do Sistema' }
];

const fallbackModuleAccess = (user, moduleKey) => {
  if (!user) return false;
  if (moduleKey === 'agenda') return !!user.acesso_agendamento;
  if (moduleKey === 'atendimento') return !!user.acesso_atendimento;
  if (moduleKey === 'sistema') return !!user.acesso_cadastros;
  return false;
};

export const hasRouteAccess = (user, path) => {
  if (user?.is_superuser) return true;
  if (path === '/dashboard') return true;
  const allowed = user?.allowed_routes || [];
  if (allowed.length > 0) {
    return allowed.some((p) => path === p || path.startsWith(`${p}/`));
  }
  if (path.startsWith('/configuracoes')) return !!user?.acesso_configuracoes;
  return false;
};

const hasModuleAccess = (user, moduleKey, items) => {
  if (user?.is_superuser) return true;
  const allowed = user?.allowed_routes || [];
  if (allowed.length > 0) {
    return items.some((item) => hasRouteAccess(user, item.to));
  }
  return fallbackModuleAccess(user, moduleKey);
};

export const MENU_ITEMS = [
  {
    key: 'atendimento',
    label: 'Atendimento',
    icon: Stethoscope,
    access: (u) => hasModuleAccess(u, 'atendimento', ATENDIMENTO_ITEMS),
    items: ATENDIMENTO_ITEMS
  },
  {
    key: 'agenda',
    label: 'Agenda',
    icon: CalendarDays,
    access: (u) => hasModuleAccess(u, 'agenda', AGENDA_ITEMS),
    items: AGENDA_ITEMS
  },
  {
    key: 'sistema',
    label: 'Sistema',
    icon: Settings,
    access: (u) => hasModuleAccess(u, 'sistema', SISTEMA_ITEMS),
    items: SISTEMA_ITEMS
  }
];

export const getFlatMenuItems = () => (
  MENU_ITEMS.flatMap((m) => m.items).sort((a, b) => b.to.length - a.to.length)
);

export const getPrivilegeModules = () => ([
  { key: 'dashboard', label: 'Dashboard', items: [DASHBOARD_ITEM] },
  { key: 'atendimento', label: 'Atendimento', items: ATENDIMENTO_ITEMS },
  { key: 'agenda', label: 'Agenda', items: AGENDA_ITEMS },
  { key: 'sistema', label: 'Sistema', items: SISTEMA_PRIVILEGE_ITEMS }
]);

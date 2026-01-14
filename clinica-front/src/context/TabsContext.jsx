import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ClipboardList,
  Bell,
  Users,
  CalendarDays,
  Plus,
  CalendarClock,
  CalendarX,
  ShieldCheck,
  Briefcase,
  Heart,
  Building2,
  Settings
} from 'lucide-react';

const TabsContext = createContext();

const TAB_DEFS = [
  { match: (p) => p.startsWith('/prontuarios'), title: 'Prontuários', icon: ClipboardList },
  { match: (p) => p.startsWith('/triagem'), title: 'Triagem', icon: Bell },
  { match: (p) => p.startsWith('/recepcao'), title: 'Recepção', icon: Users },
  { match: (p) => p.startsWith('/agenda/marcar'), title: 'Marcar Consulta', icon: Plus },
  { match: (p) => p.startsWith('/agenda/configurar'), title: 'Configurar Agenda', icon: CalendarDays },
  { match: (p) => p.startsWith('/agenda/criar'), title: 'Criar Agenda', icon: CalendarClock },
  { match: (p) => p.startsWith('/agenda/bloqueios'), title: 'Bloqueios', icon: CalendarX },
  { match: (p) => p.startsWith('/pacientes'), title: 'Pacientes', icon: Users },
  { match: (p) => p.startsWith('/operadores'), title: 'Operadores', icon: ShieldCheck },
  { match: (p) => p.startsWith('/profissionais'), title: 'Profissionais', icon: Briefcase },
  { match: (p) => p.startsWith('/especialidades'), title: 'Especialidades', icon: Heart },
  { match: (p) => p.startsWith('/convenios'), title: 'Convênios', icon: ShieldCheck },
  { match: (p) => p.startsWith('/clinica'), title: 'Dados da Clínica', icon: Building2 },
  { match: (p) => p.startsWith('/configuracoes'), title: 'Configurações', icon: Settings },
  { match: (p) => p.startsWith('/agenda'), title: 'Agenda', icon: CalendarDays }
];

const IGNORE_PATHS = ['/', '/trocasenhaobrigatoria', '/dashboard'];
const MAX_TABS = 6;

export function TabsProvider({ children }) {
  const location = useLocation();
  const [tabs, setTabs] = useState(() => {
    const raw = sessionStorage.getItem('theclinic.tabs');
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((t) => t.path !== '/dashboard')
        .map((t) => {
          const def = TAB_DEFS.find((d) => d.match(t.path));
          return {
            path: t.path,
            title: t.title || def?.title || 'Página',
            icon: def?.icon,
            pinned: !!t.pinned
          };
        });
    } catch {
      return [];
    }
  });

  const currentPath = location.pathname;

  const currentDef = useMemo(() => {
    return TAB_DEFS.find((def) => def.match(currentPath));
  }, [currentPath]);

  useEffect(() => {
    if (IGNORE_PATHS.includes(currentPath)) return;
    if (!currentDef) return;

    setTabs((prev) => {
      const exists = prev.find((t) => t.path === currentPath);
      if (exists) return prev;

      const next = [...prev, {
        path: currentPath,
        title: currentDef.title,
        icon: currentDef.icon,
        pinned: false
      }];

      if (next.length <= MAX_TABS) return next;

      const idxToRemove = next.findIndex((t) => !t.pinned);
      if (idxToRemove === -1) return prev;
      next.splice(idxToRemove, 1);
      return next;
    });
  }, [currentPath, currentDef]);

  useEffect(() => {
    const payload = tabs.map((t) => ({ path: t.path, title: t.title, pinned: t.pinned }));
    sessionStorage.setItem('theclinic.tabs', JSON.stringify(payload));
  }, [tabs]);

  const closeTab = (path) => {
    setTabs((prev) => prev.filter((t) => t.path !== path));
  };

  const togglePin = (path) => {
    setTabs((prev) => prev.map((t) => t.path === path ? { ...t, pinned: !t.pinned } : t));
  };

  const moveTab = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    setTabs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const value = {
    tabs,
    currentPath,
    closeTab,
    togglePin,
    moveTab
  };

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function useTabs() {
  return useContext(TabsContext);
}

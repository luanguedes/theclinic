import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import { getFlatMenuItems, hasRouteAccess } from '../config/navigation';

const TabsContext = createContext();

const TAB_DEFS = getFlatMenuItems().map((item) => ({
  path: item.to,
  match: (p) => p.startsWith(item.to),
  title: item.label,
  icon: item.icon
}));

const IGNORE_PATHS = ['/', '/trocasenhaobrigatoria', '/dashboard'];
const MAX_TABS = 5;

export function TabsProvider({ children }) {
  const location = useLocation();
  const { user } = useAuth();
  const { notify } = useNotification();
  const storageKey = user?.username ? `theclinic.tabs.${user.username}` : null;
  const [tabs, setTabs] = useState([]);

  const currentPath = location.pathname;

  const currentDef = useMemo(() => {
    return TAB_DEFS.find((def) => def.match(currentPath));
  }, [currentPath]);

  useEffect(() => {
    if (IGNORE_PATHS.includes(currentPath)) return;
    if (!currentDef) return;
    if (user && !hasRouteAccess(user, currentPath)) return;

    const tabPath = currentDef.path;
    setTabs((prev) => {
      const exists = prev.find((t) => t.path === tabPath);
      if (exists) return prev;

      if (prev.length >= MAX_TABS) {
        notify?.warning?.("Limite de abas atingido. Feche uma aba para abrir outra.");
        return prev;
      }

      const next = [...prev, {
        path: tabPath,
        title: currentDef.title,
        icon: currentDef.icon,
        pinned: false
      }];

      return next;
    });
  }, [currentPath, currentDef]);

  useEffect(() => {
    if (!storageKey) {
      setTabs([]);
      return;
    }
    const raw = sessionStorage.getItem(storageKey);
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) { setTabs([]); return; }
      const hydrated = parsed
        .filter((t) => t.path !== '/dashboard')
        .map((t) => {
          const def = TAB_DEFS.find((d) => d.match(t.path));
          return {
            path: def?.path || t.path,
            title: t.title || def?.title || 'Página',
            icon: def?.icon,
            pinned: true
          };
        });
      setTabs(hydrated);
    } catch {
      setTabs([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    const payload = tabs
      .filter((t) => t.pinned)
      .map((t) => ({ path: t.path, title: t.title }));
    sessionStorage.setItem(storageKey, JSON.stringify(payload));
  }, [tabs, storageKey]);

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

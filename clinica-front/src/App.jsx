import React, { useEffect, useRef } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';

// Contextos
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext'; 
import { TabsProvider } from './context/TabsContext';
import { UnsavedChangesProvider, useUnsavedChangesRegistry } from './context/UnsavedChangesContext';

// Componentes de Infraestrutura
import TabsRouter from './components/TabsRouter';

/**
 * Utilitário para resetar o scroll em cada navegação
 */
function ScrollRestoration() {
  const { pathname } = useLocation();
  const prevPath = useRef(pathname);

  useEffect(() => {
    const raw = sessionStorage.getItem('theclinic.scroll') || '{}';
    let map = {};
    try { map = JSON.parse(raw); } catch { map = {}; }

    const prev = prevPath.current;
    map[prev] = window.scrollY;
    sessionStorage.setItem('theclinic.scroll', JSON.stringify(map));

    const nextY = map[pathname] ?? 0;
    requestAnimationFrame(() => window.scrollTo(0, nextY));
    prevPath.current = pathname;
  }, [pathname]);

  return null;
}

function UnsavedChangesGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const registry = useUnsavedChangesRegistry();
  const lastLocationRef = useRef(location);
  const revertingRef = useRef(false);

  useEffect(() => {
    if (!registry) return;

    if (revertingRef.current) {
      revertingRef.current = false;
      lastLocationRef.current = location;
      return;
    }

    const last = lastLocationRef.current;
    const lastKey = `${last.pathname}${last.search}${last.hash}`;
    const currentKey = `${location.pathname}${location.search}${location.hash}`;

    if (currentKey === lastKey) return;

    const dirtyInfo = registry.getDirty?.(lastKey);
    if (dirtyInfo?.dirty) {
      const shouldLeave = window.confirm(dirtyInfo.message || 'Existem alteracoes nao salvas. Deseja sair sem salvar?');
      if (!shouldLeave) {
        revertingRef.current = true;
        navigate(lastKey, { replace: true });
        return;
      }
    }

    lastLocationRef.current = location;
  }, [location, navigate, registry]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <UnsavedChangesProvider>
        <UnsavedChangesGuard />
        <AuthProvider>
          <ThemeProvider>
            <NotificationProvider> 
              <TabsProvider>
                <ScrollRestoration />
                <TabsRouter />
              </TabsProvider>
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </UnsavedChangesProvider>
    </BrowserRouter>
  );
}

export default App;

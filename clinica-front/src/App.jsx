import React, { useEffect, useRef } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';

// Contextos
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext'; 
import { TabsProvider } from './context/TabsContext';

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

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;

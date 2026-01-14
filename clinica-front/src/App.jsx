import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Contextos
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext'; 
import { TabsProvider } from './context/TabsContext';

// Componentes de Infraestrutura
import PrivateRoute from './components/PrivateRoute'; 
import { Loader2 } from 'lucide-react';

// Carregamento Preguiçoso (Lazy Loading) para Performance
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Pacientes = lazy(() => import('./pages/Pacientes'));
const Operadores = lazy(() => import('./pages/Operadores'));
const CadastroOperador = lazy(() => import('./pages/CadastroOperador'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const TrocaSenhaObrigatoria = lazy(() => import('./pages/TrocaSenhaObrigatoria'));
const Especialidades = lazy(() => import('./pages/Especialidades'));
const Profissionais = lazy(() => import('./pages/Profissionais'));
const ProfissionalForm = lazy(() => import('./pages/ProfissionaisForm'));
const CriarAgenda = lazy(() => import('./pages/CriarAgenda'));
const ConfigurarAgenda = lazy(() => import('./pages/ConfigurarAgenda'));
const Convenios = lazy(() => import('./pages/Convenios'));
const DadosClinica = lazy(() => import('./pages/DadosClinica'));
const MarcarConsulta = lazy(() => import('./pages/MarcarConsulta'));
const Recepcao = lazy(() => import('./pages/Recepcao'));
const Bloqueios = lazy(() => import('./pages/Bloqueios'));

/**
 * Utilitário para resetar o scroll em cada navegação
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * Loader de fallback para o Suspense
 */
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-50 dark:bg-slate-950">
    <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
    <span className="font-black text-xs uppercase tracking-widest text-slate-400">Carregando Módulo...</span>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider> 
            <TabsProvider>
              <ScrollToTop />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* ROTA PÚBLICA */}
                  <Route path="/" element={<Login />} />
                  
                  {/* SEGURANÇA CRÍTICA */}
                  <Route path="/trocasenhaobrigatoria" element={
                    <PrivateRoute><TrocaSenhaObrigatoria /></PrivateRoute>
                  } />
                  
                  {/* DASHBOARD PRINCIPAL */}
                  <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

                  {/* GESTÃO DE PESSOAS E OPERAÇÃO */}
                  <Route path="/pacientes" element={<PrivateRoute><Pacientes /></PrivateRoute>} />
                  <Route path="/operadores" element={<PrivateRoute><Operadores /></PrivateRoute>} />
                  <Route path="/operadores/novo" element={<PrivateRoute><CadastroOperador /></PrivateRoute>} />
                  <Route path="/operadores/editar/:id" element={<PrivateRoute><CadastroOperador /></PrivateRoute>} />
                  <Route path="/profissionais" element={<PrivateRoute><Profissionais /></PrivateRoute>} />
                  <Route path="/profissionais/novo" element={<PrivateRoute><ProfissionalForm /></PrivateRoute>} />
                  <Route path="/profissionais/:id" element={<PrivateRoute><ProfissionalForm /></PrivateRoute>} />
                  <Route path="/especialidades" element={<PrivateRoute><Especialidades /></PrivateRoute>} />

                  {/* MÓDULO DE AGENDA E RECEPÇÃO */}
                  <Route path="/recepcao" element={<PrivateRoute><Recepcao /></PrivateRoute>} />
                  <Route path="/agenda/marcar" element={<PrivateRoute><MarcarConsulta /></PrivateRoute>} />
                  <Route path="/agenda/configurar" element={<PrivateRoute><ConfigurarAgenda /></PrivateRoute>} />
                  <Route path="/agenda/criar" element={<PrivateRoute><CriarAgenda /></PrivateRoute>} />
                  <Route path="/agenda/bloqueios" element={<PrivateRoute><Bloqueios /></PrivateRoute>} />

                  {/* CONFIGURAÇÕES GLOBAIS E ADMINISTRAÇÃO */}
                  <Route path="/convenios" element={<PrivateRoute><Convenios /></PrivateRoute>} />
                  <Route path="/clinica" element={<PrivateRoute><DadosClinica /></PrivateRoute>} />
                  <Route path="/configuracoes" element={<PrivateRoute><Configuracoes /></PrivateRoute>} />
                  
                  {/* REDIRECIONAMENTO DE SEGURANÇA */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </TabsProvider>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

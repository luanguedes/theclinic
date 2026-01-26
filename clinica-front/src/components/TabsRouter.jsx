import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import { Loader2 } from 'lucide-react';
import { useTabs } from '../context/TabsContext';

const Login = lazy(() => import('../pages/Login'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Pacientes = lazy(() => import('../pages/Pacientes'));
const Operadores = lazy(() => import('../pages/Operadores'));
const CadastroOperador = lazy(() => import('../pages/CadastroOperador'));
const Configuracoes = lazy(() => import('../pages/Configuracoes'));
const TrocaSenhaObrigatoria = lazy(() => import('../pages/TrocaSenhaObrigatoria'));
const Especialidades = lazy(() => import('../pages/Especialidades'));
const Profissionais = lazy(() => import('../pages/Profissionais'));
const ProfissionalForm = lazy(() => import('../pages/ProfissionaisForm'));
const CriarAgenda = lazy(() => import('../pages/CriarAgenda'));
const ConfigurarAgenda = lazy(() => import('../pages/ConfigurarAgenda'));
const Convenios = lazy(() => import('../pages/Convenios'));
const DadosClinica = lazy(() => import('../pages/DadosClinica'));
const MarcarConsulta = lazy(() => import('../pages/MarcarConsulta'));
const Recepcao = lazy(() => import('../pages/Recepcao'));
const Triagem = lazy(() => import('../pages/Triagem'));
const TriagemForm = lazy(() => import('../pages/TriagemForm'));
const AtendimentoConsultas = lazy(() => import('../pages/Atendimento/AtendimentoConsultas'));
const AtendimentoConsultaForm = lazy(() => import('../pages/Atendimento/AtendimentoConsultaForm'));
const Bloqueios = lazy(() => import('../pages/Bloqueios'));
const Logs = lazy(() => import('../pages/Logs'));
const ExamesProcedimentos = lazy(() => import('../pages/ExamesProcedimentos'));
const Medicamentos = lazy(() => import('../pages/Medicamentos'));
const ImportacaoTabelas = lazy(() => import('../pages/ImportacaoTabelas'));
const Cids = lazy(() => import('../pages/Cids'));

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-50 dark:bg-slate-950">
    <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
    <span className="font-black text-xs uppercase tracking-widest text-slate-400">Carregando Módulo...</span>
  </div>
);

const renderRoutes = (locationOverride) => (
  <Routes location={locationOverride}>
    <Route path="/" element={<Login />} />
    <Route path="/trocasenhaobrigatoria" element={
      <PrivateRoute><TrocaSenhaObrigatoria /></PrivateRoute>
    } />
    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
    <Route path="/pacientes" element={<PrivateRoute><Pacientes /></PrivateRoute>} />
    <Route path="/operadores" element={<PrivateRoute><Operadores /></PrivateRoute>} />
    <Route path="/operadores/novo" element={<PrivateRoute><CadastroOperador /></PrivateRoute>} />
    <Route path="/operadores/editar/:id" element={<PrivateRoute><CadastroOperador /></PrivateRoute>} />
    <Route path="/profissionais" element={<PrivateRoute><Profissionais /></PrivateRoute>} />
    <Route path="/profissionais/novo" element={<PrivateRoute><ProfissionalForm /></PrivateRoute>} />
    <Route path="/profissionais/:id" element={<PrivateRoute><ProfissionalForm /></PrivateRoute>} />
    <Route path="/especialidades" element={<PrivateRoute><Especialidades /></PrivateRoute>} />
    <Route path="/recepcao" element={<PrivateRoute><Recepcao /></PrivateRoute>} />
    <Route path="/triagem" element={<PrivateRoute><Triagem /></PrivateRoute>} />
    <Route path="/triagem/:agendamentoId" element={<PrivateRoute><TriagemForm /></PrivateRoute>} />
    <Route path="/atendimento-consultas" element={<PrivateRoute><AtendimentoConsultas /></PrivateRoute>} />
    <Route path="/atendimento-consultas/:agendamentoId" element={<PrivateRoute><AtendimentoConsultaForm /></PrivateRoute>} />
    <Route path="/agenda/marcar" element={<PrivateRoute><MarcarConsulta /></PrivateRoute>} />
    <Route path="/agenda/configurar" element={<PrivateRoute><ConfigurarAgenda /></PrivateRoute>} />
    <Route path="/agenda/configurar/nova" element={<PrivateRoute><CriarAgenda /></PrivateRoute>} />
    <Route path="/agenda/bloqueios" element={<PrivateRoute><Bloqueios /></PrivateRoute>} />
    <Route path="/convenios" element={<PrivateRoute><Convenios /></PrivateRoute>} />
    <Route path="/exames-procedimentos" element={<PrivateRoute><ExamesProcedimentos /></PrivateRoute>} />
    <Route path="/medicamentos" element={<PrivateRoute><Medicamentos /></PrivateRoute>} />
    <Route path="/cids" element={<PrivateRoute><Cids /></PrivateRoute>} />
    <Route path="/importacao-tabelas" element={<PrivateRoute><ImportacaoTabelas /></PrivateRoute>} />
    <Route path="/clinica" element={<PrivateRoute><DadosClinica /></PrivateRoute>} />
    <Route path="/configuracoes" element={<PrivateRoute><Configuracoes /></PrivateRoute>} />
    <Route path="/logs" element={<PrivateRoute><Logs /></PrivateRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default function TabsRouter() {
  const location = useLocation();
  const { tabs } = useTabs();

  const currentPath = location.pathname;
  const publicOnly = currentPath === '/' || currentPath === '/trocasenhaobrigatoria';

  const cachedPaths = publicOnly
    ? [currentPath]
    : Array.from(new Set([currentPath, ...tabs.map((t) => t.lastPath || t.path)]));

  return (
    <Suspense fallback={<PageLoader />}>
      <div className="relative min-h-[60vh]">
        {cachedPaths.map((path) => (
          <div key={path} className={path === currentPath ? 'block' : 'hidden'}>
            {renderRoutes({ pathname: path })}
          </div>
        ))}
      </div>
    </Suspense>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
// IMPORTE AQUI
import { NotificationProvider } from './context/NotificationContext'; 

// ... imports das páginas ...
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import Operadores from './pages/Operadores';            
import CadastroOperador from './pages/CadastroOperador';
import Configuracoes from './pages/Configuracoes';
import TrocaSenhaObrigatoria from './pages/TrocaSenhaObrigatoria';
import Especialidades from './pages/Especialidades';
import Profissionais from './pages/Profissionais';
import ProfissionalForm from './pages/ProfissionaisForm';
import CriarAgenda from './pages/CriarAgenda';
import ConfigurarAgenda from './pages/ConfigurarAgenda';
import Convenios from './pages/Convenios';
import DadosClinica from './pages/DadosClinica';
import MarcarConsulta from './pages/MarcarConsulta';
import Recepcao from './pages/Recepcao';
import Bloqueios from './pages/Bloqueios';

const RotaPrivada = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  if (!user) return <Navigate to="/" />;
  if (user.force_password_change) return <Navigate to="/trocar-senha-obrigatoria" />;
  if (adminOnly && !user.is_superuser) return <Navigate to="/dashboard" />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      {/* 1. Envolva o AuthProvider com o Theme e o Notification */}
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider> 
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/trocasenhaobrigatoria" element={<RotaPrivada><TrocaSenhaObrigatoria /></RotaPrivada>} />
              <Route path="/dashboard" element={<RotaPrivada><Dashboard /></RotaPrivada>} />
              <Route path="/pacientes" element={<RotaPrivada><Pacientes /></RotaPrivada>} />
              <Route path="/operadores" element={<RotaPrivada><Operadores /></RotaPrivada>} />
              <Route path="/operadores/novo" element={<RotaPrivada><CadastroOperador /></RotaPrivada>} />
              <Route path="/operadores/editar/:id" element={<RotaPrivada><CadastroOperador /></RotaPrivada>} />
              <Route path="/especialidades" element={<RotaPrivada adminOnly><Especialidades /></RotaPrivada>} />
              <Route path="/profissionais" element={<RotaPrivada><Profissionais /></RotaPrivada>} />
              <Route path="/profissionais/novo" element={<RotaPrivada><ProfissionalForm /></RotaPrivada>} />
              <Route path="/profissionais/:id" element={<RotaPrivada><ProfissionalForm /></RotaPrivada>} />
              <Route path="/agenda/configurar" element={<RotaPrivada><ConfigurarAgenda /></RotaPrivada>} />
              <Route path="/agenda/criar" element={<RotaPrivada><CriarAgenda /></RotaPrivada>} />
              <Route path="/agenda/marcar" element={<RotaPrivada><MarcarConsulta /></RotaPrivada>} />
              <Route path="/convenios" element={<RotaPrivada adminOnly><Convenios /></RotaPrivada>} />
              <Route path="/clinica" element={<RotaPrivada adminOnly><DadosClinica /></RotaPrivada>} />
              <Route path="/recepcao" element={<RotaPrivada><Recepcao /></RotaPrivada>} />
              <Route path="/agenda/bloqueios" element={<RotaPrivada adminOnly><Bloqueios /></RotaPrivada>} />
              <Route path="/configuracoes" element={<RotaPrivada adminOnly><Configuracoes /></RotaPrivada>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext'; 


import PrivateRoute from './components/PrivateRoute'; 
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


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider> 
            <Routes>
              <Route path="/" element={<Login />} />
              
              {/* Note que mudei de <RotaPrivada> para <PrivateRoute> */}
              
              <Route path="/trocasenhaobrigatoria" element={<PrivateRoute><TrocaSenhaObrigatoria /></PrivateRoute>} />
              
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/pacientes" element={<PrivateRoute><Pacientes /></PrivateRoute>} />
              <Route path="/operadores" element={<PrivateRoute><Operadores /></PrivateRoute>} />
              <Route path="/operadores/novo" element={<PrivateRoute><CadastroOperador /></PrivateRoute>} />
              <Route path="/operadores/editar/:id" element={<PrivateRoute><CadastroOperador /></PrivateRoute>} />
           
              <Route path="/especialidades" element={<PrivateRoute><Especialidades /></PrivateRoute>} />
              <Route path="/profissionais" element={<PrivateRoute><Profissionais /></PrivateRoute>} />
              <Route path="/profissionais/novo" element={<PrivateRoute><ProfissionalForm /></PrivateRoute>} />
              <Route path="/profissionais/:id" element={<PrivateRoute><ProfissionalForm /></PrivateRoute>} />
              
              <Route path="/agenda/configurar" element={<PrivateRoute><ConfigurarAgenda /></PrivateRoute>} />
              <Route path="/agenda/criar" element={<PrivateRoute><CriarAgenda /></PrivateRoute>} />
              <Route path="/agenda/marcar" element={<PrivateRoute><MarcarConsulta /></PrivateRoute>} />
              
              <Route path="/convenios" element={<PrivateRoute><Convenios /></PrivateRoute>} />
              <Route path="/clinica" element={<PrivateRoute><DadosClinica /></PrivateRoute>} />
              <Route path="/recepcao" element={<PrivateRoute><Recepcao /></PrivateRoute>} />
              <Route path="/agenda/bloqueios" element={<PrivateRoute><Bloqueios /></PrivateRoute>} />
              <Route path="/configuracoes" element={<PrivateRoute><Configuracoes /></PrivateRoute>} />
              
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
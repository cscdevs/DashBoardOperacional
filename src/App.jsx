import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { RotasSupervisao } from './modules/rotas-supervisao/RotasSupervisao';
import { FluxoAtestadosFaltas } from './modules/fluxo-atestados-faltas/FluxoAtestadosFaltas';
import { GeracaoCartaoPonto } from './modules/geracao-cartao-ponto/GeracaoCartaoPonto';
import { PostoDescoberto } from './modules/posto-descoberto/PostoDescoberto';
import { QuadroOperacional } from './modules/quadro-operacional/QuadroOperacional';
import { Login } from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="relatorios/rotas-supervisao" element={<RotasSupervisao />} />
        <Route path="relatorios/fluxo-atestados-faltas" element={<FluxoAtestadosFaltas />} />
        <Route path="relatorios/geracao-cartao-ponto" element={<GeracaoCartaoPonto />} />
        <Route path="relatorios/posto-descoberto" element={<PostoDescoberto />} />
        <Route path="relatorios/quadro-operacional" element={<QuadroOperacional />} />
        <Route path="usuarios" element={<div style={{padding: '2rem'}}><h1>Gestão de Usuários em Breve</h1></div>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

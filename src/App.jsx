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
import { Usuarios } from './pages/Usuarios';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const ReportRoute = ({ children, reportKey }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Admin tem acesso total; usuários normais precisam estar na lista de relatórios permitidos
  const temAcesso = user.role === 'admin' || (Array.isArray(user.allowedReports) && user.allowedReports.includes(reportKey));
  
  if (!temAcesso) {
    return <Navigate to="/" replace />;
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
        <Route path="relatorios/rotas-supervisao" element={
          <ReportRoute reportKey="rotas-supervisao">
            <RotasSupervisao />
          </ReportRoute>
        } />
        <Route path="relatorios/fluxo-atestados-faltas" element={
          <ReportRoute reportKey="fluxo-atestados-faltas">
            <FluxoAtestadosFaltas />
          </ReportRoute>
        } />
        <Route path="relatorios/geracao-cartao-ponto" element={
          <ReportRoute reportKey="geracao-cartao-ponto">
            <GeracaoCartaoPonto />
          </ReportRoute>
        } />
        <Route path="relatorios/posto-descoberto" element={
          <ReportRoute reportKey="posto-descoberto">
            <PostoDescoberto />
          </ReportRoute>
        } />
        <Route path="relatorios/quadro-operacional" element={
          <ReportRoute reportKey="quadro-operacional">
            <QuadroOperacional />
          </ReportRoute>
        } />
        <Route path="usuarios" element={
          <AdminRoute>
            <Usuarios />
          </AdminRoute>
        } />
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

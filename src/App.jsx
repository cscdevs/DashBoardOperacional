import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="mapa" element={<div><h1>Mapa Detalhado em Breve</h1></div>} />
          <Route path="usuarios" element={<div><h1>Gestão de Usuários em Breve</h1></div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

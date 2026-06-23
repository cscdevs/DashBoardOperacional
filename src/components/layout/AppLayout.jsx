import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Settings, Route as RouteIcon, FileText, Bell, Moon, Sun, Menu, LogOut, X } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/csc-logo.svg';

const navLinkStyle = ({ isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.75rem 1rem',
  borderRadius: '6px',
  textDecoration: 'none',
  color: isActive ? 'var(--blue)' : 'var(--gray-700)',
  backgroundColor: isActive ? 'var(--blue-50)' : 'transparent',
  fontWeight: isActive ? 600 : 500,
  transition: 'all 0.2s ease',
});

export const AppLayout = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const salvo = localStorage.getItem('tema');
    return salvo ? salvo === 'dark' : true; // padrão: modo escuro
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { logout, user } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('tema', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="layout-wrapper">
      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`layout-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={logo} alt="Logo" style={{ height: '32px' }} />
            <h2 style={{ color: 'var(--blue)', fontWeight: 800, margin: 0, fontSize: '1.15rem' }}>Relatórios</h2>
          </div>
          <button className="mobile-menu-btn" onClick={closeSidebar} style={{ padding: 0 }}>
            <X size={24} />
          </button>
        </div>

        <nav style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>
              <NavLink to="/" onClick={closeSidebar} style={navLinkStyle}>
                <LayoutDashboard size={20} />
                Dashboard
              </NavLink>
            </li>
          </ul>

          {/* Grupo: Relatórios */}
          <p style={{ margin: '1.5rem 0 0.5rem', padding: '0 1rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--gray-400)', textTransform: 'uppercase' }}>
            Relatórios
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>
              <NavLink to="/relatorios/rotas-supervisao" onClick={closeSidebar} style={navLinkStyle}>
                <RouteIcon size={20} />
                Rotas de Supervisão
              </NavLink>
            </li>
            <li>
              <NavLink to="/relatorios/fluxo-atestados-faltas" onClick={closeSidebar} style={navLinkStyle}>
                <FileText size={20} />
                Fluxo de Atestados / Faltas
              </NavLink>
            </li>
          </ul>
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--gray-200)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ padding: '0.5rem 1rem', marginBottom: '0.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-500)' }}>Logado como:</p>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-900)' }}>{user?.name || 'Administrador'}</p>
          </div>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '6px', textDecoration: 'none', color: 'var(--gray-700)', fontWeight: 500 }}>
            <Settings size={20} />
            Configurações
          </a>
          <button
            onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--danger)', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left' }}
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="layout-main">
        <header className="layout-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-menu-btn" onClick={toggleSidebar}>
              <Menu size={24} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={toggleTheme}
              className="btn-secondary"
              style={{ borderRadius: '50%', padding: '0.5rem', border: 'none' }}
              title={isDarkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button className="btn-secondary" style={{ borderRadius: '50%', padding: '0.5rem', border: 'none' }}>
              <Bell size={20} />
            </button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="app-container fade-in">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
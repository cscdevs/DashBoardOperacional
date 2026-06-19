import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Settings, Map as MapIcon, Users, Bell, Moon, Sun } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import logo from '../../assets/csc-logo.svg';

export const AppLayout = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <div className="app-layout" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        backgroundColor: 'var(--white)',
        borderRight: '1px solid var(--gray-200)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-sm)',
        zIndex: 10
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src={logo} alt="Logo CSC" style={{ height: '32px' }} />
          <h2 style={{ color: 'var(--blue)', fontWeight: 800, margin: 0, fontSize: '1.25rem' }}>Portal CSC</h2>
        </div>
        
        <nav style={{ flex: 1, padding: '1rem' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>
              <NavLink 
                to="/" 
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: isActive ? 'var(--blue)' : 'var(--gray-700)',
                  backgroundColor: isActive ? 'var(--blue-50)' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s ease'
                })}
              >
                <LayoutDashboard size={20} />
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/mapa" 
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: isActive ? 'var(--blue)' : 'var(--gray-700)',
                  backgroundColor: isActive ? 'var(--blue-50)' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s ease'
                })}
              >
                <MapIcon size={20} />
                Mapa de Bases
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/usuarios" 
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: isActive ? 'var(--blue)' : 'var(--gray-700)',
                  backgroundColor: isActive ? 'var(--blue-50)' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s ease'
                })}
              >
                <Users size={20} />
                Usuários
              </NavLink>
            </li>
          </ul>
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--gray-200)' }}>
          <a href="#" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            textDecoration: 'none',
            color: 'var(--gray-700)',
            fontWeight: 500
          }}>
            <Settings size={20} />
            Configurações
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          height: '64px',
          backgroundColor: 'var(--white)',
          borderBottom: '1px solid var(--gray-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 2rem',
          boxShadow: 'var(--shadow-sm)',
          gap: '1rem',
          zIndex: 5
        }}>
          <button 
            onClick={toggleTheme} 
            className="btn-secondary" 
            style={{ borderRadius: '50%', padding: '0.5rem', border: 'none' }}
            title={isDarkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <button className="btn-secondary" style={{ borderRadius: '50%', padding: '0.5rem', border: 'none' }}>
            <Bell size={20} />
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          <div className="app-container fade-in">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

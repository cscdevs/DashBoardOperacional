import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Settings, Route as RouteIcon, FileText, CalendarClock, Bell, Moon, Sun, Menu, LogOut, X, Search, Monitor, Minimize, RefreshCw } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SpotlightSearch } from './SpotlightSearch';
import { limparCache } from '../../services/api';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false); // Desktop
  
  const [isTvMode, setIsTvMode] = useState(false);
  const [isTvModeIdle, setIsTvModeIdle] = useState(false);
  const idleTimerRef = useRef(null);

  // Modo TV: escala o conteúdo para caber 100% na tela (qualquer resolução),
  // sem barra de rolagem. Mede o conteúdo "natural" e calcula o fator.
  const fitOuterRef = useRef(null);
  const fitInnerRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);

  const { logout, user } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('tema', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // TV Mode: escuta saída do fullscreen (ex: usuário aperta ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsTvMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // TV Mode: oculta botão de sair após inatividade do mouse
  useEffect(() => {
    if (!isTvMode) return;

    const resetIdleTimer = () => {
      setIsTvModeIdle(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setIsTvModeIdle(true);
      }, 2500); // 2.5s parado oculta
    };

    window.addEventListener('mousemove', resetIdleTimer);
    resetIdleTimer(); // inicia na primeira vez

    return () => {
      window.removeEventListener('mousemove', resetIdleTimer);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isTvMode]);

  // Recalcula o fator de escala do Modo TV sempre que o conteúdo, a janela ou
  // o próprio modo mudarem. Como `transform: scale` não altera o layout-box, a
  // medição (scrollWidth/Height) continua sendo a do conteúdo em escala 1:1 —
  // não há loop de realimentação.
  useEffect(() => {
    if (!isTvMode) {
      setFitScale(1);
      return undefined;
    }
    const inner = fitInnerRef.current;
    const outer = fitOuterRef.current;
    if (!inner || !outer) return undefined;

    const recompute = () => {
      const dispW = outer.clientWidth;
      const dispH = outer.clientHeight;
      const contW = inner.scrollWidth;
      const contH = inner.scrollHeight;
      if (!contW || !contH) return;
      // Nunca amplia (máx. 1); só reduz o necessário para caber por inteiro.
      setFitScale(Math.min(1, dispW / contW, dispH / contH));
    };

    const ro = new ResizeObserver(recompute);
    ro.observe(inner);
    ro.observe(outer);
    window.addEventListener('resize', recompute);
    recompute();
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, [isTvMode]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  
  const handleMenuClick = () => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(!isSidebarOpen);
    } else {
      setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed);
    }
  };
  
  const closeSidebar = () => setIsSidebarOpen(false);

  const enterTvMode = () => {
    document.documentElement.requestFullscreen().catch((err) => {
      console.warn('Erro ao entrar em fullscreen:', err);
    });
    setIsTvMode(true);
  };

  const exitTvMode = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setIsTvMode(false);
  };

  // Limpa o cache do backend e recarrega para trazer os dados frescos do banco.
  const atualizarDados = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await limparCache();
    } catch (err) {
      console.error('Falha ao limpar o cache:', err);
    } finally {
      window.location.reload();
    }
  };

  return (
    <div className={`layout-wrapper ${isTvMode ? 'tv-mode-active' : ''} ${isTvModeIdle ? 'tv-mode-idle' : ''}`}>
      <div className="ambient-background" />
      
      {/* Botão de Sair do Modo TV (Flutuante) */}
      {isTvMode && (
        <button className="tv-exit-btn" onClick={exitTvMode}>
          <Minimize size={18} /> Sair do Modo TV
        </button>
      )}

      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`layout-sidebar ${isSidebarOpen ? 'open' : ''} ${isDesktopSidebarCollapsed ? 'collapsed' : ''}`}>
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
            <li>
              <NavLink to="/relatorios/geracao-cartao-ponto" onClick={closeSidebar} style={navLinkStyle}>
                <CalendarClock size={20} />
                Geração de Cartão de Ponto
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
            <button className="mobile-menu-btn" onClick={handleMenuClick}>
              <Menu size={24} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} className="header-actions">
            {/* Search Button for Spotlight */}
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '24px', padding: '0.4rem 0.8rem', border: '1px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-500)' }}
              title="Busca Global (Ctrl + K)"
            >
              <Search size={16} />
              <span style={{ fontSize: '0.8rem' }} className="hide-on-mobile">Busca...</span>
              <kbd style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', background: 'var(--white)', borderRadius: '4px', border: '1px solid var(--gray-200)' }} className="hide-on-mobile">Ctrl+K</kbd>
            </button>

            <button
              onClick={atualizarDados}
              disabled={isRefreshing}
              className="btn-secondary"
              style={{ borderRadius: '50%', padding: '0.5rem', border: 'none', cursor: isRefreshing ? 'wait' : 'pointer' }}
              title="Atualizar dados (limpa o cache e recarrega do banco)"
            >
              <RefreshCw size={20} style={isRefreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
            </button>

            <button
              onClick={enterTvMode}
              className="btn-secondary"
              style={{ borderRadius: '50%', padding: '0.5rem', border: 'none' }}
              title="Entrar no Modo TV"
            >
              <Monitor size={20} />
            </button>

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

        <SpotlightSearch />

        <div
          ref={fitOuterRef}
          className="layout-content"
          style={{ flex: 1, overflowY: 'auto', padding: '2rem 1rem' }}
        >
          <div
            ref={fitInnerRef}
            className="app-container fade-in"
            style={isTvMode ? { transform: `scale(${fitScale})`, transformOrigin: 'top center' } : undefined}
          >
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
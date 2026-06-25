import React, { useState, useEffect, useRef } from 'react';
import { Search, Route as RouteIcon, FileText, CalendarClock, LayoutDashboard, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LINKS = [
  { id: 'dashboard', path: '/', label: 'Dashboard Inicial', icone: LayoutDashboard },
  { id: 'rotas', path: '/relatorios/rotas-supervisao', label: 'Rotas de Supervisão', icone: RouteIcon },
  { id: 'atestados', path: '/relatorios/fluxo-atestados-faltas', label: 'Fluxo de Atestados e Faltas', icone: FileText },
  { id: 'cartao', path: '/relatorios/geracao-cartao-ponto', label: 'Geração de Cartão de Ponto', icone: CalendarClock },
];

export const SpotlightSearch = ({ isDesktopOnly = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50);
    }
  }, [isOpen]);

  const filteredLinks = LINKS.filter(link => 
    link.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleKeyDownModal = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredLinks.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredLinks.length) % filteredLinks.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredLinks[selectedIndex]) {
        handleSelect(filteredLinks[selectedIndex].path);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="spotlight-overlay open" onClick={() => setIsOpen(false)}>
      <div className="spotlight-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--gray-200)' }}>
          <Search size={20} style={{ color: 'var(--gray-400)', marginRight: '1rem' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="O que você está procurando?"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownModal}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '1.25rem',
              color: 'var(--gray-900)',
              fontFamily: 'Montserrat, sans-serif'
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <kbd style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', background: 'var(--gray-100)', borderRadius: '4px', color: 'var(--gray-500)', border: '1px solid var(--gray-200)' }}>ESC</kbd>
          </div>
        </div>

        <div style={{ padding: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
          {filteredLinks.length > 0 ? (
            filteredLinks.map((link, i) => {
              const Icone = link.icone;
              const isSelected = i === selectedIndex;
              return (
                <div
                  key={link.id}
                  onClick={() => handleSelect(link.path)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--blue-50)' : 'transparent',
                    color: isSelected ? 'var(--blue)' : 'var(--gray-700)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Icone size={20} style={{ color: isSelected ? 'var(--blue)' : 'var(--gray-500)' }} />
                    <span style={{ fontWeight: isSelected ? 600 : 500 }}>{link.label}</span>
                  </div>
                  {isSelected && <ArrowRight size={18} style={{ color: 'var(--blue)' }} />}
                </div>
              );
            })
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>
              Nenhum resultado encontrado.
            </div>
          )}
        </div>
        
        <div style={{ padding: '0.75rem 1.5rem', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)', fontSize: '0.75rem', color: 'var(--gray-500)', display: 'flex', gap: '1rem' }}>
          <span>Use <kbd style={{ fontFamily: 'sans-serif' }}>↑</kbd> <kbd style={{ fontFamily: 'sans-serif' }}>↓</kbd> para navegar</span>
          <span><kbd style={{ fontFamily: 'sans-serif' }}>Enter</kbd> para abrir</span>
        </div>
      </div>
    </div>
  );
};

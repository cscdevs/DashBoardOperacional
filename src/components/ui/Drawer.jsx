import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Drawer = ({ isOpen, onClose, title, children }) => {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  return (
    <>
      <div 
        className={`drawer-overlay ${isOpen ? 'open' : ''}`} 
        onClick={onClose} 
      />
      <div className={`drawer-content ${isOpen ? 'open' : ''}`}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '1.5rem', 
          borderBottom: '1px solid var(--gray-200)' 
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--gray-900)' }}>{title}</h2>
          <button 
            onClick={onClose} 
            className="btn-secondary" 
            style={{ borderRadius: '50%', padding: '0.5rem', border: 'none' }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {children}
        </div>
      </div>
    </>
  );
};

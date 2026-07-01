import React, { useState, useRef, useEffect } from 'react';
import { KeyRound, LogOut, Lock, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';

// Iniciais do nome: primeira letra do primeiro e do último nome (ex.: "João Silva" -> "JS").
function obterIniciais(nome) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] || '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

export const PerfilMenu = () => {
  const { user, logout, trocarSenha } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const menuRef = useRef(null);

  // Campos do modal de troca voluntária
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    if (!menuAberto) return undefined;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAberto(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuAberto]);

  const abrirModal = () => {
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmar('');
    setError('');
    setSucesso(false);
    setMenuAberto(false);
    setModalAberto(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (novaSenha.length < 6) return setError('A nova senha deve ter pelo menos 6 caracteres.');
    if (novaSenha !== confirmar) return setError('As senhas não conferem.');

    setSalvando(true);
    try {
      await trocarSenha(senhaAtual, novaSenha);
      setSucesso(true);
      setTimeout(() => setModalAberto(false), 1200);
    } catch (err) {
      setError(err.message || 'Não foi possível alterar a senha.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setMenuAberto((v) => !v)}
        title={user?.name}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          backgroundColor: 'var(--blue)',
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {obterIniciais(user?.name)}
      </button>

      {menuAberto && (
        <div
          className="fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            minWidth: '220px',
            backgroundColor: 'var(--card-bg, var(--glass-bg))',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--gray-200)',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-lg)',
            padding: '0.5rem',
            zIndex: 50,
          }}
        >
          <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--gray-200)', marginBottom: '0.25rem' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
          </div>

          <button onClick={abrirModal} style={itemStyle}>
            <KeyRound size={16} /> Trocar senha
          </button>
          <button onClick={logout} style={{ ...itemStyle, color: 'var(--danger)' }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      )}

      <Modal isOpen={modalAberto} onClose={() => setModalAberto(false)} titulo="Trocar senha">
        {sucesso ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)', padding: '1rem 0', fontWeight: 600 }}>
            <Check size={20} /> Senha alterada com sucesso!
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {error && (
              <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--danger-border)', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} /> {error}
              </div>
            )}
            <CampoSenha label="Senha atual" value={senhaAtual} onChange={setSenhaAtual} placeholder="Sua senha atual" />
            <CampoSenha label="Nova senha" value={novaSenha} onChange={setNovaSenha} placeholder="Mínimo 6 caracteres" />
            <CampoSenha label="Confirmar nova senha" value={confirmar} onChange={setConfirmar} placeholder="Repita a nova senha" />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--gray-200)', paddingTop: '1.25rem' }}>
              <button type="button" onClick={() => setModalAberto(false)} className="btn-secondary" style={{ padding: '0.6rem 1.25rem' }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={salvando} style={{ padding: '0.6rem 1.5rem', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

const itemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  width: '100%',
  padding: '0.6rem 0.75rem',
  border: 'none',
  background: 'transparent',
  color: 'var(--gray-700)',
  fontWeight: 500,
  fontSize: '0.875rem',
  cursor: 'pointer',
  borderRadius: '6px',
  textAlign: 'left',
  fontFamily: 'Montserrat, sans-serif',
};

const CampoSenha = ({ label, value, onChange, placeholder }) => (
  <div>
    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>{label}</label>
    <div style={{ position: 'relative' }}>
      <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
      <input
        type="password"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '0.75rem 1rem 0.75rem 2.75rem',
          borderRadius: '6px',
          border: '1px solid var(--gray-200)',
          fontSize: '0.875rem',
          fontFamily: 'Montserrat, sans-serif',
          outline: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          color: 'var(--gray-900)',
        }}
      />
    </div>
  </div>
);

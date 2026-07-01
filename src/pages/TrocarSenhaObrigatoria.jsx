import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, ShieldCheck } from 'lucide-react';
import logo from '../assets/csc-logo.svg';
import bgLogin from '../assets/tech-login.png';

/**
 * Tela exibida no primeiro acesso (ou após o admin redefinir a senha).
 * Enquanto o usuário estiver com a senha padrão, é obrigado a definir uma nova.
 */
export const TrocarSenhaObrigatoria = () => {
  const { user, trocarSenha, logout } = useAuth();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (novaSenha.length < 6) {
      return setError('A nova senha deve ter pelo menos 6 caracteres.');
    }
    if (novaSenha !== confirmar) {
      return setError('As senhas não conferem.');
    }

    setIsLoading(true);
    try {
      // Na troca obrigatória o backend dispensa a senha atual.
      await trocarSenha('', novaSenha);
      // Ao zerar mustChangePassword, o ProtectedRoute passa a renderizar o app.
    } catch (err) {
      setError(err.message || 'Não foi possível alterar a senha.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(rgba(16, 24, 40, 0.4), rgba(16, 24, 40, 0.8)), url(${bgLogin})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: '1rem',
    }}>
      <div className="card fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        padding: '2.5rem 2rem',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src={logo} alt="Logo CSC" style={{ height: '44px', marginBottom: '1rem' }} />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--blue)', marginBottom: '0.5rem' }}>
            <ShieldCheck size={20} />
            <h1 style={{ color: 'var(--gray-900)', fontSize: '1.35rem', margin: 0 }}>Defina sua senha</h1>
          </div>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
            Olá, <strong>{user?.name}</strong>. Por segurança, crie uma nova senha
            pessoal para continuar.
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger)',
            padding: '0.75rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            marginBottom: '1.25rem',
            border: '1px solid var(--danger-border)',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <SenhaInput label="Nova senha" value={novaSenha} onChange={setNovaSenha} placeholder="Mínimo 6 caracteres" />
          <SenhaInput label="Confirmar nova senha" value={confirmar} onChange={setConfirmar} placeholder="Repita a nova senha" />

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            style={{
              marginTop: '0.5rem',
              padding: '0.875rem',
              fontSize: '1rem',
              width: '100%',
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Salvando...' : 'Salvar e entrar'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            type="button"
            onClick={logout}
            style={{ background: 'none', border: 'none', color: 'var(--gray-400)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
};

const SenhaInput = ({ label, value, onChange, placeholder }) => (
  <div>
    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
      {label}
    </label>
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
          backgroundColor: 'var(--gray-50)',
          color: 'var(--gray-900)'
        }}
      />
    </div>
  </div>
);

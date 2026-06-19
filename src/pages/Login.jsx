import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, MapPin } from 'lucide-react';
import logo from '../assets/csc-logo.svg';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
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
      background: 'linear-gradient(135deg, var(--gray-50) 0%, var(--gray-200) 100%)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Background Elements */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        background: 'var(--blue-50)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        top: '-200px',
        left: '-200px',
        opacity: 0.6,
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'var(--blue-100)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        bottom: '-100px',
        right: '-100px',
        opacity: 0.4,
        zIndex: 0
      }} />

      {/* Login Card */}
      <div className="card fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        position: 'relative',
        zIndex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        padding: '2.5rem 2rem',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src={logo} alt="Logo CSC" style={{ height: '48px', marginBottom: '1rem' }} />
          <h1 style={{ color: 'var(--gray-900)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Portal CSC</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Acesso ao Dashboard Organizacional</p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger)',
            padding: '0.75rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            border: '1px solid var(--danger-border)',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
              E-mail
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pportz.com.br"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--gray-200)',
                  fontSize: '0.875rem',
                  fontFamily: 'Montserrat, sans-serif',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  backgroundColor: 'var(--white)',
                  color: 'var(--gray-900)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--blue)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--gray-200)'}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--gray-200)',
                  fontSize: '0.875rem',
                  fontFamily: 'Montserrat, sans-serif',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  backgroundColor: 'var(--white)',
                  color: 'var(--gray-900)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--blue)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--gray-200)'}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isLoading}
            style={{ 
              marginTop: '1rem', 
              padding: '0.875rem', 
              fontSize: '1rem',
              width: '100%',
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Acessando...' : 'Entrar na Plataforma'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.75rem' }}>
          <p>Uso exclusivo pportz tecnologia.</p>
        </div>
      </div>
    </div>
  );
};

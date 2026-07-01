import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginAPI, logoutAPI, fetchMeAPI, trocarSenhaAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verifica o token no localStorage e valida com o backend ao carregar
  useEffect(() => {
    const inicializarAuth = async () => {
      const storedUser = localStorage.getItem('dashboard_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed && parsed.token) {
            // Valida o token chamando /api/auth/me
            const data = await fetchMeAPI();
            // Mantém o token no estado local
            setUser({ ...data.user, token: parsed.token });
          } else {
            localStorage.removeItem('dashboard_user');
          }
        } catch (e) {
          console.warn('[auth] Falha ao validar token salvo. Efetuando logout local.');
          localStorage.removeItem('dashboard_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    inicializarAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await loginAPI(email, password);
      if (data && data.token && data.user) {
        const userData = { ...data.user, token: data.token };
        setUser(userData);
        localStorage.setItem('dashboard_user', JSON.stringify(userData));
        return true;
      } else {
        throw new Error('Resposta de login inválida do servidor.');
      }
    } catch (err) {
      throw new Error(err.message || 'Credenciais inválidas');
    }
  };

  // Troca a senha do usuário logado e atualiza o estado local (some a exigência
  // de troca obrigatória). Na troca obrigatória, senhaAtual pode vir vazia.
  const trocarSenha = async (senhaAtual, novaSenha) => {
    await trocarSenhaAPI(senhaAtual, novaSenha);
    setUser((prev) => {
      if (!prev) return prev;
      const atualizado = { ...prev, mustChangePassword: false };
      localStorage.setItem('dashboard_user', JSON.stringify(atualizado));
      return atualizado;
    });
  };

  const logout = async () => {
    try {
      await logoutAPI();
    } catch (err) {
      console.warn('[auth] Erro ao chamar logout no servidor:', err.message);
    } finally {
      setUser(null);
      localStorage.removeItem('dashboard_user');
    }
  };

  const value = {
    user,
    login,
    logout,
    trocarSenha,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

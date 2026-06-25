import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('dashboard_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('dashboard_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // Simulated API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email === 'csc.devapoio@gmail.com' && password === 'SPTK.0509.EVE') {
          const userData = { email, role: 'admin', name: 'Administrador' };
          setUser(userData);
          localStorage.setItem('dashboard_user', JSON.stringify(userData));
          resolve(true);
        } else {
          reject(new Error('Credenciais inválidas'));
        }
      }, 800);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('dashboard_user');
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

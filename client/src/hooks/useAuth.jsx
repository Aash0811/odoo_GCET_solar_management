import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('sunpower_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('sunpower_token'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && !user) {
      authApi
        .getMe()
        .then((res) => {
          if (res.data?.data) {
            setUser(res.data.data);
            localStorage.setItem('sunpower_user', JSON.stringify(res.data.data));
          }
        })
        .catch(() => {
          logout();
        });
    }
  }, [token]);

  const login = async (identifier, password) => {
    setLoading(true);
    try {
      const res = await authApi.login({ identifier, password });
      const { token: jwtToken, user: userData } = res.data.data;
      setToken(jwtToken);
      setUser(userData);
      localStorage.setItem('sunpower_token', jwtToken);
      localStorage.setItem('sunpower_user', JSON.stringify(userData));
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const register = async (registerData) => {
    setLoading(true);
    try {
      const res = await authApi.register(registerData);
      const { token: jwtToken, user: userData } = res.data.data;
      setToken(jwtToken);
      setUser(userData);
      localStorage.setItem('sunpower_token', jwtToken);
      localStorage.setItem('sunpower_user', JSON.stringify(userData));
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('sunpower_token');
    localStorage.removeItem('sunpower_user');
  };

  // Quick switch role utility for hackathon demos
  const quickSwitchRole = async (targetRole) => {
    const roleEmails = {
      ADMIN: 'admin@sunpower.com',
      SALESMAN: 'sales@sunpower.com',
      WAREHOUSE: 'warehouse@sunpower.com',
      TECHNICIAN: 'tech@sunpower.com',
      SUPPORT: 'support@sunpower.com',
      CUSTOMER: 'customer@sunpower.com',
    };
    const email = roleEmails[targetRole] || 'admin@sunpower.com';
    return await login(email, 'password123');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        quickSwitchRole,
        isAuthenticated: Boolean(token && user),
        role: user?.role,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

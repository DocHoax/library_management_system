import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import ApiService, { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const data = await authApi.me();
      setUser(data.user);
    } catch {
      ApiService.setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('lms_token');
    if (token) {
      ApiService.setToken(token);
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    ApiService.setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (data) => {
    const response = await authApi.register(data);
    ApiService.setToken(response.token);
    setUser(response.user);
    return response.user;
  };

  const logout = () => {
    ApiService.setToken(null);
    setUser(null);
  };

  const value = { user, login, register, logout, loading, refreshUser: fetchUser };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

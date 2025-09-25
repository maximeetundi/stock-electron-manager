import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { authApi, appApi } from '@/utils/apiClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('light');

  const login = useCallback(async (password) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.login(password);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      setError(err.message || 'Mot de passe incorrect');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  const toggleTheme = useCallback(async () => {
    try {
      const mode = await appApi.toggleTheme();
      setTheme(mode);
      document.documentElement.classList.toggle('dark', mode === 'dark');
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchTheme = useCallback(async () => {
    try {
      const mode = await appApi.getTheme();
      setTheme(mode);
      document.documentElement.classList.toggle('dark', mode === 'dark');
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchTheme();
    const unsubscribe = window.api?.onThemeUpdated?.((mode) => {
      setTheme(mode);
      document.documentElement.classList.toggle('dark', mode === 'dark');
    });
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [fetchTheme]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      loading,
      error,
      login,
      logout,
      theme,
      toggleTheme
    }),
    [isAuthenticated, loading, error, login, logout, theme, toggleTheme]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider');
  }
  return context;
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { authApi, appApi } from '@/utils/apiClient';

const AuthContext = createContext();
const SESSION_STORAGE_KEY = 'ef-session';
const SESSION_DURATION_KEY = 'ef-session-duration';
const DEFAULT_SESSION_HOURS = 24;

const readStoredSession = () => {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const readStoredDuration = () => {
  try {
    const raw = window.localStorage.getItem(SESSION_DURATION_KEY);
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SESSION_HOURS;
};

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('light');
  const [sessionDurationHours, setSessionDurationHours] = useState(readStoredDuration);
  const expiryTimeoutRef = useRef(null);

  const clearExpiryTimeout = useCallback(() => {
    if (expiryTimeoutRef.current) {
      clearTimeout(expiryTimeoutRef.current);
      expiryTimeoutRef.current = null;
    }
  }, []);

  const scheduleExpiry = useCallback(
    (expiresAt) => {
      clearExpiryTimeout();
      const delay = Math.max(expiresAt - Date.now(), 0);
      if (Number.isFinite(delay)) {
        expiryTimeoutRef.current = setTimeout(() => {
          window.localStorage.removeItem(SESSION_STORAGE_KEY);
          setIsAuthenticated(false);
        }, delay);
      }
    },
    [clearExpiryTimeout]
  );

  const persistSession = useCallback(
    (durationHours) => {
      const safeHours = Number.isFinite(durationHours) && durationHours > 0 ? durationHours : DEFAULT_SESSION_HOURS;
      const expiresAt = Date.now() + safeHours * 60 * 60 * 1000;
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ expiresAt }));
      scheduleExpiry(expiresAt);
    },
    [scheduleExpiry]
  );

  const login = useCallback(async (password) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.login(password);
      setIsAuthenticated(true);
       persistSession(sessionDurationHours);
      return true;
    } catch (err) {
      setError(err.message || 'Mot de passe incorrect');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    clearExpiryTimeout();
    setIsAuthenticated(false);
  }, [clearExpiryTimeout]);

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
      clearExpiryTimeout();
    };
  }, [fetchTheme, clearExpiryTimeout]);

  useEffect(() => {
    (async () => {
      try {
        const settings = await appApi.getSettings();
        const hours = Number(settings?.session_duration_hours);
        if (Number.isFinite(hours) && hours > 0) {
          setSessionDurationHours(hours);
          window.localStorage.setItem(SESSION_DURATION_KEY, String(hours));
        }
      } catch {
        // ignore: fallback already set
      }
    })();
  }, []);

  useEffect(() => {
    const stored = readStoredSession();
    if (stored?.expiresAt && stored.expiresAt > Date.now()) {
      setIsAuthenticated(true);
      scheduleExpiry(stored.expiresAt);
    } else if (stored) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [scheduleExpiry]);

  useEffect(() => {
    const handler = (event) => {
      if (typeof event.detail === 'number' && event.detail > 0) {
        setSessionDurationHours(event.detail);
        window.localStorage.setItem(SESSION_DURATION_KEY, String(event.detail));
      }
    };
    window.addEventListener('ef-session-duration-updated', handler);
    return () => window.removeEventListener('ef-session-duration-updated', handler);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      persistSession(sessionDurationHours);
    }
  }, [isAuthenticated, sessionDurationHours, persistSession]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      loading,
      error,
      login,
      logout,
      theme,
      toggleTheme,
      sessionDurationHours
    }),
    [isAuthenticated, loading, error, login, logout, theme, toggleTheme, sessionDurationHours]
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

import React, { createContext, useContext, useState, useEffect } from 'react';

const AppModeContext = createContext();

export const APP_MODES = {
  FINANCE: 'finance',
  STOCK: 'stock',
  ALL: 'all'
};

export function AppModeProvider({ children }) {
  const [appMode, setAppMode] = useState(() => {
    // Charger le mode depuis localStorage, par défaut "finance"
    const savedMode = localStorage.getItem('appMode');
    return savedMode || APP_MODES.FINANCE;
  });

  useEffect(() => {
    // Sauvegarder le mode dans localStorage quand il change
    localStorage.setItem('appMode', appMode);
  }, [appMode]);

  const changeMode = (newMode) => {
    if (Object.values(APP_MODES).includes(newMode)) {
      setAppMode(newMode);
    }
  };

  const value = {
    appMode,
    changeMode,
    isFinanceMode: appMode === APP_MODES.FINANCE,
    isStockMode: appMode === APP_MODES.STOCK,
    isAllMode: appMode === APP_MODES.ALL
  };

  return (
    <AppModeContext.Provider value={value}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error('useAppMode must be used within AppModeProvider');
  }
  return context;
}

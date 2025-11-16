import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './state/AuthContext.jsx';
import { AppModeProvider } from './state/AppModeContext.jsx';
import './index.css';

// In packaged Electron, the app runs with file:// protocol. BrowserRouter will try to resolve
// "/login" as file://c:/login (ERR_FILE_NOT_FOUND). Use HashRouter in that case.
const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <AppModeProvider>
          <App />
        </AppModeProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);

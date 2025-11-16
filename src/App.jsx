import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext.jsx';
import LoginPage from '@/pages/LoginPage.jsx';
import DashboardPage from '@/pages/DashboardPage.jsx';
import NewTransactionPage from '@/pages/NewTransactionPage.jsx';
import StatisticsPage from '@/pages/StatisticsPage.jsx';
import ReportsPage from '@/pages/reports/ReportsPage.jsx';
import SettingsPage from '@/pages/SettingsPage.jsx';
import BackupPage from '@/pages/BackupPage.jsx';
import AboutPage from '@/pages/AboutPage.jsx';
import StockPage from '@/pages/StockPage.jsx';
import BonsCommandePage from '@/pages/BonsCommandePage.jsx';
import StockReportsPage from '@/pages/StockReportsPage.jsx';
import AppLayout from '@/components/layout/AppLayout.jsx';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="operations" element={<NewTransactionPage />} />
        <Route path="statistiques" element={<StatisticsPage />} />
        <Route path="rapports" element={<ReportsPage />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="bons-commande" element={<BonsCommandePage />} />
        <Route path="rapports-stock" element={<StockReportsPage />} />
        <Route path="sauvegarde" element={<BackupPage />} />
        <Route path="parametres" element={<SettingsPage />} />
        <Route path="apropos" element={<AboutPage />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
    </Routes>
  );
}

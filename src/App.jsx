import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext.jsx';
import LoginPage from '@/pages/LoginPage.jsx';
import DashboardPage from '@/pages/DashboardPage.jsx';
import NewTransactionPage from '@/pages/NewTransactionPage.jsx';
import StatisticsPage from '@/pages/StatisticsPage.jsx';
import ReportsPage from '@/pages/reports/ReportsPage.jsx';
import SettingsPage from '@/pages/SettingsPage.jsx';
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
        <Route path="parametres" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
    </Routes>
  );
}

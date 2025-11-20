import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Bars3BottomLeftIcon,
  BanknotesIcon,
  ChartPieIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
  DocumentArrowDownIcon,
  SunIcon,
  MoonIcon,
  ArrowLeftOnRectangleIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  ChartBarSquareIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/state/AuthContext.jsx';
import { useAppMode, APP_MODES } from '@/state/AppModeContext.jsx';
import FloatingActionButton from '@/components/stock/FloatingActionButton';
import classNames from 'classnames';
import pkg from '../../../package.json';

const navigation = [
  { name: 'Dashboard', to: '/', icon: ChartPieIcon, modes: ['finance', 'stock', 'all'] },
  { name: 'Nouvelle opération', to: '/operations', icon: BanknotesIcon, modes: ['finance', 'all'] },
  { name: 'Statistiques', to: '/statistiques', icon: DocumentChartBarIcon, modes: ['finance', 'all'] },
  { name: 'Rapports finances', to: '/rapports', icon: DocumentArrowDownIcon, modes: ['finance', 'all'] },
  { name: 'Gestion de stock', to: '/stock', icon: CubeIcon, modes: ['stock', 'all'] },
  { name: 'Mouvements de stock', to: '/mouvements', icon: ArrowsRightLeftIcon, modes: ['stock', 'all'] },
  { name: 'Bons de commande', to: '/bons-commande', icon: ClipboardDocumentListIcon, modes: ['stock', 'all'] },
  { name: 'Rapports stock', to: '/rapports-stock', icon: ChartBarSquareIcon, modes: ['stock', 'all'] },
  { name: 'Sauvegarde', to: '/sauvegarde', icon: DocumentArrowDownIcon, modes: ['finance', 'stock', 'all'] },
  { name: 'Paramètres', to: '/parametres', icon: Cog6ToothIcon, modes: ['finance', 'stock', 'all'] },
  { name: 'À propos', to: '/apropos', icon: Bars3BottomLeftIcon, modes: ['finance', 'stock', 'all'] }
];

export default function AppLayout() {
  const { logout, theme, toggleTheme } = useAuth();
  const { appMode } = useAppMode();
  const location = useLocation();

  // Filtrer la navigation selon le mode actif
  const filteredNavigation = navigation.filter(item => 
    item.modes.includes(appMode)
  );

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950">
      <aside className="hidden w-72 flex-shrink-0 border-r border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:flex lg:flex-col">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500 text-white shadow-lg shadow-primary-500/30">
            <Bars3BottomLeftIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-500">Complexe scolaire</p>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Ecole Finances</h1>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-4">
          {filteredNavigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                classNames(
                  'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 pb-6">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:border-primary-500 hover:text-primary-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-primary-400 dark:hover:text-primary-300"
          >
            <span className="flex items-center gap-2">
              {theme === 'dark' ? (
                <SunIcon className="h-5 w-5 text-amber-400" />
              ) : (
                <MoonIcon className="h-5 w-5 text-indigo-400" />
              )}
              Mode {theme === 'dark' ? 'clair' : 'sombre'}
            </span>
            <span className="text-xs uppercase tracking-wide text-slate-400">Basculer</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:bg-slate-700 dark:bg-primary-500 dark:hover:bg-primary-400"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            Se déconnecter
          </button>
          <div className="mt-3 text-center text-xs text-slate-400">
            Version {pkg?.version || '0.0.0'}
          </div>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {filteredNavigation.find((item) => item.to === location.pathname)?.name || 'Tableau de bord'}
            </h2>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950/80">
          <div className="mx-auto max-w-7xl space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Bouton flottant pour actions rapides */}
      <FloatingActionButton />
    </div>
  );
}

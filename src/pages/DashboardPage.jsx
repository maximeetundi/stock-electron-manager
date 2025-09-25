import React, { useEffect, useMemo, useState } from 'react';
import MetricCard from '@/components/dashboard/MetricCard.jsx';
import { dashboardApi, transactionsApi, PERIOD_OPTIONS } from '@/utils/apiClient';
import RecentTransactions from '@/components/dashboard/RecentTransactions.jsx';
import { ChartBarIcon, ClockIcon } from '@heroicons/react/24/outline';

const PERIODS = ['day', 'week', 'month', 'quarter', 'semester', 'year'];
const PERIOD_CHOICES = [
  { key: 'all', label: 'Toutes les périodes' },
  ...PERIOD_OPTIONS.filter((option) => option.key !== 'custom').map((option) => ({
    key: option.key,
    label: option.label
  }))
];

export default function DashboardPage() {
  const [totals, setTotals] = useState({});
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [totalsResponse, recentResponse] = await Promise.all([
          dashboardApi.totals(),
          transactionsApi.recent(6)
        ]);
        setTotals(totalsResponse || {});
        setRecentTransactions(recentResponse || []);
      } catch (err) {
        setError(err.message || 'Impossible de charger le tableau de bord');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          <ChartBarIcon className="h-6 w-6 text-primary-500" />
          Vue d’ensemble des flux financiers
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Suivi des totaux par période de référence.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PERIOD_CHOICES.map((option) => {
            const isActive = selectedPeriod === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setSelectedPeriod(option.key)}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                  isActive
                    ? 'border-primary-500 bg-primary-500 text-white shadow shadow-primary-500/30'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-primary-500 hover:text-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
          {selectedPeriod === 'all'
            ? 'Toutes les périodes affichées'
            : `Période sélectionnée : ${PERIOD_CHOICES.find((option) => option.key === selectedPeriod)?.label ?? ''}`}
        </p>
        {loading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(selectedPeriod === 'all' ? PERIODS : [selectedPeriod]).map((period) => (
              <div
                key={period}
                className="animate-pulse rounded-3xl bg-slate-200/60 p-6 dark:bg-slate-800/60"
              >
                <div className="h-5 w-28 rounded-full bg-slate-300/80" />
                <div className="mt-6 h-5 w-20 rounded-full bg-slate-300/60" />
                <div className="mt-6 h-32 rounded-2xl bg-slate-300/40" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(selectedPeriod === 'all' ? PERIODS : [selectedPeriod]).map((period) => (
              <MetricCard key={period} period={period} totals={totals[period]} />
            ))}
          </div>
        )}
        {error && (
          <p className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </p>
        )}
      </section>
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <ClockIcon className="h-5 w-5 text-primary-500" />
              Dernières opérations enregistrées
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Aperçu des mouvements récents.</p>
          </div>
        </div>
        <RecentTransactions transactions={recentTransactions} loading={loading} />
      </section>
    </div>
  );
}

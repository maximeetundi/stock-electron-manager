import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card.jsx';
import PeriodSelector from '@/components/common/PeriodSelector.jsx';
import TransactionsTable from '@/components/tables/TransactionsTable.jsx';
import { formatCurrency } from '@/utils/format';
import { categoriesApi, transactionsApi } from '@/utils/apiClient';
import {
  ChartBarIcon,
  ChartPieIcon,
  AdjustmentsHorizontalIcon,
  TagIcon,
  DocumentMagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#4f46e5', '#22c55e', '#e11d48', '#f97316', '#06b6d4', '#db2777'];

export default function StatisticsPage() {
  const [filters, setFilters] = useState({
    period: 'month',
    categoryId: '',
    referenceDate: new Date().toISOString().slice(0, 10),
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoriesError, setCategoriesError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoriesApi.list();
        setCategories(response ?? []);
      } catch (err) {
        setCategoriesError(err.message || 'Impossible de charger les catégories');
      }
    };

    fetchCategories();
  }, []);

  const handlePeriodChange = useCallback((value) => {
    setFilters((prev) => {
      const next = { ...prev, ...value };
      if (value.period && value.period !== 'custom') {
        next.startDate = '';
        next.endDate = '';
      }
      if (value.referenceDate) {
        next.referenceDate = value.referenceDate;
      }
      if ((value.startDate || value.endDate) && !value.period) {
        next.period = 'custom';
      }
      return next;
    });
  }, []);

  const handleCategoryChange = useCallback((event) => {
    const value = event.target.value;
    setFilters((prev) => ({
      ...prev,
      categoryId: value
    }));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await transactionsApi.byPeriod(filters);
        setData(response);
      } catch (err) {
        setError(err.message || 'Impossible de charger les statistiques');
      } finally {
        setLoading(false);
      }
    };

    if (filters.period === 'custom' && (!filters.startDate || !filters.endDate)) {
      return;
    }

    fetchData();
  }, [filters]);

  const selectedCategory = useMemo(() => {
    if (!filters.categoryId) {
      return null;
    }
    const id = Number(filters.categoryId);
    if (Number.isNaN(id)) {
      return null;
    }
    return categories.find((category) => Number(category.id) === id) || null;
  }, [categories, filters.categoryId]);

  const categoryLabel = selectedCategory ? `Catégorie : ${selectedCategory.nom}` : 'Toutes les catégories';

  const chartData = useMemo(() => data?.categoryBreakdown ?? [], [data]);

  const pieData = useMemo(
    () =>
      chartData
        .map((item) => ({
          name: item.categorie,
          value: item.entree - item.sortie
        }))
        .filter((item) => Math.abs(item.value) > 0.001),
    [chartData]
  );

  return (
    <div className="space-y-8">
      <header className="rounded-3xl bg-white/80 p-8 shadow-xl dark:bg-slate-900/80">
        <h1 className="flex items-center gap-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          <ChartBarIcon className="h-7 w-7 text-primary-500" />
          Statistiques financières
        </h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <DocumentMagnifyingGlassIcon className="h-4 w-4 text-primary-400" />
          Analyse des entrées et sorties par période et par catégorie.
        </p>
        <div className="mt-6">
          <PeriodSelector
            defaultPeriod="month"
            onChange={handlePeriodChange}
            allowCustom
            value={filters}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
            <TagIcon className="h-4 w-4 text-primary-500" />
            Catégorie
            <select
              value={filters.categoryId}
              onChange={handleCategoryChange}
              className="ml-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">Toutes</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nom}
                </option>
              ))}
            </select>
          </label>
          <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
            <TagIcon className="h-3 w-3" />
            {categoryLabel}
          </span>
          {categoriesError && (
            <span className="text-xs text-rose-500">{categoriesError}</span>
          )}
        </div>
        {error && (
          <p className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </p>
        )}
      </header>
      <section className="grid gap-6 lg:grid-cols-2">
        <Card
          loading={loading}
          title={
            <span className="flex items-center gap-2">
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-primary-500" />
              Répartition par catégories
            </span>
          }
        >
          {chartData.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="categorie" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="entree" name="Entrées" fill="#22c55e" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="sortie" name="Sorties" fill="#e11d48" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Aucune donnée disponible pour cette période.
            </p>
          )}
        </Card>
        <Card
          loading={loading}
          title={
            <span className="flex items-center gap-2">
              <ChartPieIcon className="h-5 w-5 text-primary-500" />
              Solde par catégorie
            </span>
          }
        >
          {pieData.length ? (
            <div className="h-80">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={120}>
                    {pieData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Aucune donnée disponible pour cette période.
            </p>
          )}
        </Card>
      </section>
      <section className="rounded-3xl bg-white/80 p-8 shadow-xl dark:bg-slate-900/80">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
          <DocumentMagnifyingGlassIcon className="h-5 w-5 text-primary-500" />
          Détails des opérations
        </h2>
        <TransactionsTable transactions={data?.transactions ?? []} loading={loading} />
      </section>
    </div>
  );
}

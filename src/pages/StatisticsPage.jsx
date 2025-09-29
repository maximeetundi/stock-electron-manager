import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card.jsx';
import PeriodSelector from '@/components/common/PeriodSelector.jsx';
import { formatCurrency } from '@/utils/format';
import { categoriesApi, transactionsApi } from '@/utils/apiClient';
import {
  ChartBarIcon,
  ChartPieIcon,
  AdjustmentsHorizontalIcon,
  TagIcon,
  DocumentMagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ArrowUpOnSquareIcon
} from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
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
  AreaChart,
  Area,
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
  const exportRef = useRef(null);
  const [compareMode, setCompareMode] = useState('none'); // 'none' | 'prev' | 'prevYear'
  const [prevData, setPrevData] = useState(null);

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

  // Helpers to shift period
  const shiftDate = (iso, days) => {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const periodDays = (period) => {
    switch (period) {
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 91;
      case 'semester': return 182;
      case 'year': return 365;
      default: return 7;
    }
  };

  const shiftISOYear = (iso, years) => {
    const d = new Date(iso);
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().slice(0, 10);
  };

  const buildPrevFilters = (f) => {
    if (compareMode === 'prev') {
      if (f.period !== 'custom') {
        return { ...f, referenceDate: shiftDate(f.referenceDate, -periodDays(f.period)) };
      }
      if (f.startDate && f.endDate) {
        const start = new Date(f.startDate);
        const end = new Date(f.endDate);
        const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return { ...f, startDate: shiftDate(f.startDate, -diff), endDate: shiftDate(f.endDate, -diff) };
      }
      return f;
    }
    if (compareMode === 'prevYear') {
      if (f.period !== 'custom') {
        return { ...f, referenceDate: shiftISOYear(f.referenceDate, -1) };
      }
      if (f.startDate && f.endDate) {
        return { ...f, startDate: shiftISOYear(f.startDate, -1), endDate: shiftISOYear(f.endDate, -1) };
      }
      return f;
    }
    return f;
  };

  useEffect(() => {
    let cancelled = false;
    const fetchPrev = async () => {
      if (compareMode === 'none') { setPrevData(null); return; }
      try {
        const pf = buildPrevFilters(filters);
        const response = await transactionsApi.byPeriod(pf);
        if (!cancelled) setPrevData(response);
      } catch (e) {
        if (!cancelled) setPrevData(null);
      }
    };
    fetchPrev();
    return () => { cancelled = true; };
  }, [compareMode, filters]);

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

  // Evolution time series (indexée) pour comparaison N vs N-1
  const timeSeries = useMemo(() => {
    const build = (txs) => {
      const sorted = (txs || []).slice().sort((a, b) => a.dateHeure.localeCompare(b.dateHeure));
      const dayMap = new Map();
      for (const t of sorted) {
        const d = new Date(t.dateHeure);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const cur = dayMap.get(key) || { entree: 0, sortie: 0 };
        if (t.type === 'ENTREE') cur.entree += Number(t.montant || 0);
        else cur.sortie += Number(t.montant || 0);
        dayMap.set(key, cur);
      }
      const arr = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
      return arr.map((v, idx) => ({ i: idx + 1, ...v }));
    };
    const cur = build(data?.transactions || []);
    const prev = compareMode !== 'none' ? build(prevData?.transactions || []) : [];
    const maxLen = Math.max(cur.length, prev.length);
    const merged = [];
    for (let i = 1; i <= maxLen; i++) {
      const a = cur.find((x) => x.i === i) || { i, entree: 0, sortie: 0 };
      const b = prev.find((x) => x.i === i) || { i, entree: 0, sortie: 0 };
      merged.push({ i, entree: a.entree, sortie: a.sortie, entree_prev: b.entree, sortie_prev: b.sortie });
    }
    return merged;
  }, [data, prevData, compareMode]);

  // Top 5 catégories par volume (entrées + sorties)
  const top5 = useMemo(() => {
    const arr = (data?.categoryBreakdown || []).map((c) => ({
      categorie: c.categorie,
      volume: Number(c.entree || 0) + Number(c.sortie || 0),
      entree: Number(c.entree || 0),
      sortie: Number(c.sortie || 0)
    }));
    arr.sort((a, b) => b.volume - a.volume);
    return arr.slice(0, 5);
  }, [data]);

  // Compute KPI from transactions if available
  const kpis = useMemo(() => {
    const txs = data?.transactions || [];
    const entree = txs.filter((t) => t.type === 'ENTREE').reduce((s, t) => s + Number(t.montant || 0), 0);
    const sortie = txs.filter((t) => t.type === 'SORTIE').reduce((s, t) => s + Number(t.montant || 0), 0);
    const solde = entree - sortie;
    const ptx = prevData?.transactions || [];
    const pEntree = ptx.filter((t) => t.type === 'ENTREE').reduce((s, t) => s + Number(t.montant || 0), 0);
    const pSortie = ptx.filter((t) => t.type === 'SORTIE').reduce((s, t) => s + Number(t.montant || 0), 0);
    const pSolde = pEntree - pSortie;
    const pct = (cur, prev) => (prev ? ((cur - prev) / prev) * 100 : (cur ? 100 : 0));
    return {
      entree,
      sortie,
      solde,
      delta: compareMode !== 'none' ? { entree: pct(entree, pEntree), sortie: pct(sortie, pSortie), solde: pct(solde, pSolde) } : null
    };
  }, [data, prevData, compareMode]);

  const fileStamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  };

  const randomId = () => Math.random().toString(36).slice(2, 6);

  const exportAsImage = async () => {
    const mod = await import('html2canvas');
    const html2canvas = mod.default || mod;
    const node = exportRef.current;
    if (!node) return;
    const canvas = await html2canvas(node, { backgroundColor: '#ffffff', scale: 2 });
    const dataURL = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `statistiques-${fileStamp()}-${randomId()}.png`;
    a.click();
  };

  const exportAsPdf = async () => {
    const mod = await import('html2canvas');
    const html2canvas = mod.default || mod;
    const node = exportRef.current;
    if (!node) return;
    const canvas = await html2canvas(node, { backgroundColor: '#ffffff', scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 60; // margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let y = 40;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('Statistiques financières', 30, y);
    y += 16;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(categoryLabel, 30, y);
    y += 16;
    pdf.addImage(imgData, 'PNG', 30, y, imgWidth, imgHeight, undefined, 'FAST');
    // Add new pages if needed
    let remaining = y + imgHeight;
    while (remaining > pageHeight - 40) {
      pdf.addPage();
      remaining -= pageHeight;
    }
    pdf.save(`statistiques-${fileStamp()}-${randomId()}.pdf`);
  };

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
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="mr-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800">
            Comparer à
            <select
              value={compareMode}
              onChange={(e) => setCompareMode(e.target.value)}
              className="ml-2 rounded-xl border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="none">Aucune</option>
              <option value="prev">Période précédente</option>
              <option value="prevYear">Même période l’an dernier</option>
            </select>
          </label>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800">
            <span className="text-slate-500">Entrées</span>
            <span className="font-semibold text-emerald-600">{formatCurrency(kpis.entree)}</span>
            {kpis.delta && (
              <span className={"text-xs " + (kpis.delta.entree >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                ({kpis.delta.entree >= 0 ? '+' : ''}{kpis.delta.entree.toFixed(1)}%)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800">
            <span className="text-slate-500">Sorties</span>
            <span className="font-semibold text-rose-600">{formatCurrency(kpis.sortie)}</span>
            {kpis.delta && (
              <span className={"text-xs " + (kpis.delta.sortie <= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                ({kpis.delta.sortie >= 0 ? '+' : ''}{kpis.delta.sortie.toFixed(1)}%)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800">
            <span className="text-slate-500">Solde</span>
            <span className="font-semibold text-indigo-600">{formatCurrency(kpis.solde)}</span>
            {kpis.delta && (
              <span className={"text-xs " + (kpis.delta.solde >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                ({kpis.delta.solde >= 0 ? '+' : ''}{kpis.delta.solde.toFixed(1)}%)
              </span>
            )}
          </div>
          <div className="grow" />
          <button
            type="button"
            onClick={exportAsImage}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            title="Exporter en image"
          >
            <ArrowDownTrayIcon className="h-5 w-5" /> PNG
          </button>
          <button
            type="button"
            onClick={exportAsPdf}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white shadow shadow-primary-500/40 transition hover:bg-primary-400"
            title="Exporter en PDF"
          >
            <ArrowUpOnSquareIcon className="h-5 w-5" /> PDF
          </button>
        </div>
        {error && (
          <p className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </p>
        )}
      </header>
      <section ref={exportRef} className="grid gap-6 lg:grid-cols-2">
        <Card
          loading={loading}
          title={
            <span className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-primary-500" />
              Evolution des flux
            </span>
          }
        >
          {timeSeries.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEntree" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorSortie" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="i" stroke="#64748b" tickFormatter={(v) => `J${v}`} />
                  <YAxis stroke="#64748b" tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="entree" name="Entrées" stroke="#22c55e" fillOpacity={1} fill="url(#colorEntree)" />
                  <Area type="monotone" dataKey="sortie" name="Sorties" stroke="#e11d48" fillOpacity={1} fill="url(#colorSortie)" />
                  {compareMode !== 'none' && (
                    <>
                      <Area type="monotone" dataKey="entree_prev" name={compareMode === 'prevYear' ? 'Entrées (N-1 an)' : 'Entrées (N-1)'} stroke="#16a34a" strokeDasharray="4 4" fillOpacity={0} />
                      <Area type="monotone" dataKey="sortie_prev" name={compareMode === 'prevYear' ? 'Sorties (N-1 an)' : 'Sorties (N-1)'} stroke="#be123c" strokeDasharray="4 4" fillOpacity={0} />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aucune donnée disponible pour cette période.</p>
          )}
        </Card>
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
        <Card
          loading={loading}
          title={
            <span className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-primary-500" />
              Top 5 catégories (volume)
            </span>
          }
          className="lg:col-span-2"
        >
          {top5.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top5} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="categorie" stroke="#64748b" />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="entree" name="Entrées" fill="#22c55e" radius={[0, 8, 8, 0]} />
                  <Bar dataKey="sortie" name="Sorties" fill="#e11d48" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aucune donnée disponible.</p>
          )}
        </Card>
      </section>
    </div>
  );
}

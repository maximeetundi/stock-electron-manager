import React, { useEffect, useMemo, useState } from 'react';
import MetricCard from '@/components/dashboard/MetricCard.jsx';
import { dashboardApi, transactionsApi, PERIOD_OPTIONS } from '@/utils/apiClient';
import RecentTransactions from '@/components/dashboard/RecentTransactions.jsx';
import { ChartBarIcon, ClockIcon, CubeIcon, ExclamationTriangleIcon, ClipboardDocumentListIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ShoppingCartIcon, TruckIcon } from '@heroicons/react/24/outline';
import Card from '@/components/ui/Card';

const PERIODS = ['day', 'week', 'month', 'quarter', 'semester', 'year'];
const PERIOD_CHOICES = [
  { key: 'all', label: 'Toutes les périodes' },
  ...PERIOD_OPTIONS.filter((option) => option.key !== 'custom').map((option) => ({
    key: option.key,
    label: option.label
  })),
  { key: 'custom', label: 'Période personnalisée' }
];

export default function DashboardPage() {
  const [mode, setMode] = useState('finances'); // 'finances' ou 'stock'
  const [totals, setTotals] = useState({});
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedStockPeriod, setSelectedStockPeriod] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // États pour le stock
  const [stockStats, setStockStats] = useState({
    totalArticles: 0,
    valeurTotaleStock: 0,
    articlesEnAlerte: 0,
    articlesEnRupture: 0,
    bonsEnCours: 0,
    bonsLivres: 0,
    montantBonsEnCours: 0,
    recentBons: [],
    articlesAlerte: [],
    mouvementsRecents: [],
    topArticles: [],
    statsEntreesSorties: { entrees: 0, sorties: 0 }
  });

  // Charger le mode par défaut depuis les settings
  useEffect(() => {
    const loadDefaultMode = async () => {
      try {
        const result = await window.api.app.getSettings();
        if (result.ok && result.data.default_dashboard) {
          setMode(result.data.default_dashboard);
        }
      } catch (err) {
        console.error('Erreur chargement préférence dashboard', err);
      }
    };
    loadDefaultMode();
  }, []);

  // Fonction pour filtrer par période
  const filterByPeriod = (data, dateField, period) => {
    if (period === 'all') return data;
    
    const now = new Date();
    let startDate = new Date();
    let endDate = now;
    
    if (period === 'custom') {
      // Période personnalisée
      if (!customStartDate || !customEndDate) return data;
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999); // Inclure toute la journée de fin
    } else {
      // Périodes prédéfinies
      switch(period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'semester':
          startDate.setMonth(now.getMonth() - 6);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          return data;
      }
    }
    
    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (mode === 'finances') {
          const [totalsResponse, recentResponse] = await Promise.all([
            dashboardApi.totals(),
            transactionsApi.recent(6)
          ]);
          setTotals(totalsResponse || {});
          setRecentTransactions(recentResponse || []);
        } else {
          // Charger les données de stock
          const [articlesRes, bonsRes, mouvementsRes] = await Promise.all([
            window.api.articles.list(),
            window.api.bonsCommande.list(),
            window.api.mouvements.list()
          ]);
          
          if (articlesRes.ok && bonsRes.ok) {
            const articles = articlesRes.data;
            const allBons = bonsRes.data;
            const allMouvements = mouvementsRes.ok ? mouvementsRes.data : [];
            
            // Filtrer par période
            const bons = filterByPeriod(allBons, 'date_commande', selectedStockPeriod);
            const mouvements = filterByPeriod(allMouvements, 'date_mouvement', selectedStockPeriod);
            
            // Articles en alerte et en rupture (toujours sur tous les articles)
            const articlesAlerte = articles.filter(a => a.quantite_stock <= a.quantite_min && a.quantite_stock > 0);
            const articlesRupture = articles.filter(a => a.quantite_stock === 0);
            
            // Bons en cours (filtrés par période)
            const bonsEnCours = bons.filter(b => b.statut === 'EN_COURS');
            const montantBonsEnCours = bonsEnCours.reduce((sum, b) => sum + b.montant_total, 0);
            
            // Mouvements récents (filtrés par période)
            const mouvementsRecents = mouvements.slice(0, 10);
            
            // Statistiques entrées/sorties (filtrées par période)
            const entrees = mouvements.filter(m => m.type === 'ENTREE').length;
            const sorties = mouvements.filter(m => m.type === 'SORTIE').length;
            
            // Top articles (par nombre de mouvements - filtrés par période)
            const articleMouvements = {};
            mouvements.forEach(m => {
              if (!articleMouvements[m.article_id]) {
                articleMouvements[m.article_id] = {
                  article: articles.find(a => a.id === m.article_id),
                  count: 0,
                  totalQte: 0
                };
              }
              articleMouvements[m.article_id].count++;
              articleMouvements[m.article_id].totalQte += m.quantite;
            });
            
            const topArticles = Object.values(articleMouvements)
              .filter(am => am.article)
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);
            
            setStockStats({
              totalArticles: articles.length,
              valeurTotaleStock: articles.reduce((sum, a) => sum + (a.quantite_stock * a.prix_unitaire), 0),
              articlesEnAlerte: articlesAlerte.length,
              articlesEnRupture: articlesRupture.length,
              bonsEnCours: bonsEnCours.length,
              bonsLivres: bons.filter(b => b.statut === 'LIVREE').length,
              totalBonsPeriode: bons.length,
              montantBonsEnCours,
              recentBons: bons.slice(0, 6),
              articlesAlerte: articlesAlerte.slice(0, 10),
              mouvementsRecents,
              topArticles,
              statsEntreesSorties: { entrees, sorties }
            });
          }
        }
      } catch (err) {
        setError(err.message || 'Impossible de charger le tableau de bord');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mode, selectedStockPeriod, customStartDate, customEndDate]);

  return (
    <div className="space-y-8">
      {/* Sélecteur de mode */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {mode === 'finances' ? (
            <><ChartBarIcon className="h-6 w-6 text-primary-500" /> Tableau de bord Finances</>
          ) : (
            <><CubeIcon className="h-6 w-6 text-primary-500" /> Tableau de bord Stock</>
          )}
        </h2>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-primary-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="finances">💰 Finances</option>
          <option value="stock">📦 Stock</option>
        </select>
      </div>

      {mode === 'finances' ? (
        // MODE FINANCES (ancien dashboard)
        <>
          <section>
            <h3 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
              Vue d'ensemble des flux financiers
            </h3>
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
        </>
      ) : (
        // MODE STOCK (dashboard amélioré)
        <>
          {/* Sélecteur de période */}
          <section>
            <h3 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
              Analyse par période
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Filtrez les mouvements et bons de commande par période.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {PERIOD_CHOICES.map((option) => {
                const isActive = selectedStockPeriod === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSelectedStockPeriod(option.key)}
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

            {/* Sélecteur de dates personnalisées */}
            {selectedStockPeriod === 'custom' && (
              <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Date de début :
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Date de fin :
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>
                {customStartDate && customEndDate && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Du {new Date(customStartDate).toLocaleDateString('fr-FR')} au {new Date(customEndDate).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            )}

            <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
              {selectedStockPeriod === 'all'
                ? 'Toutes les périodes affichées'
                : selectedStockPeriod === 'custom' && customStartDate && customEndDate
                ? `Période personnalisée : ${new Date(customStartDate).toLocaleDateString('fr-FR')} - ${new Date(customEndDate).toLocaleDateString('fr-FR')}`
                : `Période sélectionnée : ${PERIOD_CHOICES.find((option) => option.key === selectedStockPeriod)?.label ?? ''}`}
            </p>
          </section>

          {/* Cartes métriques principales */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Vue d'ensemble
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Total Articles</p>
                    <p className="text-3xl font-bold">{stockStats.totalArticles}</p>
                    <p className="mt-1 text-xs opacity-80">En stock</p>
                  </div>
                  <CubeIcon className="h-12 w-12 opacity-80" />
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Valeur Stock</p>
                    <p className="text-3xl font-bold">{(stockStats.valeurTotaleStock / 1000).toFixed(0)}K</p>
                    <p className="text-xs opacity-80">FCFA</p>
                  </div>
                  <ChartBarIcon className="h-12 w-12 opacity-80" />
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Alertes Stock</p>
                    <p className="text-3xl font-bold">{stockStats.articlesEnAlerte}</p>
                    <p className="mt-1 text-xs opacity-80">À réapprovisionner</p>
                  </div>
                  <ExclamationTriangleIcon className="h-12 w-12 opacity-80" />
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Rupture Stock</p>
                    <p className="text-3xl font-bold">{stockStats.articlesEnRupture}</p>
                    <p className="mt-1 text-xs opacity-80">Articles épuisés</p>
                  </div>
                  <ExclamationTriangleIcon className="h-12 w-12 opacity-80" />
                </div>
              </Card>
            </div>
          </section>

          {/* Statistiques mouvements et bons */}
          <section>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Entrées Stock</p>
                    <p className="text-3xl font-bold">{stockStats.statsEntreesSorties.entrees}</p>
                    <p className="mt-1 text-xs opacity-80">Mouvements</p>
                  </div>
                  <ArrowTrendingUpIcon className="h-12 w-12 opacity-80" />
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Sorties Stock</p>
                    <p className="text-3xl font-bold">{stockStats.statsEntreesSorties.sorties}</p>
                    <p className="mt-1 text-xs opacity-80">Mouvements</p>
                  </div>
                  <ArrowTrendingDownIcon className="h-12 w-12 opacity-80" />
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Bons En Cours</p>
                    <p className="text-3xl font-bold">{stockStats.bonsEnCours}</p>
                    <p className="mt-1 text-xs opacity-80">{(stockStats.montantBonsEnCours / 1000).toFixed(0)}K FCFA</p>
                  </div>
                  <ShoppingCartIcon className="h-12 w-12 opacity-80" />
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Bons Livrés</p>
                    <p className="text-3xl font-bold">{stockStats.bonsLivres}</p>
                    <p className="mt-1 text-xs opacity-80">Réceptionnés</p>
                  </div>
                  <TruckIcon className="h-12 w-12 opacity-80" />
                </div>
              </Card>
            </div>
          </section>

          {/* Articles en alerte */}
          {stockStats.articlesAlerte.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    Articles en alerte
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Articles nécessitant un réapprovisionnement</p>
                </div>
              </div>
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Code</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Désignation</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Stock actuel</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Stock minimum</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {stockStats.articlesAlerte.map((article) => (
                        <tr key={article.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3 font-mono text-slate-900 dark:text-slate-100">{article.code}</td>
                          <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{article.designation}</td>
                          <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">{article.quantite_stock}</td>
                          <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{article.quantite_min}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              <ExclamationTriangleIcon className="h-3 w-3" />
                              Alerte
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          )}

          {/* Grid à 2 colonnes pour Mouvements et Top articles */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Mouvements récents */}
            <section>
              <div className="mb-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  <ClockIcon className="h-5 w-5 text-primary-500" />
                  Mouvements récents
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Dernières entrées et sorties de stock</p>
              </div>
              <Card>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse rounded-lg bg-slate-200 p-3 dark:bg-slate-800" />
                    ))}
                  </div>
                ) : stockStats.mouvementsRecents.length > 0 ? (
                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {stockStats.mouvementsRecents.map((mvt) => (
                      <div key={mvt.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-2 ${
                            mvt.type === 'ENTREE' 
                              ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {mvt.type === 'ENTREE' ? (
                              <ArrowTrendingUpIcon className="h-4 w-4" />
                            ) : (
                              <ArrowTrendingDownIcon className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{mvt.article_code}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(mvt.date_mouvement).toLocaleDateString('fr-FR')} • {mvt.motif}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            mvt.type === 'ENTREE' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {mvt.type === 'ENTREE' ? '+' : '-'}{mvt.quantite}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-slate-500">Aucun mouvement</p>
                )}
              </Card>
            </section>

            {/* Top articles */}
            <section>
              <div className="mb-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  <ChartBarIcon className="h-5 w-5 text-primary-500" />
                  Top articles
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Articles les plus mouvementés</p>
              </div>
              <Card>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse rounded-lg bg-slate-200 p-3 dark:bg-slate-800" />
                    ))}
                  </div>
                ) : stockStats.topArticles.length > 0 ? (
                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {stockStats.topArticles.map((item, index) => (
                      <div key={item.article.id} className="flex items-center gap-4 py-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{item.article.designation}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{item.article.code}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{item.count} mvts</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{item.totalQte} unités</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-slate-500">Aucune donnée</p>
                )}
              </Card>
            </section>
          </div>

          {/* Derniers bons de commande */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-primary-500" />
                  Derniers bons de commande
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Aperçu des commandes récentes</p>
              </div>
            </div>
            <Card>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse rounded-lg bg-slate-200 p-4 dark:bg-slate-800" />
                  ))}
                </div>
              ) : stockStats.recentBons.length > 0 ? (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {stockStats.recentBons.map((bon) => (
                    <div key={bon.id} className="flex items-center justify-between py-4">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{bon.numero}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{bon.fournisseur_nom}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {new Date(bon.date_commande).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {bon.montant_total.toLocaleString('fr-FR')} FCFA
                        </p>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          bon.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          bon.statut === 'LIVREE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {bon.statut.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-slate-500">Aucun bon de commande</p>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

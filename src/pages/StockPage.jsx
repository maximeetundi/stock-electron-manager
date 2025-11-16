import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import Card from '@/components/ui/Card';
import MouvementsTab from '@/components/stock/MouvementsTab';

export default function StockPage() {
  const [articles, setArticles] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [articlesAlert, setArticlesAlert] = useState([]);
  const [activeTab, setActiveTab] = useState('articles');
  const [showModal, setShowModal] = useState(false);
  const [showFournisseurModal, setShowFournisseurModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [editingFournisseur, setEditingFournisseur] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination et recherche pour articles
  const [articleSearchTerm, setArticleSearchTerm] = useState('');
  const [articleCurrentPage, setArticleCurrentPage] = useState(1);
  const ARTICLES_PER_PAGE = 15;

  // Pagination et recherche pour fournisseurs
  const [fournisseurSearchTerm, setFournisseurSearchTerm] = useState('');
  const [fournisseurCurrentPage, setFournisseurCurrentPage] = useState(1);
  const FOURNISSEURS_PER_PAGE = 15;

  const formatStock = (article) => {
    const qte = Number(article.quantite_stock) || 0;
    const baseUnite = article.unite;
    return `${qte.toLocaleString('fr-FR')} ${baseUnite}`;
  };

  const [formData, setFormData] = useState({
    code: '',
    designation: '',
    unite: 'unité',
    prix_unitaire: 0,
    quantite_stock: 0,
    quantite_min: 0
  });

  const [fournisseurFormData, setFournisseurFormData] = useState({
    nom: '',
    adresse: '',
    telephone: '',
    email: ''
  });

  const loadArticles = useCallback(async () => {
    try {
      const result = await window.api.articles.list();
      if (result.ok) setArticles(result.data);
    } catch (err) {
      console.error('Erreur chargement articles', err);
    }
  }, []);

  const loadFournisseurs = useCallback(async () => {
    try {
      const result = await window.api.fournisseurs.list();
      if (result.ok) setFournisseurs(result.data);
    } catch (err) {
      console.error('Erreur chargement fournisseurs', err);
    }
  }, []);

  const loadArticlesAlert = useCallback(async () => {
    try {
      const result = await window.api.articles.alertStock();
      if (result.ok) setArticlesAlert(result.data);
    } catch (err) {
      console.error('Erreur chargement alertes', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([loadArticles(), loadFournisseurs(), loadArticlesAlert()]);
  }, [loadArticles, loadFournisseurs, loadArticlesAlert]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmitArticle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = editingArticle
        ? await window.api.articles.update(editingArticle.id, formData)
        : await window.api.articles.add(formData);

      if (result.ok) {
        await loadData();
        setShowModal(false);
        resetForm();
      } else {
        setError(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFournisseur = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = editingFournisseur
        ? await window.api.fournisseurs.update(editingFournisseur.id, fournisseurFormData)
        : await window.api.fournisseurs.add(fournisseurFormData);

      if (result.ok) {
        await loadFournisseurs();
        setShowFournisseurModal(false);
        resetFournisseurForm();
      } else {
        setError(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArticle = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;
    try {
      const result = await window.api.articles.delete(id);
      if (result.ok) await loadData();
      else alert(result.error || 'Erreur lors de la suppression');
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const handleDeleteFournisseur = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) return;
    try {
      const result = await window.api.fournisseurs.delete(id);
      if (result.ok) await loadFournisseurs();
      else alert(result.error || 'Erreur lors de la suppression');
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const openEditArticle = async (article) => {
    let a = article;
    try {
      const res = await window.api.articles.get(article.id);
      if (res?.ok && res.data) a = res.data;
    } catch (_) {}
    setEditingArticle(a);
    setFormData({
      code: a.code,
      designation: a.designation,
      unite: a.unite,
      prix_unitaire: a.prix_unitaire,
      quantite_stock: a.quantite_stock,
      quantite_min: a.quantite_min
    });
    setShowModal(true);
  };

  const openEditFournisseur = (fournisseur) => {
    setEditingFournisseur(fournisseur);
    setFournisseurFormData({
      nom: fournisseur.nom,
      adresse: fournisseur.adresse || '',
      telephone: fournisseur.telephone || '',
      email: fournisseur.email || ''
    });
    setShowFournisseurModal(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      designation: '',
      unite: 'unité',
      prix_unitaire: 0,
      quantite_stock: 0,
      quantite_min: 0
    });
    setEditingArticle(null);
  };

  const resetFournisseurForm = () => {
    setFournisseurFormData({
      nom: '',
      adresse: '',
      telephone: '',
      email: ''
    });
    setEditingFournisseur(null);
  };

  // Filtrage et pagination des articles
  const filteredArticles = articles.filter(article => {
    const search = articleSearchTerm.toLowerCase();
    return (
      article.code.toLowerCase().includes(search) ||
      article.designation.toLowerCase().includes(search) ||
      article.unite.toLowerCase().includes(search)
    );
  });

  const totalArticlePages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE);
  const paginatedArticles = filteredArticles.slice(
    (articleCurrentPage - 1) * ARTICLES_PER_PAGE,
    articleCurrentPage * ARTICLES_PER_PAGE
  );

  // Réinitialiser la page quand la recherche change
  useEffect(() => {
    setArticleCurrentPage(1);
  }, [articleSearchTerm]);

  // Filtrage et pagination des fournisseurs
  const filteredFournisseurs = fournisseurs.filter(fournisseur => {
    const search = fournisseurSearchTerm.toLowerCase();
    return (
      fournisseur.nom.toLowerCase().includes(search) ||
      (fournisseur.telephone || '').toLowerCase().includes(search) ||
      (fournisseur.email || '').toLowerCase().includes(search)
    );
  });

  const totalFournisseurPages = Math.ceil(filteredFournisseurs.length / FOURNISSEURS_PER_PAGE);
  const paginatedFournisseurs = filteredFournisseurs.slice(
    (fournisseurCurrentPage - 1) * FOURNISSEURS_PER_PAGE,
    fournisseurCurrentPage * FOURNISSEURS_PER_PAGE
  );

  // Réinitialiser la page quand la recherche change
  useEffect(() => {
    setFournisseurCurrentPage(1);
  }, [fournisseurSearchTerm]);

  return (
    <div className="space-y-6">
      {articlesAlert.length > 0 && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 flex-shrink-0 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                Alertes de stock ({articlesAlert.length})
              </h3>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                {articlesAlert.map(a => a.designation).join(', ')}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="-mb-px flex space-x-8">
            {['articles', 'fournisseurs', 'mouvements'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-slate-500 hover:border-slate-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'articles' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    Articles ({filteredArticles.length}{filteredArticles.length !== articles.length && ` / ${articles.length}`})
                  </h3>
                  {filteredArticles.length !== articles.length && (
                    <p className="text-sm text-slate-500 mt-1">
                      {filteredArticles.length} résultat{filteredArticles.length > 1 ? 's' : ''} trouvé{filteredArticles.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  {/* Barre de recherche */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={articleSearchTerm}
                      onChange={(e) => setArticleSearchTerm(e.target.value)}
                      placeholder="Rechercher un article..."
                      className="w-full md:w-64 rounded-lg border border-slate-300 pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {articleSearchTerm && (
                      <button
                        onClick={() => setArticleSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Nouvel article
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Désignation</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Unité</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase">Prix (FCFA)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase">Stock</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedArticles.length > 0 ? (
                      paginatedArticles.map((article) => (
                      <tr key={article.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-sm font-medium">{article.code}</td>
                        <td className="px-4 py-3 text-sm">{article.designation}</td>
                        <td className="px-4 py-3 text-sm">{article.unite}</td>
                        <td className="px-4 py-3 text-right text-sm">
                          {article.prix_unitaire.toLocaleString('fr-FR')}
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-semibold ${
                          article.quantite_stock <= article.quantite_min ? 'text-red-600' : ''
                        }`}>
                          {formatStock(article)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditArticle(article)}
                              className="rounded p-1 text-blue-600 hover:bg-blue-50"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteArticle(article.id)}
                              className="rounded p-1 text-red-600 hover:bg-red-50"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-sm text-slate-500">
                          {articleSearchTerm ? 'Aucun article trouvé' : 'Aucun article disponible'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Articles */}
              {totalArticlePages > 1 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="text-sm text-slate-600">
                    Page {articleCurrentPage} sur {totalArticlePages} • 
                    Affichage de {((articleCurrentPage - 1) * ARTICLES_PER_PAGE) + 1} à {Math.min(articleCurrentPage * ARTICLES_PER_PAGE, filteredArticles.length)} sur {filteredArticles.length} articles
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setArticleCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={articleCurrentPage === 1}
                      className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                      Précédent
                    </button>
                    <button
                      onClick={() => setArticleCurrentPage(prev => Math.min(totalArticlePages, prev + 1))}
                      disabled={articleCurrentPage === totalArticlePages}
                      className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Suivant
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'fournisseurs' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    Fournisseurs ({filteredFournisseurs.length}{filteredFournisseurs.length !== fournisseurs.length && ` / ${fournisseurs.length}`})
                  </h3>
                  {filteredFournisseurs.length !== fournisseurs.length && (
                    <p className="text-sm text-slate-500 mt-1">
                      {filteredFournisseurs.length} résultat{filteredFournisseurs.length > 1 ? 's' : ''} trouvé{filteredFournisseurs.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  {/* Barre de recherche */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={fournisseurSearchTerm}
                      onChange={(e) => setFournisseurSearchTerm(e.target.value)}
                      placeholder="Rechercher un fournisseur..."
                      className="w-full md:w-64 rounded-lg border border-slate-300 pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {fournisseurSearchTerm && (
                      <button
                        onClick={() => setFournisseurSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => { resetFournisseurForm(); setShowFournisseurModal(true); }}
                    className="flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Nouveau fournisseur
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Nom</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Téléphone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Email</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedFournisseurs.length > 0 ? (
                      paginatedFournisseurs.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-sm font-medium">{f.nom}</td>
                        <td className="px-4 py-3 text-sm">{f.telephone || '-'}</td>
                        <td className="px-4 py-3 text-sm">{f.email || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditFournisseur(f)}
                              className="rounded p-1 text-blue-600 hover:bg-blue-50"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFournisseur(f.id)}
                              className="rounded p-1 text-red-600 hover:bg-red-50"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-4 py-8 text-center text-sm text-slate-500">
                          {fournisseurSearchTerm ? 'Aucun fournisseur trouvé' : 'Aucun fournisseur disponible'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Fournisseurs */}
              {totalFournisseurPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="text-sm text-slate-600">
                    Page {fournisseurCurrentPage} sur {totalFournisseurPages} • 
                    Affichage de {((fournisseurCurrentPage - 1) * FOURNISSEURS_PER_PAGE) + 1} à {Math.min(fournisseurCurrentPage * FOURNISSEURS_PER_PAGE, filteredFournisseurs.length)} sur {filteredFournisseurs.length} fournisseurs
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFournisseurCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={fournisseurCurrentPage === 1}
                      className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                      Précédent
                    </button>
                    <button
                      onClick={() => setFournisseurCurrentPage(prev => Math.min(totalFournisseurPages, prev + 1))}
                      disabled={fournisseurCurrentPage === totalFournisseurPages}
                      className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Suivant
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'mouvements' && (
            <MouvementsTab />
          )}
        </div>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 dark:bg-slate-900">
            <h2 className="mb-4 text-xl font-bold">
              {editingArticle ? 'Modifier l\'article' : 'Nouvel article'}
            </h2>
            {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <form onSubmit={handleSubmitArticle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Unité *</label>
                  <input
                    type="text"
                    required
                    value={formData.unite}
                    onChange={(e) => setFormData({ ...formData, unite: e.target.value })}
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium">Désignation *</label>
                <input
                  type="text"
                  required
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium">Prix (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.prix_unitaire}
                    onChange={(e) => setFormData({ ...formData, prix_unitaire: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </div>
                {!editingArticle && (
                  <div>
                    <label className="block text-sm font-medium">Qté initiale</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.quantite_stock}
                      onChange={(e) => setFormData({ ...formData, quantite_stock: parseFloat(e.target.value) || 0 })}
                      className="mt-1 w-full rounded border px-3 py-2"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium">Stock min</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.quantite_min}
                    onChange={(e) => setFormData({ ...formData, quantite_min: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); setError(null); }}
                  className="rounded border px-4 py-2 text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded bg-primary-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFournisseurModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 dark:bg-slate-900">
            <h2 className="mb-4 text-xl font-bold">
              {editingFournisseur ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
            </h2>
            {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <form onSubmit={handleSubmitFournisseur} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Nom *</label>
                <input
                  type="text"
                  required
                  value={fournisseurFormData.nom}
                  onChange={(e) => setFournisseurFormData({ ...fournisseurFormData, nom: e.target.value })}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Adresse</label>
                <input
                  type="text"
                  value={fournisseurFormData.adresse}
                  onChange={(e) => setFournisseurFormData({ ...fournisseurFormData, adresse: e.target.value })}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Téléphone</label>
                  <input
                    type="tel"
                    value={fournisseurFormData.telephone}
                    onChange={(e) => setFournisseurFormData({ ...fournisseurFormData, telephone: e.target.value })}
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={fournisseurFormData.email}
                    onChange={(e) => setFournisseurFormData({ ...fournisseurFormData, email: e.target.value })}
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowFournisseurModal(false); resetFournisseurForm(); setError(null); }}
                  className="rounded border px-4 py-2 text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded bg-primary-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

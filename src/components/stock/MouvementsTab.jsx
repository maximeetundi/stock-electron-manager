import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  AdjustmentsHorizontalIcon,
  PlusIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import Card from '@/components/ui/Card';

export default function MouvementsTab() {
  const [articles, setArticles] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // États pour la recherche d'articles
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  
  // États pour l'infinite scroll
  const [displayedCount, setDisplayedCount] = useState(15); // Nombre d'articles affichés
  const ITEMS_PER_PAGE = 15; // Charger 15 articles à la fois

  const [formData, setFormData] = useState({
    article_id: '',
    type: 'SORTIE',
    quantite: 1,
    reference: '',
    motif: '',
    unite_saisie: ''
  });

  const loadArticles = useCallback(async () => {
    try {
      const result = await window.api.articles.list();
      if (result.ok) setArticles(result.data);
    } catch (err) {
      console.error('Erreur chargement articles', err);
    }
  }, []);

  const loadMouvements = useCallback(async () => {
    try {
      const result = await window.api.mouvements.list(null, 50);
      if (result.ok) setMouvements(result.data);
    } catch (err) {
      console.error('Erreur chargement mouvements', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([loadArticles(), loadMouvements()]);
  }, [loadArticles, loadMouvements]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.relative')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Filtrer les articles selon la recherche
  const allFilteredArticles = searchTerm 
    ? articles.filter(article => {
        const search = searchTerm.toLowerCase();
        return (
          article.code.toLowerCase().includes(search) ||
          article.designation.toLowerCase().includes(search)
        );
      })
    : articles; // Si pas de recherche, afficher tous les articles

  // Limiter l'affichage pour l'infinite scroll
  const filteredArticles = allFilteredArticles.slice(0, displayedCount);
  const hasMore = allFilteredArticles.length > displayedCount;

  // Fonction pour charger plus d'articles
  const loadMoreArticles = () => {
    if (hasMore) {
      setDisplayedCount(prev => prev + ITEMS_PER_PAGE);
    }
  };

  // Gérer le scroll
  const handleScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 50;
    if (bottom && hasMore) {
      loadMoreArticles();
    }
  };

  // Réinitialiser le compteur quand la recherche change
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
  }, [searchTerm]);

  // Sélectionner un article
  const handleSelectArticle = (article) => {
    setSelectedArticle(article);
    setFormData({ ...formData, article_id: article.id, unite_saisie: article.unite || '' });
    setSearchTerm(''); // Réinitialiser la recherche
    setShowDropdown(false);
  };

  // Réinitialiser la sélection
  const handleClearSelection = () => {
    setSelectedArticle(null);
    setFormData({ ...formData, article_id: '', unite_saisie: '' });
    setSearchTerm('');
    setDisplayedCount(ITEMS_PER_PAGE); // Reset à 15 articles
    setShowDropdown(true); // Ouvrir directement pour resélectionner
  };

  // Réinitialiser le compteur quand on ouvre le dropdown
  const handleToggleDropdown = () => {
    if (!showDropdown) {
      setDisplayedCount(ITEMS_PER_PAGE); // Reset à 15 articles
    }
    setShowDropdown(!showDropdown);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedArticle || !formData.article_id) {
      setError('Veuillez sélectionner un article');
      return;
    }
    
    if (formData.quantite <= 0) {
      setError('Veuillez indiquer une quantité valide');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.api.mouvements.add(formData);
      if (result.ok) {
        alert('Mouvement enregistré avec succès');
        setFormData({
          article_id: '',
          type: 'SORTIE',
          quantite: 1,
          reference: '',
          motif: '',
          unite_saisie: ''
        });
        handleClearSelection();
        setLoading(false);
        // Charger les données en arrière-plan sans bloquer l'interface
        loadData();
      } else {
        setError(result.error || 'Erreur lors de l\'enregistrement');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
      setLoading(false);
    }
  };

  const getArticleInfo = (article_id) => {
    const article = articles.find(a => a.id === parseInt(article_id));
    return article ? `Stock actuel: ${article.quantite_stock} ${article.unite}` : '';
  };

  return (
    <div className="space-y-6">
      {/* Formulaire de saisie */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Enregistrer un mouvement de stock</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="relative">
              <label className="block text-sm font-medium mb-2">Article *</label>
              
              {/* Bouton principal (comme un select) */}
              <button
                type="button"
                onClick={handleToggleDropdown}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-left flex items-center justify-between hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className={selectedArticle ? 'text-slate-900' : 'text-slate-400'}>
                  {selectedArticle 
                    ? `${selectedArticle.code} - ${selectedArticle.designation}` 
                    : 'Sélectionner un article...'}
                </span>
                <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown recherchable */}
              {showDropdown && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-xl">
                  {/* Champ de recherche dans le dropdown */}
                  <div className="p-2 border-b border-slate-200 bg-slate-50">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Rechercher..."
                        className="w-full rounded border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Liste des articles avec infinite scroll */}
                  <div className="max-h-60 overflow-auto" onScroll={handleScroll}>
                    {filteredArticles.length > 0 ? (
                      <>
                        {filteredArticles.map(article => (
                          <button
                            key={article.id}
                            type="button"
                            onClick={() => handleSelectArticle(article)}
                            className={`w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-slate-100 transition-colors ${
                              selectedArticle?.id === article.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                            }`}
                          >
                            <div className="font-medium text-sm text-slate-900">
                              {article.code} - {article.designation}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                              <span>Stock: <span className="font-semibold">{article.quantite_stock}</span> {article.unite}</span>
                              <span>•</span>
                              <span>Prix: {article.prix_unitaire.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                          </button>
                        ))}
                        
                        {/* Indicateur de chargement / fin de liste */}
                        {hasMore ? (
                          <div className="px-4 py-3 text-center text-xs text-slate-400 border-t border-slate-100">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <div className="mt-1">
                              Chargement de plus d'articles... ({filteredArticles.length}/{allFilteredArticles.length})
                            </div>
                          </div>
                        ) : (
                          allFilteredArticles.length > ITEMS_PER_PAGE && (
                            <div className="px-4 py-2 text-center text-xs text-slate-400 border-t border-slate-100">
                              ✓ Tous les articles affichés ({allFilteredArticles.length})
                            </div>
                          )
                        )}
                      </>
                    ) : (
                      <div className="px-4 py-8 text-sm text-slate-500 text-center">
                        {searchTerm ? 'Aucun article trouvé' : 'Aucun article disponible'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Infos article sélectionné */}
              {selectedArticle && (
                <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm flex items-center justify-between">
                  <div>
                    <div className="font-medium text-blue-900">
                      Stock actuel: <span className="text-lg font-bold">{selectedArticle.quantite_stock}</span> {selectedArticle.unite}
                    </div>
                    <div className="text-blue-700 text-xs mt-1">
                      Prix unitaire: {selectedArticle.prix_unitaire.toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    Changer
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Type de mouvement *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full rounded border px-3 py-2"
                required
              >
                <option value="ENTREE">⬆️ Entrée (Réception)</option>
                <option value="SORTIE">⬇️ Sortie (Utilisation)</option>
                <option value="AJUSTEMENT">⚙️ Ajustement (Correction)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-2">Quantité *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={formData.quantite}
                onChange={(e) => setFormData({ ...formData, quantite: parseFloat(e.target.value) || 0 })}
                className="w-full rounded border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Unité de saisie</label>
              <input
                type="text"
                value={formData.unite_saisie}
                disabled
                className="w-full rounded border px-3 py-2 bg-slate-100 text-slate-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Référence</label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Ex: Demande service pédagogique"
                className="w-full rounded border px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Motif</label>
            <textarea
              value={formData.motif}
              onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
              placeholder="Ex: Distribution fournitures classe de 6ème A"
              rows="2"
              className="w-full rounded border px-3 py-2"
            />
          </div>

          {error && (
            <div className="rounded bg-red-100 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <PlusIcon className="h-5 w-5" />
              {loading ? 'Enregistrement...' : 'Enregistrer le mouvement'}
            </button>
          </div>
        </form>
      </Card>

      {/* Historique des mouvements */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Historique des mouvements</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Article</th>
                <th className="px-4 py-3 text-center">Type</th>
                <th className="px-4 py-3 text-right">Quantité</th>
                <th className="px-4 py-3 text-left">Référence</th>
                <th className="px-4 py-3 text-left">Motif</th>
              </tr>
            </thead>
            <tbody>
              {mouvements.map((mouvement) => (
                <tr key={mouvement.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {new Date(mouvement.date_mouvement).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{mouvement.code}</div>
                    <div className="text-xs text-slate-500">{mouvement.designation}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {mouvement.type === 'ENTREE' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        <ArrowUpIcon className="h-3 w-3" />
                        Entrée
                      </span>
                    )}
                    {mouvement.type === 'SORTIE' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                        <ArrowDownIcon className="h-3 w-3" />
                        Sortie
                      </span>
                    )}
                    {mouvement.type === 'AJUSTEMENT' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                        <AdjustmentsHorizontalIcon className="h-3 w-3" />
                        Ajustement
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${
                    mouvement.type === 'SORTIE' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {mouvement.type === 'SORTIE' ? '-' : '+'}{mouvement.quantite} {mouvement.article_unite || ''}
                    {Boolean(mouvement.quantite_saisie) && (
                      <div className="text-xs text-slate-500 mt-1">
                        saisi: {mouvement.quantite_saisie} {mouvement.unite_saisie || mouvement.article_unite || ''}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{mouvement.reference || '-'}</td>
                  <td className="px-4 py-3">{mouvement.motif || '-'}</td>
                </tr>
              ))}
              {mouvements.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    Aucun mouvement enregistré
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

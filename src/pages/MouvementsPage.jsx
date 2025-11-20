import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  AdjustmentsHorizontalIcon,
  PencilIcon,
  TrashIcon,
  PrinterIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import Card from '@/components/ui/Card';

const ITEMS_PER_PAGE = 20;

export default function MouvementsPage() {
  const navigate = useNavigate();
  const [mouvements, setMouvements] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination et recherche
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  
  // Modal édition
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMouvement, setEditingMouvement] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Modal aperçu avant impression
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState('');

  const loadMouvements = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.api.mouvements.list(null, 1000);
      if (result.ok) {
        setMouvements(result.data);
      }
    } catch (err) {
      console.error('Erreur chargement mouvements', err);
      setError('Erreur lors du chargement des mouvements');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadArticles = useCallback(async () => {
    try {
      const result = await window.api.articles.list();
      if (result.ok) setArticles(result.data);
    } catch (err) {
      console.error('Erreur chargement articles', err);
    }
  }, []);

  useEffect(() => {
    loadMouvements();
    loadArticles();
  }, [loadMouvements, loadArticles]);

  // Filtrer les mouvements (optimisé avec useMemo)
  const filteredMouvements = useMemo(() => {
    return mouvements.filter(mouvement => {
      const search = searchTerm.toLowerCase();
      const matchSearch = 
        mouvement.code.toLowerCase().includes(search) ||
        mouvement.designation.toLowerCase().includes(search) ||
        (mouvement.reference && mouvement.reference.toLowerCase().includes(search)) ||
        (mouvement.motif && mouvement.motif.toLowerCase().includes(search));
      
      const matchType = !filterType || mouvement.type === filterType;
      
      const mouvementDate = new Date(mouvement.date_mouvement).toISOString().split('T')[0];
      const matchDateFrom = !filterDateFrom || mouvementDate >= filterDateFrom;
      const matchDateTo = !filterDateTo || mouvementDate <= filterDateTo;
      
      return matchSearch && matchType && matchDateFrom && matchDateTo;
    });
  }, [mouvements, searchTerm, filterType, filterDateFrom, filterDateTo]);

  // Pagination (optimisé avec useMemo)
  const { totalPages, paginatedMouvements } = useMemo(() => {
    const total = Math.ceil(filteredMouvements.length / ITEMS_PER_PAGE);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginated = filteredMouvements.slice(start, start + ITEMS_PER_PAGE);
    return { totalPages: total, paginatedMouvements: paginated };
  }, [filteredMouvements, currentPage]);

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterDateFrom, filterDateTo]);

  const handleEditClick = useCallback((mouvement) => {
    setEditingMouvement(mouvement);
    setEditFormData({
      quantite: mouvement.quantite,
      reference: mouvement.reference || '',
      motif: mouvement.motif || '',
      date_mouvement: mouvement.date_mouvement.split('T')[0]
    });
    setShowEditModal(true);
  }, []);

  // Handlers optimisés pour le modal d'édition
  const handleEditDateChange = useCallback((e) => {
    setEditFormData(prev => ({ ...prev, date_mouvement: e.target.value }));
  }, []);

  const handleEditQuantiteChange = useCallback((e) => {
    setEditFormData(prev => ({ ...prev, quantite: parseFloat(e.target.value) || 0 }));
  }, []);

  const handleEditReferenceChange = useCallback((e) => {
    setEditFormData(prev => ({ ...prev, reference: e.target.value }));
  }, []);

  const handleEditMotifChange = useCallback((e) => {
    setEditFormData(prev => ({ ...prev, motif: e.target.value }));
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingMouvement) return;
    
    try {
      const result = await window.api.mouvements.update(editingMouvement.id, editFormData);
      if (result.ok) {
        alert('Mouvement modifié avec succès');
        setShowEditModal(false);
        loadMouvements();
      } else {
        setError(result.error || 'Erreur lors de la modification');
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la modification');
    }
  }, [editingMouvement, editFormData, loadMouvements]);

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce mouvement ?')) return;
    
    try {
      const result = await window.api.mouvements.delete(id);
      if (result.ok) {
        alert('Mouvement supprimé avec succès');
        loadMouvements();
      } else {
        setError(result.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  const generatePrintHtml = (mouvement) => {
    const typeLabel = {
      'ENTREE': 'Entrée (Réception)',
      'SORTIE': 'Sortie (Utilisation)',
      'AJUSTEMENT': 'Ajustement (Correction)'
    }[mouvement.type] || mouvement.type;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Mouvement de Stock</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { margin: 0; color: #1e293b; }
          .header p { margin: 5px 0; color: #64748b; }
          .content { max-width: 600px; margin: 0 auto; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; }
          .field { display: flex; margin-bottom: 10px; }
          .field-label { font-weight: bold; width: 150px; color: #475569; }
          .field-value { flex: 1; color: #1e293b; }
          .type-badge { display: inline-block; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .type-entree { background-color: #dcfce7; color: #166534; }
          .type-sortie { background-color: #fee2e2; color: #991b1b; }
          .type-ajustement { background-color: #dbeafe; color: #1e40af; }
          .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Mouvement de Stock</h1>
          <p>Document imprimé le ${new Date().toLocaleString('fr-FR')}</p>
        </div>
        
        <div class="content">
          <div class="section">
            <div class="section-title">Informations du mouvement</div>
            <div class="field">
              <div class="field-label">Type:</div>
              <div class="field-value">
                <span class="type-badge type-${mouvement.type.toLowerCase()}">${typeLabel}</span>
              </div>
            </div>
            <div class="field">
              <div class="field-label">Date:</div>
              <div class="field-value">${new Date(mouvement.date_mouvement).toLocaleString('fr-FR')}</div>
            </div>
            <div class="field">
              <div class="field-label">ID:</div>
              <div class="field-value">#${mouvement.id}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Article</div>
            <div class="field">
              <div class="field-label">Code:</div>
              <div class="field-value">${mouvement.code}</div>
            </div>
            <div class="field">
              <div class="field-label">Désignation:</div>
              <div class="field-value">${mouvement.designation}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Quantité</div>
            <div class="field">
              <div class="field-label">Quantité:</div>
              <div class="field-value">${mouvement.quantite} ${mouvement.article_unite || ''}</div>
            </div>
            ${mouvement.quantite_saisie ? `
            <div class="field">
              <div class="field-label">Quantité saisie:</div>
              <div class="field-value">${mouvement.quantite_saisie} ${mouvement.unite_saisie || ''}</div>
            </div>
            ` : ''}
          </div>

          ${mouvement.reference ? `
          <div class="section">
            <div class="section-title">Référence</div>
            <div class="field">
              <div class="field-label">Référence:</div>
              <div class="field-value">${mouvement.reference}</div>
            </div>
          </div>
          ` : ''}

          ${mouvement.motif ? `
          <div class="section">
            <div class="section-title">Motif</div>
            <div class="field">
              <div class="field-label">Motif:</div>
              <div class="field-value">${mouvement.motif}</div>
            </div>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>Ce document a été généré automatiquement par le système de gestion de stock</p>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = (mouvement) => {
    const html = generatePrintHtml(mouvement);
    setPrintPreviewHtml(html);
    setShowPrintPreview(true);
  };

  const handleConfirmPrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printPreviewHtml);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
    setShowPrintPreview(false);
  };

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Filtres</h3>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-sm font-medium mb-2">Recherche</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Code, désignation, référence..."
                className="w-full rounded border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les types</option>
              <option value="ENTREE">⬆️ Entrée</option>
              <option value="SORTIE">⬇️ Sortie</option>
              <option value="AJUSTEMENT">⚙️ Ajustement</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Du</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Au</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">&nbsp;</label>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('');
                setFilterDateFrom('');
                setFilterDateTo('');
              }}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-600">
          {filteredMouvements.length} mouvement(s) trouvé(s)
        </div>
      </Card>

      {/* Tableau des mouvements */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Mouvements de stock</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const html = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="UTF-8">
                    <title>Mouvements de Stock</title>
                    <style>
                      body { font-family: Arial, sans-serif; margin: 20px; background-color: #f8f9fa; }
                      .container { max-width: 1200px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; }
                      .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; }
                      .header h1 { margin: 0; color: #1e293b; font-size: 28px; }
                      .header p { margin: 5px 0; color: #64748b; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                      th { background-color: #3b82f6; color: white; padding: 12px; text-align: left; font-weight: bold; }
                      td { padding: 8px; border: 1px solid #e2e8f0; }
                      .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1>MOUVEMENTS DE STOCK</h1>
                        <p>Document généré le ${new Date().toLocaleString('fr-FR')}</p>
                        <p>Total: ${filteredMouvements.length} mouvement(s)</p>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Article</th>
                            <th>Type</th>
                            <th style="text-align: right;">Quantité</th>
                            <th>Référence</th>
                            <th>Motif</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${filteredMouvements.map(m => `
                            <tr>
                              <td>${new Date(m.date_mouvement).toLocaleString('fr-FR')}</td>
                              <td>${m.code} - ${m.designation}</td>
                              <td>${m.type}</td>
                              <td style="text-align: right;">${m.quantite} ${m.article_unite || ''}</td>
                              <td>${m.reference || '-'}</td>
                              <td>${m.motif || '-'}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                      <div class="footer">
                        <p>Ce rapport a été généré automatiquement par le système de gestion de stock</p>
                      </div>
                    </div>
                  </body>
                  </html>
                `;
                const printWindow = window.open('', '_blank');
                printWindow.document.write(html);
                printWindow.document.close();
                setTimeout(() => printWindow.print(), 250);
              }}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-colors"
              title="Imprimer tous les mouvements filtrés"
            >
              <PrinterIcon className="h-5 w-5" />
              Imprimer
            </button>
            <button
              onClick={() => navigate('/stock?tab=mouvements')}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Nouveau mouvement
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mb-4 rounded bg-red-100 px-4 py-3 text-sm text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-slate-500">Chargement...</div>
        ) : paginatedMouvements.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            {filteredMouvements.length === 0 ? 'Aucun mouvement trouvé' : 'Aucun mouvement sur cette page'}
          </div>
        ) : (
          <>
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
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMouvements.map((mouvement) => (
                    <tr key={mouvement.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap">
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
                      </td>
                      <td className="px-4 py-3 text-sm">{mouvement.reference || '-'}</td>
                      <td className="px-4 py-3 text-sm">{mouvement.motif || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(mouvement)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Modifier"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handlePrint(mouvement)}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Imprimer"
                          >
                            <PrinterIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(mouvement.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Supprimer"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Page {currentPage} sur {totalPages} ({filteredMouvements.length} mouvement(s))
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    Précédent
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Modal d'édition */}
      {showEditModal && editingMouvement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-3xl bg-white/80 p-8 shadow-xl dark:bg-slate-900/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Modifier le mouvement</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date du mouvement</label>
                <input
                  type="date"
                  value={editFormData.date_mouvement}
                  onChange={handleEditDateChange}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Quantité</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editFormData.quantite}
                  onChange={handleEditQuantiteChange}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Référence</label>
                <input
                  type="text"
                  value={editFormData.reference}
                  onChange={handleEditReferenceChange}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Motif</label>
                <textarea
                  value={editFormData.motif}
                  onChange={handleEditMotifChange}
                  rows="3"
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal aperçu avant impression */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
            {/* En-tête du modal */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Aperçu avant impression</h2>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Contenu du document */}
            <div className="flex-1 overflow-auto bg-slate-50 p-6">
              <div className="bg-white rounded shadow-sm p-8" dangerouslySetInnerHTML={{ __html: printPreviewHtml.replace(/<html>|<\/html>|<head>.*?<\/head>|<!DOCTYPE html>/gi, '') }} />
            </div>

            {/* Boutons d'action */}
            <div className="border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowPrintPreview(false)}
                className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPrint}
                className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                <PrinterIcon className="h-4 w-4" />
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

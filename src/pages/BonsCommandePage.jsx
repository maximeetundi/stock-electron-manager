import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  EyeIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import Card from '@/components/ui/Card';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { loadDocumentBranding, createPdfBranding, getPrintBrandingBlocks } from '@/utils/documentBranding';

export default function BonsCommandePage() {
  const navigate = useNavigate();
  const [bonsCommande, setBonsCommande] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [articles, setArticles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBon, setSelectedBon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState('');
  const [docBranding, setDocBranding] = useState(null);

  // Pagination et recherche pour bons de commande
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const [formData, setFormData] = useState({
    fournisseur_id: '',
    date_commande: new Date().toISOString().split('T')[0],
    observations: '',
    items: []
  });

  const [newItem, setNewItem] = useState({
    article_id: '',
    quantite: 1,
    prix_unitaire: 0,
    unite: ''
  });

  const [showQuickArticleModal, setShowQuickArticleModal] = useState(false);
  const [quickArticleForm, setQuickArticleForm] = useState({
    code: '',
    designation: '',
    unite: 'unité',
    prix_unitaire: 0,
    quantite_stock: 0,
    quantite_min: 0,
    unite_conditionnement: '',
    qte_par_conditionnement: 1
  });
  const [quickArticleLoading, setQuickArticleLoading] = useState(false);
  const [quickArticleError, setQuickArticleError] = useState(null);

  // États pour la recherche d'articles avec infinite scroll
  const [articleSearchTerm, setArticleSearchTerm] = useState('');
  const [showArticleDropdown, setShowArticleDropdown] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [displayedArticlesCount, setDisplayedArticlesCount] = useState(15);
  const ARTICLES_PER_PAGE = 15;
  const articleDropdownRef = useRef(null);
  const articleListRef = useRef(null);

  const loadBonsCommande = useCallback(async () => {
    try {
      const result = await window.api.bonsCommande.list();
      if (result.ok) setBonsCommande(result.data);
    } catch (err) {
      console.error('Erreur chargement bons', err);
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

  const loadArticles = useCallback(async () => {
    try {
      const result = await window.api.articles.list();
      if (result.ok) setArticles(result.data);
    } catch (err) {
      console.error('Erreur chargement articles', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([loadBonsCommande(), loadFournisseurs(), loadArticles()]);
  }, [loadBonsCommande, loadFournisseurs, loadArticles]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const ensureBranding = async () => {
    if (docBranding) return docBranding;
    const branding = await loadDocumentBranding();
    setDocBranding(branding);
    return branding;
  };

  useEffect(() => {
    (async () => {
      try {
        const branding = await loadDocumentBranding();
        setDocBranding(branding);
      } catch (err) {
        console.error('Erreur chargement personnalisation documents', err);
      }
    })();
  }, []);

  const handleAddItem = () => {
    if (!selectedArticle || newItem.quantite <= 0) return;
    setError(null);
    const chosenUnit = newItem.unite || selectedArticle.unite || selectedArticle.unite_conditionnement || '';
    if (!chosenUnit) {
      setError('Veuillez choisir une unité pour cet article.');
      return;
    }

    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          article_id: selectedArticle.id,
          article_code: selectedArticle.code,
          article_designation: selectedArticle.designation,
          article_unite: chosenUnit,
          designation: selectedArticle.designation,
          unite: chosenUnit,
          quantite: newItem.quantite,
          prix_unitaire: newItem.prix_unitaire || selectedArticle.prix_unitaire
        }
      ]
    });

    // Réinitialiser
    setNewItem({ article_id: '', quantite: 1, prix_unitaire: 0, unite: '' });
    setSelectedArticle(null);
    setArticleSearchTerm('');
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantite * item.prix_unitaire), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      setError('Veuillez ajouter au moins un article');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        fournisseur_id: formData.fournisseur_id || null
      };
      const result = await window.api.bonsCommande.create(payload);
      if (result.ok) {
        await loadBonsCommande();
        setShowModal(false);
        resetForm();
      } else {
        setError(result.error || 'Erreur lors de la création');
      }
    } catch (err) {
      setError('Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatut = async (id, statut) => {
    if (!confirm(`Marquer ce bon comme ${statut} ?`)) return;

    try {
      const result = await window.api.bonsCommande.updateStatut(id, statut);
      if (result.ok) {
        await loadBonsCommande();
        if (selectedBon && selectedBon.id === id) {
          setSelectedBon(result.data);
        }
      } else {
        alert(result.error || 'Erreur lors de la mise à jour');
      }
    } catch (err) {
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bon de commande ?')) return;

    try {
      const result = await window.api.bonsCommande.delete(id);
      if (result.ok) await loadBonsCommande();
      else alert(result.error || 'Erreur lors de la suppression');
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const viewDetails = async (id) => {
    try {
      const result = await window.api.bonsCommande.get(id);
      if (result.ok) {
        setSelectedBon(result.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('Erreur chargement détails', err);
    }
  };

  const exportPDF = async (bon) => {
    const branding = await ensureBranding();
    const doc = new jsPDF();
    const pdfBranding = createPdfBranding(doc, branding);
    pdfBranding.applyOnPage();

    const centerX = doc.internal.pageSize.getWidth() / 2;
    let yPos = pdfBranding.headerBottomY + 6;

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('BON DE COMMANDE', centerX, yPos, { align: 'center' });
    doc.setFont(undefined, 'normal');

    doc.setFontSize(11);
    yPos += 9;
    doc.text(`Numéro: ${bon.numero}`, 20, yPos);
    yPos += 7;
    doc.text(`Date: ${new Date(bon.date_commande).toLocaleDateString('fr-FR')}`, 20, yPos);

    doc.setFontSize(10);
    yPos += 10;
    const hasSupplierInfo = Boolean(
      bon.fournisseur_nom ||
      bon.fournisseur_adresse ||
      bon.fournisseur_telephone
    );

    if (hasSupplierInfo) {
      doc.text('Fournisseur:', 20, yPos);
      doc.setFont(undefined, 'bold');
      doc.text(bon.fournisseur_nom || '', 50, yPos);
      doc.setFont(undefined, 'normal');

      yPos += 6;
      if (bon.fournisseur_adresse) {
        doc.text('Adresse:', 20, yPos);
        doc.text(bon.fournisseur_adresse, 50, yPos);
        yPos += 6;
      }

      if (bon.fournisseur_telephone) {
        doc.text('Téléphone:', 20, yPos);
        doc.text(bon.fournisseur_telephone, 50, yPos);
        yPos += 6;
      }
    }

    yPos += 8;
    doc.text("Demande d'achat n° _____________   de _____________", 20, yPos);
    yPos += 7;
    doc.text('Date de livraison: _______________', 20, yPos);

    const tableStartY = Math.max(pdfBranding.contentStartY, yPos + 10);
    const tableData = bon.items.map(item => [
      item.code || item.designation,
      item.designation,
      item.unite || '',
      item.quantite,
      item.prix_unitaire.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
      item.montant.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    ]);

    doc.autoTable({
      startY: tableStartY,
      head: [['Références', 'Désignations', 'Unité', 'Quantité', 'Prix\nUnitaire', 'TOTAL']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        halign: 'left'
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      },
      bodyStyles: {
        lineWidth: 0.5,
        lineColor: [0, 0, 0]
      },
      margin: { top: pdfBranding.marginTop, bottom: pdfBranding.marginBottom },
      didDrawPage: () => pdfBranding.applyOnPage()
    });

    const finalY = doc.lastAutoTable.finalY + 6;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    const montantFormate = bon.montant_total.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    doc.text(`MONTANT TOTAL: ${montantFormate} FCFA`, centerX, finalY, { align: 'center' });
    doc.setFont(undefined, 'normal');

    let notesY = finalY + 10;
    if (bon.observations) {
      doc.setFontSize(9);
      doc.text('Observations :', 20, notesY);
      doc.text(bon.observations, 20, notesY + 5, { maxWidth: 170 });
    }

    doc.save(`bon-commande-${bon.numero}.pdf`);
  };

  const generateBonPrintHtml = (bon, items, fournisseur, branding) => {
    const { headerHtml, footerHtml, styles: brandingStyles } = getPrintBrandingBlocks(branding);
    const hasSupplier = Boolean(
      bon.fournisseur_nom ||
      fournisseur?.contact ||
      fournisseur?.email
    );

    const supplierSection = hasSupplier ? `
            <div class="section">
              <div class="section-title">Fournisseur</div>
              ${bon.fournisseur_nom ? `
              <div class="field">
                <div class="field-label">Nom:</div>
                <div class="field-value">${bon.fournisseur_nom}</div>
              </div>` : ''}
              ${fournisseur?.contact ? `
              <div class="field">
                <div class="field-label">Contact:</div>
                <div class="field-value">${fournisseur.contact}</div>
              </div>` : ''}
              ${fournisseur?.email ? `
              <div class="field">
                <div class="field-label">Email:</div>
                <div class="field-value">${fournisseur.email}</div>
              </div>` : ''}
            </div>
    ` : '';

    return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Bon de Commande</title>
          <style>
            ${brandingStyles}
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #1e293b; font-size: 24px; }
            .header p { margin: 5px 0; color: #64748b; }
            .content { max-width: 800px; margin: 0 auto; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; }
            .field { display: flex; margin-bottom: 10px; }
            .field-label { font-weight: bold; width: 150px; color: #475569; }
            .field-value { flex: 1; color: #1e293b; }
            .status-badge { display: inline-block; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .status-en_cours { background-color: #dbeafe; color: #1e40af; }
            .status-livree { background-color: #dcfce7; color: #166534; }
            .status-annulee { background-color: #fee2e2; color: #991b1b; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #e2e8f0; }
            th { background-color: #f1f5f9; padding: 10px; text-align: left; font-weight: bold; border: 1px solid #e2e8f0; }
            td { padding: 8px 10px; border: 1px solid #e2e8f0; }
            .total-row { font-weight: bold; background-color: #f8fafc; }
          </style>
        </head>
        <body>
          ${headerHtml}
          <div class="header">
            <h1><u><b>Bon de Commande</b></u></h1>
            <p>N° ${bon.numero} - Imprimé le ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <div class="section-title">Informations du bon</div>
              <div class="field">
                <div class="field-label">Numéro:</div>
                <div class="field-value">${bon.numero}</div>
              </div>
              <div class="field">
                <div class="field-label">Date:</div>
                <div class="field-value">${new Date(bon.date_commande).toLocaleDateString('fr-FR')}</div>
              </div>
              <div class="field">
                <div class="field-label">Statut:</div>
                <div class="field-value">
                  <span class="status-badge status-${bon.statut.toLowerCase()}">${bon.statut}</span>
                </div>
              </div>
            </div>

            ${supplierSection}

            <div class="section">
              <div class="section-title">Articles commandés</div>
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Désignation</th>
                    <th style="text-align: center;">Unité</th>
                    <th style="text-align: right;">Quantité</th>
                    <th style="text-align: right;">Prix unitaire</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(item => `
                  <tr>
                    <td>${item.code}</td>
                    <td>${item.designation}</td>
                    <td style="text-align: center;">${item.unite || ''}</td>
                    <td style="text-align: right;">${item.quantite}</td>
                    <td style="text-align: right;">${item.prix_unitaire.toLocaleString('fr-FR')} FCFA</td>
                    <td style="text-align: right;">${(item.quantite * item.prix_unitaire).toLocaleString('fr-FR')} FCFA</td>
                  </tr>
                  `).join('')}
                  <tr class="total-row">
                    <td colspan="4" style="text-align: right;">Montant total:</td>
                    <td style="text-align: right;">${bon.montant_total.toLocaleString('fr-FR')} FCFA</td>
                  </tr>
                </tbody>
              </table>
            </div>

            ${bon.observations ? `
            <div class="section">
              <div class="section-title">Observations</div>
              <div class="field-value">${bon.observations}</div>
            </div>
            ` : ''}

          </div>
          <b>${footerHtml}</b>
          <div class="doc-branding-footnote">Ce document a été généré automatiquement par le système de gestion de stock.</div>
        </body>
        </html>
      `;
  };

  const handlePrintBon = async (bon) => {
    try {
      // Charger les détails complets du bon
      const result = await window.api.bonsCommande.get(bon.id);
      if (!result.ok) {
        alert('Erreur lors du chargement du bon');
        return;
      }
      
      const bonDetails = result.data;
      const fournisseur = fournisseurs.find(f => f.id === bon.fournisseur_id);
      const items = bonDetails.items || [];
      const branding = await ensureBranding();
      
      const html = generateBonPrintHtml(bon, items, fournisseur, branding);
      setPrintPreviewHtml(html);
      setShowPrintPreview(true);
    } catch (err) {
      console.error('Erreur impression bon:', err);
      alert('Erreur lors de l\'impression du bon');
    }
  };

  const handleConfirmPrintBon = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printPreviewHtml);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
    setShowPrintPreview(false);
  };

  const resetForm = () => {
    setFormData({
      fournisseur_id: '',
      date_commande: new Date().toISOString().split('T')[0],
      observations: '',
      items: []
    });
    setNewItem({ article_id: '', quantite: 1, prix_unitaire: 0, unite: '' });
    setSelectedArticle(null);
    setArticleSearchTerm('');
  };

  const resetQuickArticleForm = () => {
    setQuickArticleForm({
      code: '',
      designation: '',
      unite: 'unité',
      prix_unitaire: 0,
      quantite_stock: 0,
      quantite_min: 0,
      unite_conditionnement: '',
      qte_par_conditionnement: 1
    });
    setQuickArticleError(null);
  };

  const handleQuickArticleSubmit = async (e) => {
    e.preventDefault();
    setQuickArticleLoading(true);
    setQuickArticleError(null);

    const payload = {
      ...quickArticleForm,
      prix_unitaire: Number(quickArticleForm.prix_unitaire) || 0,
      quantite_stock: Number(quickArticleForm.quantite_stock) || 0,
      quantite_min: Number(quickArticleForm.quantite_min) || 0,
      qte_par_conditionnement: Number(quickArticleForm.qte_par_conditionnement) || 1
    };

    try {
      const result = await window.api.articles.add(payload);
      if (result.ok) {
        await loadArticles();
        resetQuickArticleForm();
        setShowQuickArticleModal(false);

        const newlyCreated = result.data;
        if (newlyCreated?.id) {
          setSelectedArticle(newlyCreated);
          setNewItem((prev) => ({
            ...prev,
            article_id: newlyCreated.id,
            prix_unitaire: newlyCreated.prix_unitaire || 0,
            unite: newlyCreated.unite || newlyCreated.unite_conditionnement || ''
          }));
        }
      } else {
        setQuickArticleError(result.error || 'Erreur lors de la création de l’article');
      }
    } catch (err) {
      setQuickArticleError('Erreur lors de la création de l’article');
    } finally {
      setQuickArticleLoading(false);
    }
  };

  // Gestion de la recherche d'articles
  const filteredArticles = articles.filter(article => {
    if (!articleSearchTerm) return true;
    const search = articleSearchTerm.toLowerCase();
    return (
      article.code.toLowerCase().includes(search) ||
      article.designation.toLowerCase().includes(search)
    );
  });

  const visibleArticles = filteredArticles.slice(0, displayedArticlesCount);

  const handleArticleScroll = (e) => {
    const element = e.target;
    const isNearBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    
    if (isNearBottom && displayedArticlesCount < filteredArticles.length) {
      setDisplayedArticlesCount(prev => Math.min(prev + ARTICLES_PER_PAGE, filteredArticles.length));
    }
  };

  const unitOptionsForSelectedArticle = useMemo(() => {
    if (!selectedArticle) return [];
    const options = [];
    if (selectedArticle.unite) {
      options.push({
        value: selectedArticle.unite,
        label: selectedArticle.unite,
        helper: 'Unité principale'
      });
    }
    if (selectedArticle.unite_conditionnement) {
      options.push({
        value: selectedArticle.unite_conditionnement,
        label: selectedArticle.unite_conditionnement,
        helper: 'Unité secondaire'
      });
    }
    return options;
  }, [selectedArticle]);

  const handleSelectArticle = (article) => {
    setSelectedArticle(article);
    const defaultUnit = article.unite || article.unite_conditionnement || '';
    setNewItem((prev) => ({
      ...prev,
      article_id: article.id,
      prix_unitaire: article.prix_unitaire || 0,
      unite: defaultUnit
    }));
    setShowArticleDropdown(false);
  };

  const handleClearArticleSelection = () => {
    setSelectedArticle(null);
    setNewItem((prev) => ({ ...prev, article_id: '', prix_unitaire: 0, unite: '' }));
    setArticleSearchTerm('');
  };

  const handleNewItemUnitChange = useCallback((unit) => {
    setNewItem((prev) => {
      if (!selectedArticle) return { ...prev, unite: unit };
      let updatedPrice = prev.prix_unitaire;
      const basePrice = Number(selectedArticle.prix_unitaire) || 0;
      const ratio = Number(selectedArticle.qte_par_conditionnement) || 0;

      if (unit === selectedArticle.unite && basePrice) {
        updatedPrice = basePrice;
      } else if (
        unit === selectedArticle.unite_conditionnement &&
        basePrice &&
        ratio > 0
      ) {
        updatedPrice = basePrice / ratio;
      }

      return {
        ...prev,
        unite: unit,
        prix_unitaire: Number.isFinite(updatedPrice) ? parseFloat(updatedPrice.toFixed(2)) : prev.prix_unitaire
      };
    });
  }, [selectedArticle]);

  const handleToggleArticleDropdown = () => {
    setShowArticleDropdown(!showArticleDropdown);
    setDisplayedArticlesCount(ARTICLES_PER_PAGE);
  };

  // Fermer le dropdown si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (articleDropdownRef.current && !articleDropdownRef.current.contains(event.target)) {
        setShowArticleDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'EN_COURS':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'LIVREE':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'ANNULEE':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Filtrage et pagination des bons de commande
  const filteredBons = bonsCommande.filter(bon => {
    const search = searchTerm.toLowerCase();
    return (
      bon.numero.toLowerCase().includes(search) ||
      (bon.fournisseur_nom || '').toLowerCase().includes(search) ||
      bon.statut.toLowerCase().includes(search) ||
      formatDate(bon.date_commande).toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(filteredBons.length / ITEMS_PER_PAGE);
  const paginatedBons = filteredBons.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Réinitialiser la page quand la recherche change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              Bons de commande ({filteredBons.length}{filteredBons.length !== bonsCommande.length && ` / ${bonsCommande.length}`})
            </h3>
            {filteredBons.length !== bonsCommande.length && (
              <p className="text-sm text-slate-500 mt-1">
                {filteredBons.length} résultat{filteredBons.length > 1 ? 's' : ''} trouvé{filteredBons.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
          
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* Barre de recherche */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un bon..."
                className="w-full md:w-64 rounded-lg border border-slate-300 pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
              >
                <PlusIcon className="h-5 w-5" />
                Nouveau bon
              </button>
              <button
                onClick={() => navigate('/stock?tab=fournisseurs')}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5" />
                Nouveau fournisseur
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">N° Bon</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Fournisseur</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">Montant</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedBons.length > 0 ? (
                paginatedBons.map((bon) => (
                <tr key={bon.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-sm font-medium">{bon.numero}</td>
                  <td className="px-4 py-3 text-sm">{formatDate(bon.date_commande)}</td>
                  <td className="px-4 py-3 text-sm">{bon.fournisseur_nom || '—'}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">
                    {bon.montant_total.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatutColor(bon.statut)}`}>
                      {bon.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => viewDetails(bon.id)}
                        className="rounded p-1 text-blue-600 hover:bg-blue-50"
                        title="Voir détails"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handlePrintBon(bon)}
                        className="rounded p-1 text-green-600 hover:bg-green-50"
                        title="Imprimer"
                      >
                        <PrinterIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => exportPDF(bon)}
                        className="rounded p-1 text-purple-600 hover:bg-purple-50"
                        title="Exporter en PDF"
                      >
                        <DocumentArrowDownIcon className="h-5 w-5" />
                      </button>
                      {bon.statut === 'EN_COURS' && (
                        <>
                          <button
                            onClick={() => handleChangeStatut(bon.id, 'LIVREE')}
                            className="rounded p-1 text-green-600 hover:bg-green-50"
                            title="Marquer comme livrée"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleChangeStatut(bon.id, 'ANNULEE')}
                            className="rounded p-1 text-orange-600 hover:bg-orange-50"
                            title="Annuler"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      {bon.statut !== 'LIVREE' && (
                        <button
                          onClick={() => handleDelete(bon.id)}
                          className="rounded p-1 text-red-600 hover:bg-red-50"
                          title="Supprimer"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-sm text-slate-500">
                    {searchTerm ? 'Aucun bon de commande trouvé' : 'Aucun bon de commande disponible'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4 mt-4">
            <div className="text-sm text-slate-600">
              Page {currentPage} sur {totalPages} • 
              Affichage de {((currentPage - 1) * ITEMS_PER_PAGE) + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, filteredBons.length)} sur {filteredBons.length} bons
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Précédent
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal création bon */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-xl bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
            {/* En-tête */}
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Nouveau bon de commande</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Contenu scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}
              
              <form id="bonForm" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Fournisseur (optionnel)</label>
                  <select
                    value={formData.fournisseur_id}
                    onChange={(e) => setFormData({ ...formData, fournisseur_id: e.target.value })}
                    className="mt-1 w-full rounded border px-3 py-2"
                  >
                    <option value="">Aucun fournisseur</option>
                    {fournisseurs.map(f => (
                      <option key={f.id} value={f.id}>{f.nom}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date_commande}
                    onChange={(e) => setFormData({ ...formData, date_commande: e.target.value })}
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </div>
              </div>

              {/* Ajout d'articles */}
              <div className="rounded border p-4">
                <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="font-semibold">Articles</h3>
                  <button
                    type="button"
                    onClick={() => setShowQuickArticleModal(true)}
                    className="flex items-center gap-2 rounded bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Nouvel article
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2 relative" ref={articleDropdownRef}>
                    {/* Bouton principal de sélection */}
                    <button
                      type="button"
                      onClick={handleToggleArticleDropdown}
                      className="w-full flex items-center justify-between rounded border border-slate-300 bg-white px-3 py-2 text-left text-sm hover:border-primary-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-800"
                    >
                      <span className={selectedArticle ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}>
                        {selectedArticle ? `${selectedArticle.code} - ${selectedArticle.designation}` : 'Sélectionner un article'}
                      </span>
                      <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform ${showArticleDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Bouton pour effacer la sélection */}
                    {selectedArticle && !showArticleDropdown && (
                      <button
                        type="button"
                        onClick={handleClearArticleSelection}
                        className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Effacer la sélection"
                      >
                        <XMarkIcon className="h-4 w-4 text-slate-400" />
                      </button>
                    )}

                    {/* Dropdown de recherche */}
                    {showArticleDropdown && (
                      <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                        {/* Champ de recherche */}
                        <div className="border-b border-slate-200 p-2 dark:border-slate-700">
                          <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Rechercher un article..."
                              value={articleSearchTerm}
                              onChange={(e) => {
                                setArticleSearchTerm(e.target.value);
                                setDisplayedArticlesCount(ARTICLES_PER_PAGE);
                              }}
                              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-700"
                              autoFocus
                            />
                          </div>
                        </div>

                        {/* Liste des articles avec infinite scroll */}
                        <div 
                          ref={articleListRef}
                          onScroll={handleArticleScroll}
                          className="max-h-60 overflow-y-auto"
                        >
                          {visibleArticles.length > 0 ? (
                            <>
                              {visibleArticles.map((article) => (
                                <button
                                  key={article.id}
                                  type="button"
                                  onClick={() => handleSelectArticle(article)}
                                  className="w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
                                >
                                  <div className="font-medium text-slate-900 dark:text-slate-100">
                                    {article.code}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {article.designation}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                                    <span>Stock: {article.quantite_stock}</span>
                                    <span>•</span>
                                    <span>Prix: {article.prix_unitaire?.toLocaleString()} FCFA</span>
                                  </div>
                                </button>
                              ))}
                              
                              {/* Indicateur de chargement/fin */}
                              <div className="px-3 py-2 text-center text-xs text-slate-400">
                                {displayedArticlesCount < filteredArticles.length ? (
                                  <span>Chargement... ({displayedArticlesCount}/{filteredArticles.length})</span>
                                ) : (
                                  <span>{filteredArticles.length} article{filteredArticles.length > 1 ? 's' : ''}</span>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="px-3 py-8 text-center text-sm text-slate-400">
                              Aucun article trouvé
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Quantité"
                      value={newItem.quantite}
                      onChange={(e) => setNewItem({ ...newItem, quantite: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      placeholder="Prix unitaire"
                      value={newItem.prix_unitaire}
                      onChange={(e) => setNewItem({ ...newItem, prix_unitaire: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded border px-3 py-2 text-sm"
                    />
                  </div>
                  {selectedArticle && (
                    <div className="col-span-4">
                      <label className="block text-sm font-medium mb-2">Unité utilisée</label>
                      {unitOptionsForSelectedArticle.length > 0 ? (
                        <>
                          <div className="flex flex-wrap gap-3">
                            {unitOptionsForSelectedArticle.map((option) => {
                              const isActive = newItem.unite === option.value;
                              return (
                                <label
                                  key={option.value}
                                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                                    isActive ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-300 text-slate-700'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    className="sr-only"
                                    name="item-unit"
                                    value={option.value}
                                    checked={isActive}
                                    onChange={() => handleNewItemUnitChange(option.value)}
                                  />
                                  <span className="font-semibold">{option.label}</span>
                                  <span className="text-xs text-slate-500">{option.helper}</span>
                                </label>
                              );
                            })}
                          </div>
                          {selectedArticle.unite_conditionnement && selectedArticle.qte_par_conditionnement > 0 && (
                            <p className="mt-2 text-xs text-slate-500">
                              1 {selectedArticle.unite} = {selectedArticle.qte_par_conditionnement} {selectedArticle.unite_conditionnement}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Définissez l'unité principale et secondaire dans la fiche article pour activer la conversion.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="mt-3 flex items-center gap-2 rounded bg-slate-600 px-3 py-1.5 text-sm text-white"
                >
                  <PlusIcon className="h-4 w-4" />
                  Ajouter
                </button>

                {formData.items.length > 0 && (
                  <div className="mt-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-2 py-2 text-left">Article</th>
                          <th className="px-2 py-2 text-right">Qté</th>
                      <th className="px-2 py-2 text-center">Unité</th>
                      <th className="px-2 py-2 text-right">P.U.</th>
                          <th className="px-2 py-2 text-right">Total</th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="px-2 py-2">{item.article_designation}</td>
                            <td className="px-2 py-2 text-right">{item.quantite}</td>
                            <td className="px-2 py-2 text-right">{item.prix_unitaire.toLocaleString()}</td>
                            <td className="px-2 py-2 text-right font-semibold">
                              {(item.quantite * item.prix_unitaire).toLocaleString()}
                            </td>
                            <td className="px-2 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="font-bold">
                          <td colSpan={4} className="px-2 py-2 text-right">TOTAL:</td>
                          <td className="px-2 py-2 text-right">{calculateTotal().toLocaleString()} FCFA</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium">Observations</label>
                <textarea
                  rows={2}
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </div>

              </form>
            </div>

            {/* Footer avec boutons */}
            <div className="border-t px-6 py-4 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => { setShowModal(false); resetForm(); setError(null); }}
                className="rounded border px-4 py-2 text-sm font-medium"
              >
                Annuler
              </button>
              <button
                type="submit"
                form="bonForm"
                disabled={loading}
                className="rounded bg-primary-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer le bon'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ajout rapide article */}
      {showQuickArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Nouvel article</h2>
              <button
                type="button"
                onClick={() => { setShowQuickArticleModal(false); resetQuickArticleForm(); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleQuickArticleSubmit} className="space-y-4 px-6 py-4">
              {quickArticleError && (
                <div className="rounded bg-red-50 p-2 text-sm text-red-600">{quickArticleError}</div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium">Code *</label>
                  <input
                    type="text"
                    required
                    value={quickArticleForm.code}
                    onChange={(e) => setQuickArticleForm({ ...quickArticleForm, code: e.target.value })}
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Unité</label>
                  <input
                    type="text"
                    value={quickArticleForm.unite}
                    onChange={(e) => setQuickArticleForm({ ...quickArticleForm, unite: e.target.value })}
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Unité secondaire</label>
                  <input
                    type="text"
                    value={quickArticleForm.unite_conditionnement}
                    onChange={(e) => setQuickArticleForm({ ...quickArticleForm, unite_conditionnement: e.target.value })}
                    placeholder="Ex: Boîte, Bouteille..."
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">
                  Équivalence (1 {quickArticleForm.unite || 'unité'} = ? {quickArticleForm.unite_conditionnement || 'unité secondaire'})
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quickArticleForm.qte_par_conditionnement}
                  onChange={(e) => setQuickArticleForm({ ...quickArticleForm, qte_par_conditionnement: e.target.value })}
                  className="mt-1 w-full rounded border px-3 py-2"
                  disabled={!quickArticleForm.unite_conditionnement}
                />
                <p className="mt-1 text-xs text-slate-500">Saisissez combien d'unités secondaires équivalent à 1 unité principale.</p>
              </div>

              <div>
                <label className="block text-sm font-medium">Désignation *</label>
                <input
                  type="text"
                  required
                  value={quickArticleForm.designation}
                  onChange={(e) => setQuickArticleForm({ ...quickArticleForm, designation: e.target.value })}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium">Prix unitaire</label>
                  <input
                    type="number"
                    min="0"
                    value={quickArticleForm.prix_unitaire}
                    onChange={(e) => setQuickArticleForm({ ...quickArticleForm, prix_unitaire: e.target.value })}
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Quantité stock</label>
                  <input
                    type="number"
                    min="0"
                    value={quickArticleForm.quantite_stock}
                    onChange={(e) => setQuickArticleForm({ ...quickArticleForm, quantite_stock: e.target.value })}
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Quantité min</label>
                  <input
                    type="number"
                    min="0"
                    value={quickArticleForm.quantite_min}
                    onChange={(e) => setQuickArticleForm({ ...quickArticleForm, quantite_min: e.target.value })}
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => { setShowQuickArticleModal(false); resetQuickArticleForm(); }}
                  className="rounded border px-4 py-2 text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={quickArticleLoading}
                  className="rounded bg-primary-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {quickArticleLoading ? 'En cours...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal détails */}
      {showDetailModal && selectedBon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-xl bg-white p-6 dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">Bon de commande {selectedBon.numero}</h2>
                <p className="text-sm text-slate-600">Date: {formatDate(selectedBon.date_commande)}</p>
              </div>
              <button
                onClick={() => exportPDF(selectedBon)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                Export PDF
              </button>
            </div>

            <div className="space-y-4">
              {(selectedBon.fournisseur_nom || selectedBon.fournisseur_adresse || selectedBon.fournisseur_telephone) && (
                <div className="rounded border p-4">
                  <h3 className="mb-2 font-semibold">Fournisseur</h3>
                  {selectedBon.fournisseur_nom && <p className="font-medium">{selectedBon.fournisseur_nom}</p>}
                  {selectedBon.fournisseur_adresse && <p className="text-sm">{selectedBon.fournisseur_adresse}</p>}
                  {selectedBon.fournisseur_telephone && <p className="text-sm">Tél: {selectedBon.fournisseur_telephone}</p>}
                </div>
              )}

              <div>
                <h3 className="mb-2 font-semibold">Articles commandés</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-2 text-left">Code</th>
                      <th className="px-2 py-2 text-left">Désignation</th>
                      <th className="px-2 py-2 text-center">Unité</th>
                      <th className="px-2 py-2 text-right">Qté</th>
                      <th className="px-2 py-2 text-right">P.U. (FCFA)</th>
                      <th className="px-2 py-2 text-right">Montant (FCFA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBon.items.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-2 py-2">{item.code}</td>
                        <td className="px-2 py-2">{item.designation}</td>
                        <td className="px-2 py-2 text-center">{item.unite}</td>
                        <td className="px-2 py-2 text-right">{item.quantite}</td>
                        <td className="px-2 py-2 text-center">{item.unite || item.article_unite || '-'}</td>
                        <td className="px-2 py-2 text-right">{item.prix_unitaire.toLocaleString()}</td>
                        <td className="px-2 py-2 text-right font-semibold">{item.montant.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td colSpan={5} className="px-2 py-3 text-right">TOTAL:</td>
                      <td className="px-2 py-3 text-right">{selectedBon.montant_total.toLocaleString()} FCFA</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {selectedBon.observations && (
                <div className="rounded border p-4">
                  <h3 className="mb-2 font-semibold">Observations</h3>
                  <p className="text-sm">{selectedBon.observations}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="font-medium">Statut:</span>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatutColor(selectedBon.statut)}`}>
                  {selectedBon.statut}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="rounded border px-4 py-2 text-sm font-medium"
              >
                Fermer
              </button>
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
                onClick={handleConfirmPrintBon}
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

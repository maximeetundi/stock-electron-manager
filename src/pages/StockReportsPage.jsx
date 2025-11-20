import React, { useState, useEffect } from 'react';
import {
  DocumentArrowDownIcon,
  ChartBarIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import { PERIOD_OPTIONS } from '@/utils/apiClient';
import Card from '@/components/ui/Card';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { generateEtatStockPrintHtml, generateBonsCommandePrintHtml, generateMouvementsPrintHtml } from '@/utils/printReports';

const PERIOD_CHOICES = [
  { key: 'all', label: 'Toutes les périodes' },
  ...PERIOD_OPTIONS.filter((option) => option.key !== 'custom').map((option) => ({
    key: option.key,
    label: option.label
  })),
  { key: 'custom', label: 'Période personnalisée' }
];

export default function StockReportsPage() {
  const [articles, setArticles] = useState([]);
  const [bonsCommande, setBonsCommande] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [filters, setFilters] = useState({
    dateDebut: '',
    dateFin: '',
    statut: 'all',
    typeMouvement: 'all' // 'all', 'ENTREE', 'SORTIE'
  });

  // États pour la recherche et pagination des articles en alerte
  const [alertSearchTerm, setAlertSearchTerm] = useState('');
  const [alertCurrentPage, setAlertCurrentPage] = useState(1);
  const ALERT_ITEMS_PER_PAGE = 15;

  // États pour l'aperçu avant impression
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState('');
  const [printPreviewTitle, setPrintPreviewTitle] = useState('');

  const [stats, setStats] = useState({
    totalArticles: 0,
    valeurTotaleStock: 0,
    articlesEnAlerte: 0,
    bonsEnCours: 0,
    bonsLivres: 0,
    totalMouvements: 0,
    totalEntrees: 0,
    totalSorties: 0,
    quantiteEntrees: 0,
    quantiteSorties: 0,
    articlesEnRupture: 0,
    tauxRotation: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Appliquer les dates selon la période sélectionnée
    if (selectedPeriod !== 'custom') {
      applyPeriodDates(selectedPeriod);
    }
  }, [selectedPeriod]);

  const applyPeriodDates = (period) => {
    if (period === 'all') {
      setFilters({ ...filters, dateDebut: '', dateFin: '' });
      return;
    }

    const now = new Date();
    const startDate = new Date();

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
        return;
    }

    setFilters({
      ...filters,
      dateDebut: startDate.toISOString().split('T')[0],
      dateFin: now.toISOString().split('T')[0]
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [articlesRes, bonsRes, mouvementsRes] = await Promise.all([
        window.api.articles.list(),
        window.api.bonsCommande.list(),
        window.api.mouvements.list(null, 1000)
      ]);

      if (articlesRes.ok) setArticles(articlesRes.data);
      if (bonsRes.ok) setBonsCommande(bonsRes.data);
      if (mouvementsRes.ok) setMouvements(mouvementsRes.data);

      calculateStats(articlesRes.data, bonsRes.data, mouvementsRes.data);
    } catch (err) {
      console.error('Erreur chargement données', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (arts, bons, mouvs) => {
    const totalArticles = arts.length;
    const valeurTotaleStock = arts.reduce((sum, a) => sum + (a.quantite_stock * a.prix_unitaire), 0);
    const articlesEnAlerte = arts.filter(a => a.quantite_stock <= a.quantite_min && a.quantite_stock > 0).length;
    const articlesEnRupture = arts.filter(a => a.quantite_stock === 0).length;
    const bonsEnCours = bons.filter(b => b.statut === 'EN_COURS').length;
    const bonsLivres = bons.filter(b => b.statut === 'LIVREE').length;

    // Statistiques des mouvements
    const entrees = mouvs.filter(m => m.type === 'ENTREE');
    const sorties = mouvs.filter(m => m.type === 'SORTIE');
    const totalEntrees = entrees.length;
    const totalSorties = sorties.length;
    const quantiteEntrees = entrees.reduce((sum, m) => sum + m.quantite, 0);
    const quantiteSorties = sorties.reduce((sum, m) => sum + m.quantite, 0);

    // Taux de rotation (sorties / stock moyen) - simplifié
    const tauxRotation = valeurTotaleStock > 0 
      ? ((quantiteSorties / totalArticles) * 100).toFixed(1)
      : 0;

    setStats({
      totalArticles,
      valeurTotaleStock,
      articlesEnAlerte,
      articlesEnRupture,
      bonsEnCours,
      bonsLivres,
      totalMouvements: mouvs.length,
      totalEntrees,
      totalSorties,
      quantiteEntrees,
      quantiteSorties,
      tauxRotation
    });
  };

  const getFilteredBons = () => {
    let filtered = [...bonsCommande];

    if (filters.dateDebut) {
      filtered = filtered.filter(b => new Date(b.date_commande) >= new Date(filters.dateDebut));
    }

    if (filters.dateFin) {
      filtered = filtered.filter(b => new Date(b.date_commande) <= new Date(filters.dateFin));
    }

    if (filters.statut !== 'all') {
      filtered = filtered.filter(b => b.statut === filters.statut);
    }

    return filtered;
  };

  const getFilteredMouvements = () => {
    let filtered = [...mouvements];

    if (filters.dateDebut) {
      filtered = filtered.filter(m => new Date(m.date_mouvement) >= new Date(filters.dateDebut));
    }

    if (filters.dateFin) {
      filtered = filtered.filter(m => new Date(m.date_mouvement) <= new Date(filters.dateFin));
    }

    // Filtre par type de mouvement
    if (filters.typeMouvement !== 'all') {
      filtered = filtered.filter(m => m.type === filters.typeMouvement);
    }

    return filtered;
  };

  const exportEtatStockPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('ETAT DES STOCKS', 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, 35);
    doc.text(`Nombre d'articles: ${stats.totalArticles}`, 20, 42);
    // Formatage sans espaces insécables
    const valeurFormatee = stats.valeurTotaleStock.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    doc.text(`Valeur totale: ${valeurFormatee} FCFA`, 20, 49);
    doc.text(`Articles en alerte: ${stats.articlesEnAlerte}`, 20, 56);

    const tableData = articles.map(a => [
      a.code,
      a.designation,
      a.unite,
      a.quantite_stock,
      a.quantite_min,
      // Formatage sans espaces insécables
      a.prix_unitaire.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
      (a.quantite_stock * a.prix_unitaire).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
      a.quantite_stock <= a.quantite_min ? 'ALERTE' : 'OK'
    ]);

    doc.autoTable({
      startY: 65,
      head: [['Code', 'Designation', 'Unite', 'Stock', 'Stock Min', 'P.U.', 'Valeur', 'Etat']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'center' }
      }
    });

    // Statistiques en bas
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('STATISTIQUES', 20, finalY);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const totalStock = articles.reduce((sum, a) => sum + a.quantite_stock, 0);
    const articlesEnRupture = articles.filter(a => a.quantite_stock === 0).length;
    const valeurMoyenne = stats.totalArticles > 0 ? (stats.valeurTotaleStock / stats.totalArticles).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : 0;
    
    doc.text(`Total quantites en stock: ${totalStock.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} unites`, 20, finalY + 7);
    doc.text(`Articles en rupture: ${articlesEnRupture}`, 20, finalY + 14);
    doc.text(`Valeur moyenne par article: ${valeurMoyenne} FCFA`, 20, finalY + 21);
    doc.text(`Taux d'alerte: ${((stats.articlesEnAlerte / stats.totalArticles) * 100).toFixed(1)}%`, 20, finalY + 28);

    doc.save(`etat-stock-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportBonsCommandePDF = () => {
    const doc = new jsPDF();
    const filtered = getFilteredBons();
    
    doc.setFontSize(18);
    doc.text('RAPPORT BONS DE COMMANDE', 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    // Affichage de la période selon le filtre
    let periodeText = 'Toutes les périodes';
    if (filters.dateDebut && filters.dateFin) {
      const dateDebut = new Date(filters.dateDebut).toLocaleDateString('fr-FR');
      const dateFin = new Date(filters.dateFin).toLocaleDateString('fr-FR');
      periodeText = `${dateDebut} au ${dateFin}`;
    } else if (selectedPeriod !== 'all' && selectedPeriod !== 'custom') {
      const periodLabel = PERIOD_CHOICES.find(p => p.key === selectedPeriod)?.label || '';
      periodeText = periodLabel;
    }
    doc.text(`Periode: ${periodeText}`, 20, 35);
    doc.text(`Nombre de bons: ${filtered.length}`, 20, 42);
    const totalMontant = filtered.reduce((sum, b) => sum + b.montant_total, 0);
    // Formatage du montant sans espaces insécables pour éviter les problèmes jsPDF
    const montantFormate = totalMontant.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    doc.text(`Montant total: ${montantFormate} FCFA`, 20, 49);

    const tableData = filtered.map(b => [
      b.numero,
      new Date(b.date_commande).toLocaleDateString('fr-FR'),
      b.fournisseur_nom,
      b.statut,
      // Formatage du montant sans espaces insécables
      b.montant_total.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    ]);

    doc.autoTable({
      startY: 60,
      head: [['N° Bon', 'Date', 'Fournisseur', 'Statut', 'Montant (FCFA)']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        4: { halign: 'right' }
      }
    });

    // Statistiques en bas
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('STATISTIQUES', 20, finalY);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const bonsEnCours = filtered.filter(b => b.statut === 'EN_COURS').length;
    const bonsLivres = filtered.filter(b => b.statut === 'LIVREE').length;
    const bonsAnnules = filtered.filter(b => b.statut === 'ANNULEE').length;
    const montantEnCours = filtered.filter(b => b.statut === 'EN_COURS').reduce((sum, b) => sum + b.montant_total, 0);
    const montantLivre = filtered.filter(b => b.statut === 'LIVREE').reduce((sum, b) => sum + b.montant_total, 0);
    const montantMoyen = filtered.length > 0 ? (totalMontant / filtered.length).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : 0;
    
    doc.text(`Bons en cours: ${bonsEnCours} (${montantEnCours.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA)`, 20, finalY + 7);
    doc.text(`Bons livres: ${bonsLivres} (${montantLivre.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA)`, 20, finalY + 14);
    doc.text(`Bons annules: ${bonsAnnules}`, 20, finalY + 21);
    doc.text(`Montant moyen par bon: ${montantMoyen} FCFA`, 20, finalY + 28);

    doc.save(`bons-commande-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportMouvementsPDF = () => {
    const doc = new jsPDF();
    const filtered = getFilteredMouvements();
    
    doc.setFontSize(18);
    doc.text('MOUVEMENTS DE STOCK', 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    // Affichage de la période selon le filtre
    let periodeText = 'Toutes les périodes';
    if (filters.dateDebut && filters.dateFin) {
      const dateDebut = new Date(filters.dateDebut).toLocaleDateString('fr-FR');
      const dateFin = new Date(filters.dateFin).toLocaleDateString('fr-FR');
      periodeText = `${dateDebut} au ${dateFin}`;
    } else if (selectedPeriod !== 'all' && selectedPeriod !== 'custom') {
      const periodLabel = PERIOD_CHOICES.find(p => p.key === selectedPeriod)?.label || '';
      periodeText = periodLabel;
    }
    doc.text(`Periode: ${periodeText}`, 20, 35);
    
    // Affichage du type de mouvement
    let typeText = 'Tous les mouvements';
    if (filters.typeMouvement === 'ENTREE') {
      typeText = 'Entrees uniquement';
    } else if (filters.typeMouvement === 'SORTIE') {
      typeText = 'Sorties uniquement';
    }
    doc.text(`Type: ${typeText}`, 20, 42);
    doc.text(`Nombre de mouvements: ${filtered.length}`, 20, 49);

    const tableData = filtered.map(m => [
      new Date(m.date_mouvement).toLocaleDateString('fr-FR'),
      `${m.code} - ${m.designation}`,
      m.type,
      m.quantite,
      m.reference || '-',
      m.motif || '-'
    ]);

    doc.autoTable({
      startY: 60,
      head: [['Date', 'Article', 'Type', 'Quantite', 'Reference', 'Motif']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        3: { halign: 'right' }
      }
    });

    // Statistiques en bas
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('STATISTIQUES', 20, finalY);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const entrees = filtered.filter(m => m.type === 'ENTREE');
    const sorties = filtered.filter(m => m.type === 'SORTIE');
    const totalEntrees = entrees.length;
    const totalSorties = sorties.length;
    const quantiteEntrees = entrees.reduce((sum, m) => sum + m.quantite, 0);
    const quantiteSorties = sorties.reduce((sum, m) => sum + m.quantite, 0);
    const quantiteMoyenne = filtered.length > 0 ? (filtered.reduce((sum, m) => sum + m.quantite, 0) / filtered.length).toFixed(1) : 0;
    
    doc.text(`Total entrees: ${totalEntrees} mouvements (${quantiteEntrees.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} unites)`, 20, finalY + 7);
    doc.text(`Total sorties: ${totalSorties} mouvements (${quantiteSorties.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} unites)`, 20, finalY + 14);
    doc.text(`Quantite moyenne par mouvement: ${quantiteMoyenne} unites`, 20, finalY + 21);
    doc.text(`Balance: ${(quantiteEntrees - quantiteSorties > 0 ? '+' : '')}${(quantiteEntrees - quantiteSorties).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} unites`, 20, finalY + 28);

    doc.save(`mouvements-stock-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportEtatStockExcel = () => {
    const data = articles.map(a => ({
      'Code': a.code,
      'Désignation': a.designation,
      'Unité': a.unite,
      'Stock Actuel': a.quantite_stock,
      'Stock Minimum': a.quantite_min,
      'Prix Unitaire (FCFA)': a.prix_unitaire,
      'Valeur Stock (FCFA)': a.quantite_stock * a.prix_unitaire,
      'État': a.quantite_stock <= a.quantite_min ? 'ALERTE' : 'OK'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'État des Stocks');
    XLSX.writeFile(wb, `etat-stock-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportBonsCommandeExcel = () => {
    const filtered = getFilteredBons();
    const data = filtered.map(b => ({
      'N° Bon': b.numero,
      'Date': new Date(b.date_commande).toLocaleDateString('fr-FR'),
      'Fournisseur': b.fournisseur_nom,
      'Statut': b.statut,
      'Montant (FCFA)': b.montant_total
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bons de Commande');
    XLSX.writeFile(wb, `bons-commande-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportMouvementsExcel = () => {
    const filtered = getFilteredMouvements();
    const data = filtered.map(m => ({
      'Date': new Date(m.date_mouvement).toLocaleDateString('fr-FR'),
      'Code Article': m.code,
      'Désignation': m.designation,
      'Type': m.type,
      'Quantité': m.quantite,
      'Référence': m.reference || '-',
      'Motif': m.motif || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mouvements');
    XLSX.writeFile(wb, `mouvements-stock-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Fonctions pour l'impression avec aperçu
  const handlePrintEtatStock = () => {
    const html = generateEtatStockPrintHtml(articles, stats);
    setPrintPreviewHtml(html);
    setPrintPreviewTitle('État des Stocks');
    setShowPrintPreview(true);
  };

  const handlePrintBonsCommande = () => {
    const filtered = getFilteredBons();
    const html = generateBonsCommandePrintHtml(filtered, stats, filters, selectedPeriod, PERIOD_CHOICES);
    setPrintPreviewHtml(html);
    setPrintPreviewTitle('Rapport Bons de Commande');
    setShowPrintPreview(true);
  };

  const handlePrintMouvements = () => {
    const filtered = getFilteredMouvements();
    const html = generateMouvementsPrintHtml(filtered, filters, selectedPeriod, PERIOD_CHOICES);
    setPrintPreviewHtml(html);
    setPrintPreviewTitle('Mouvements de Stock');
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
      {/* Statistiques */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Articles</p>
              <p className="text-2xl font-bold">{stats.totalArticles}</p>
            </div>
            <CubeIcon className="h-10 w-10 opacity-80" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Valeur Stock</p>
              <p className="text-2xl font-bold">{(stats.valeurTotaleStock / 1000).toFixed(0)}K</p>
              <p className="text-xs opacity-80">FCFA</p>
            </div>
            <ChartBarIcon className="h-10 w-10 opacity-80" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Alertes</p>
              <p className="text-2xl font-bold">{stats.articlesEnAlerte}</p>
            </div>
            <ExclamationTriangleIcon className="h-10 w-10 opacity-80" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Bons en cours</p>
              <p className="text-2xl font-bold">{stats.bonsEnCours}</p>
            </div>
            <ClipboardDocumentListIcon className="h-10 w-10 opacity-80" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Bons livrés</p>
              <p className="text-2xl font-bold">{stats.bonsLivres}</p>
            </div>
            <ClipboardDocumentListIcon className="h-10 w-10 opacity-80" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Mouvements</p>
              <p className="text-2xl font-bold">{stats.totalMouvements}</p>
            </div>
            <ChartBarIcon className="h-10 w-10 opacity-80" />
          </div>
        </Card>
      </div>

      {/* Statistiques détaillées des mouvements */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-primary-500" />
          Statistiques des mouvements
        </h3>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Entrées */}
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 dark:text-green-400">ENTRÉES</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.totalEntrees}</p>
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                  {stats.quantiteEntrees.toLocaleString('fr-FR')} unités
                </p>
              </div>
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-800/30">
                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Sorties */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400">SORTIES</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.totalSorties}</p>
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {stats.quantiteSorties.toLocaleString('fr-FR')} unités
                </p>
              </div>
              <div className="rounded-full bg-red-100 p-3 dark:bg-red-800/30">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Ruptures */}
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-600 dark:text-orange-400">RUPTURES</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.articlesEnRupture}</p>
                <p className="mt-1 text-sm text-orange-600 dark:text-orange-400">
                  Articles à 0
                </p>
              </div>
              <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-800/30">
                <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          {/* Taux de rotation */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">ROTATION</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.tauxRotation}%</p>
                <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                  Taux moyen
                </p>
              </div>
              <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-800/30">
                <ChartBarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Graphique simple entrées vs sorties */}
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Comparaison Entrées / Sorties
          </h4>
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-green-600 dark:text-green-400">Entrées</span>
                <span className="font-semibold text-green-700 dark:text-green-300">{stats.quantiteEntrees}</span>
              </div>
              <div className="h-6 rounded-full bg-green-100 dark:bg-green-900/30">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{
                    width: `${stats.quantiteEntrees + stats.quantiteSorties > 0 
                      ? (stats.quantiteEntrees / (stats.quantiteEntrees + stats.quantiteSorties)) * 100 
                      : 0}%`
                  }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-red-600 dark:text-red-400">Sorties</span>
                <span className="font-semibold text-red-700 dark:text-red-300">{stats.quantiteSorties}</span>
              </div>
              <div className="h-6 rounded-full bg-red-100 dark:bg-red-900/30">
                <div
                  className="h-full rounded-full bg-red-500 transition-all"
                  style={{
                    width: `${stats.quantiteEntrees + stats.quantiteSorties > 0 
                      ? (stats.quantiteSorties / (stats.quantiteEntrees + stats.quantiteSorties)) * 100 
                      : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Filtres */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon className="h-5 w-5 text-primary-500" />
          <h3 className="text-lg font-semibold">Filtres de période</h3>
        </div>
        
        {/* Sélecteur de période */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Sélectionner une période :
          </label>
          <div className="flex flex-wrap gap-2">
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
        </div>

        {/* Dates personnalisées */}
        {selectedPeriod === 'custom' && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Date de début :
                </label>
                <input
                  type="date"
                  value={filters.dateDebut}
                  onChange={(e) => setFilters({ ...filters, dateDebut: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Date de fin :
                </label>
                <input
                  type="date"
                  value={filters.dateFin}
                  onChange={(e) => setFilters({ ...filters, dateFin: e.target.value })}
                  min={filters.dateDebut}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                />
              </div>
            </div>
            {filters.dateDebut && filters.dateFin && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Du {new Date(filters.dateDebut).toLocaleDateString('fr-FR')} au {new Date(filters.dateFin).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        )}

        {/* Période sélectionnée */}
        <p className="mb-4 text-xs uppercase tracking-wide text-slate-400">
          {selectedPeriod === 'all'
            ? 'Toutes les périodes affichées'
            : selectedPeriod === 'custom' && filters.dateDebut && filters.dateFin
            ? `Période personnalisée : ${new Date(filters.dateDebut).toLocaleDateString('fr-FR')} - ${new Date(filters.dateFin).toLocaleDateString('fr-FR')}`
            : `Période sélectionnée : ${PERIOD_CHOICES.find((option) => option.key === selectedPeriod)?.label ?? ''}`}
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Statut bons</label>
            <select
              value={filters.statut}
              onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              <option value="all">Tous</option>
              <option value="EN_COURS">En cours</option>
              <option value="LIVREE">Livrés</option>
              <option value="ANNULEE">Annulés</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Type de mouvement</label>
            <select
              value={filters.typeMouvement}
              onChange={(e) => setFilters({ ...filters, typeMouvement: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              <option value="all">Tous (Entrées + Sorties)</option>
              <option value="ENTREE">Entrées uniquement</option>
              <option value="SORTIE">Sorties uniquement</option>
            </select>
          </div>
        </div>

        {/* Indicateur du filtre actif */}
        {filters.typeMouvement !== 'all' && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <span className="font-semibold">Filtre actif :</span> Affichage des{' '}
              {filters.typeMouvement === 'ENTREE' ? 'entrées' : 'sorties'} uniquement
            </p>
          </div>
        )}
      </Card>

      {/* Rapports disponibles */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* État des stocks */}
        <Card>
          <h3 className="mb-3 text-lg font-semibold">État des Stocks</h3>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Liste complète des articles avec quantités, valeurs et alertes
          </p>
          <div className="space-y-2">
            <button
              onClick={exportEtatStockPDF}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Exporter PDF
            </button>
            <button
              onClick={handlePrintEtatStock}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <PrinterIcon className="h-5 w-5" />
              Imprimer
            </button>
            <button
              onClick={exportEtatStockExcel}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Exporter Excel
            </button>
          </div>
        </Card>

        {/* Bons de commande */}
        <Card>
          <h3 className="mb-3 text-lg font-semibold">Bons de Commande</h3>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Liste des bons avec fournisseurs, montants et statuts (période filtrée)
          </p>
          <div className="space-y-2">
            <button
              onClick={exportBonsCommandePDF}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Exporter PDF
            </button>
            <button
              onClick={handlePrintBonsCommande}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <PrinterIcon className="h-5 w-5" />
              Imprimer
            </button>
            <button
              onClick={exportBonsCommandeExcel}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Exporter Excel
            </button>
          </div>
        </Card>

        {/* Mouvements de stock */}
        <Card>
          <h3 className="mb-3 text-lg font-semibold">Mouvements de Stock</h3>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Historique complet des entrées, sorties et ajustements (période filtrée)
          </p>
          <div className="space-y-2">
            <button
              onClick={exportMouvementsPDF}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Exporter PDF
            </button>
            <button
              onClick={handlePrintMouvements}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <PrinterIcon className="h-5 w-5" />
              Imprimer
            </button>
            <button
              onClick={exportMouvementsExcel}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Exporter Excel
            </button>
          </div>
        </Card>
      </div>

      {/* Articles en alerte (amélioré) */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Articles en alerte
            </h3>
          </div>
          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {articles.filter(a => a.quantite_stock <= a.quantite_min).length} article{articles.filter(a => a.quantite_stock <= a.quantite_min).length > 1 ? 's' : ''}
          </span>
        </div>
        
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Articles dont le stock est inférieur ou égal au seuil minimum
        </p>

        {(() => {
          const articlesEnAlerte = articles.filter(a => a.quantite_stock <= a.quantite_min);
          
          // Filtrage par recherche
          const filteredAlerts = articlesEnAlerte.filter(article => {
            const search = alertSearchTerm.toLowerCase();
            return (
              article.code.toLowerCase().includes(search) ||
              article.designation.toLowerCase().includes(search)
            );
          });

          // Pagination
          const totalPages = Math.ceil(filteredAlerts.length / ALERT_ITEMS_PER_PAGE);
          const paginatedAlerts = filteredAlerts.slice(
            (alertCurrentPage - 1) * ALERT_ITEMS_PER_PAGE,
            alertCurrentPage * ALERT_ITEMS_PER_PAGE
          );

          // Réinitialiser la page si changement de recherche
          React.useEffect(() => {
            setAlertCurrentPage(1);
          }, [alertSearchTerm]);

          if (articlesEnAlerte.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-green-100 p-4 dark:bg-green-900/30">
                  <ExclamationTriangleIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
                <p className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                  Aucun article en alerte
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Tous les articles ont un stock suffisant ✓
                </p>
              </div>
            );
          }

          return (
            <>
              {/* Barre de recherche */}
              <div className="mb-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par code ou désignation..."
                    value={alertSearchTerm}
                    onChange={(e) => setAlertSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                  {alertSearchTerm && (
                    <button
                      onClick={() => setAlertSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-600"
                    >
                      <XMarkIcon className="h-4 w-4 text-slate-400" />
                    </button>
                  )}
                </div>
                {filteredAlerts.length !== articlesEnAlerte.length && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {filteredAlerts.length} résultat{filteredAlerts.length > 1 ? 's' : ''} sur {articlesEnAlerte.length}
                  </p>
                )}
              </div>

              {/* Tableau des articles */}
              {filteredAlerts.length > 0 ? (
                <>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                          <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Code</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Désignation</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Unité</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Stock actuel</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Stock min</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Valeur (FCFA)</th>
                          <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {paginatedAlerts.map(a => (
                          <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-slate-100">{a.code}</td>
                            <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{a.designation}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{a.unite}</td>
                            <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">{a.quantite_stock}</td>
                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{a.quantite_min}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                              {(a.quantite_stock * a.prix_unitaire).toLocaleString('fr-FR')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                <ExclamationTriangleIcon className="h-3 w-3" />
                                {a.quantite_stock === 0 ? 'RUPTURE' : 'ALERTE'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Page {alertCurrentPage} sur {totalPages} • {filteredAlerts.length} article{filteredAlerts.length > 1 ? 's' : ''}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAlertCurrentPage(alertCurrentPage - 1)}
                          disabled={alertCurrentPage === 1}
                          className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          <ChevronLeftIcon className="h-4 w-4" />
                          Précédent
                        </button>
                        <button
                          onClick={() => setAlertCurrentPage(alertCurrentPage + 1)}
                          disabled={alertCurrentPage === totalPages}
                          className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          Suivant
                          <ChevronRightIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <MagnifyingGlassIcon className="h-12 w-12 text-slate-400" />
                  <p className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                    Aucun résultat
                  </p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Aucun article ne correspond à votre recherche
                  </p>
                </div>
              )}
            </>
          );
        })()}
      </Card>

      {/* Modal aperçu avant impression */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
            {/* En-tête du modal */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">{printPreviewTitle} - Aperçu avant impression</h2>
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

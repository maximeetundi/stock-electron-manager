import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FiltersPanel from './components/FiltersPanel.jsx';
import TotalsSection from './components/TotalsSection.jsx';
import TransactionsSection from './components/TransactionsSection.jsx';
import { categoriesApi, fileApi, transactionsApi, appApi } from '@/utils/apiClient';
import { arrayBufferToBase64 } from '@/utils/file';
import { utils as XLSXUtils, write as writeWorkbook } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate, formatTime } from '@/utils/format';
import { DEFAULT_FILENAME } from './constants.js';
import { formatPeriodLabel, aggregateTransactions, mapTransactionsForExport } from './utils.js';

export default function ReportsPage() {
  const [filters, setFilters] = useState({
    period: 'month',
    typeFilter: 'all',
    categoryId: '',
    referenceDate: new Date().toISOString().slice(0, 10),
    startDate: '',
    endDate: ''
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesError, setCategoriesError] = useState(null);
  const [order, setOrder] = useState('DESC');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [editModal, setEditModal] = useState({ open: false, transaction: null, error: null, loading: false });
  const [editForm, setEditForm] = useState({
    categorieId: '',
    montant: '',
    type: 'ENTREE',
    dateHeure: '',
    libelle: '',
    lieu: ''
  });
  const [deleteModal, setDeleteModal] = useState({ open: false, transaction: null, error: null, loading: false });

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await transactionsApi.byPeriod(filters);
      const normalizedTransactions = (response?.transactions ?? []).map((transaction) => ({
        ...transaction,
        libelle: transaction.libelle ?? transaction.lieu ?? ''
      }));
      const normalizedCategoryBreakdown = (response?.categoryBreakdown ?? []).map((item) => ({
        ...item,
        libelle: item.libelle ?? item.categorie
      }));
      setData({
        ...response,
        transactions: normalizedTransactions,
        categoryBreakdown: normalizedCategoryBreakdown
      });
    } catch (err) {
      setError(err.message || 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (filters.period === 'custom' && (!filters.startDate || !filters.endDate)) {
      return;
    }
    fetchData();
  }, [fetchData]);

  const totals = useMemo(() => {
    if (!data) {
      return { global: { entree: 0, sortie: 0, balance: 0 }, categories: [] };
    }
    const global = {
      entree: data.totals?.entree ?? 0,
      sortie: data.totals?.sortie ?? 0,
      balance: (data.totals?.entree ?? 0) - (data.totals?.sortie ?? 0)
    };
    const categoriesBreakdown = (data.categoryBreakdown || []).map((item) => ({
      categorie: item.categorie,
      entree: item.entree,
      sortie: item.sortie,
      balance: (item.entree || 0) - (item.sortie || 0)
    }));
    return { global, categories: categoriesBreakdown };
  }, [data]);

  const counts = useMemo(() => ({
    totalCount: data?.counts?.totalCount ?? 0,
    entreeCount: data?.counts?.entreeCount ?? 0,
    sortieCount: data?.counts?.sortieCount ?? 0
  }), [data?.counts]);

  // Handle search input: numeric -> jump to rank page; text -> filter by libellé
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    const raw = String(value).trim();
    if (/^\d+$/.test(raw)) {
      const n = Math.max(1, parseInt(raw, 10));
      const targetIndex = n - 1;
      const targetPage = Math.floor(targetIndex / pageSize);
      setPage(targetPage);
    } else {
      // For text search, always reset to first page for convenience
      setPage(0);
    }
  }, [pageSize]);

  const handlePeriodChange = useCallback((value) => {
    setFilters((prev) => {
      const next = { ...prev, ...value };
      if (value.period && value.period !== 'custom') {
        next.startDate = '';
        next.endDate = '';
      }
      if ((value.startDate || value.endDate) && !value.period) {
        next.period = 'custom';
      }
      return next;
    });
  }, []);

  const handleTypeChange = useCallback((type) => {
    setFilters((prev) => ({
      ...prev,
      typeFilter: type
    }));
  }, []);

  const handleCategoryChange = useCallback((event) => {
    const value = event.target.value;
    setFilters((prev) => ({
      ...prev,
      categoryId: value
    }));
  }, []);

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

  const typeLabel = useMemo(() => {
    switch (data?.type) {
      case 'ENTREE':
        return 'Entrées uniquement';
      case 'SORTIE':
        return 'Sorties uniquement';
      default:
        return 'Entrées & sorties';
    }
  }, [data?.type]);

  const periodLabel = useMemo(
    () => formatPeriodLabel(filters),
    [filters.period, filters.referenceDate, filters.startDate, filters.endDate]
  );

  const exportTransactions = useMemo(() => {
    if (!data?.transactions?.length) {
      return [];
    }
    if (filters.typeFilter === 'all') {
      return data.transactions;
    }
    return data.transactions.filter((transaction) => transaction.type === filters.typeFilter);
  }, [data?.transactions, filters.typeFilter]);

  const baseList = useMemo(() => (data?.transactions ?? []).map((t) => ({
    ...t,
    libelle: t.libelle ?? t.lieu ?? ''
  })), [data?.transactions]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim();
    if (!q || /^\d+$/.test(q)) return baseList;
    const lower = q.toLowerCase();
    return baseList.filter((t) =>
      (t.libelle || '').toLowerCase().includes(lower)
    );
  }, [baseList, searchQuery]);

  const totalTransactions = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalTransactions / pageSize));

  const sortedTransactions = useMemo(() => {
    if (!filteredList.length) {
      return [];
    }
    const copy = [...filteredList];
    copy.sort((a, b) => {
      if (order === 'ASC') {
        return new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime();
      }
      return new Date(b.dateHeure).getTime() - new Date(a.dateHeure).getTime();
    });
    const ordered = copy;
    if (!Number.isInteger(page) || page < 0) {
      return ordered;
    }
    const start = page * pageSize;
    return ordered.slice(start, start + pageSize);
  }, [filteredList, order, page, pageSize]);

  useEffect(() => {
    if (page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, pageSize, totalPages]);

  const handleOrderChange = (nextOrder) => {
    setOrder(nextOrder);
    setPage(0);
  };

  const handlePageChange = (nextPage) => {
    const clamped = Math.min(Math.max(nextPage, 0), Math.max(0, totalPages - 1));
    setPage(clamped);
  };

  const openEditModal = (transaction) => {
    if (!transaction) {
      return;
    }
    setEditForm({
      categorieId: String(transaction.categorieId ?? ''),
      montant: String(transaction.montant ?? ''),
      type: transaction.type ?? 'ENTREE',
      dateHeure: transaction.dateHeure ? transaction.dateHeure.slice(0, 16) : '',
      libelle: transaction.libelle ?? '',
      lieu: transaction.lieu ?? ''
    });
    setEditModal({ open: true, transaction, error: null, loading: false });
  };

  const closeEditModal = () => {
    setEditModal({ open: false, transaction: null, error: null, loading: false });
  };

  const submitEditModal = async (event) => {
    event.preventDefault();
    if (!editModal.transaction) {
      return;
    }
    setEditModal((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const normalizedMontant = Number(
        String(editForm.montant)
          .replace(/[ \u00A0\u202F]/g, '')
          .replace(',', '.')
      );
      if (Number.isNaN(normalizedMontant) || normalizedMontant <= 0) {
        setEditModal((prev) => ({ ...prev, loading: false, error: 'Veuillez saisir un montant valide.' }));
        return;
      }

      const payload = {
        categorieId: Number(editForm.categorieId),
        montant: normalizedMontant,
        type: editForm.type,
        libelle: editForm.libelle.trim(),
        lieu: editForm.lieu.trim(),
        dateHeure: editForm.dateHeure ? new Date(editForm.dateHeure).toISOString() : undefined
      };
      await transactionsApi.update(editModal.transaction.id, payload);
      await fetchData();
      closeEditModal();
    } catch (err) {
      setEditModal((prev) => ({ ...prev, error: err.message || 'Impossible de mettre à jour la transaction' }));
    } finally {
      setEditModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const openDeleteModal = (transaction) => {
    if (!transaction) {
      return;
    }
    setDeleteModal({ open: true, transaction, error: null, loading: false });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, transaction: null, error: null, loading: false });
  };

  const confirmDelete = async () => {
    if (!deleteModal.transaction) {
      return;
    }
    setDeleteModal((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await transactionsApi.delete(deleteModal.transaction.id);
      await fetchData();
      closeDeleteModal();
    } catch (err) {
      setDeleteModal((prev) => ({ ...prev, error: err.message || 'Impossible de supprimer la transaction' }));
    } finally {
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const exportTotals = useMemo(() => aggregateTransactions(exportTransactions), [exportTransactions]);

  const categoryLabel = selectedCategory ? `Catégorie : ${selectedCategory.nom}` : 'Toutes les catégories';

  const confirmPath = async (defaultExtension) => {
    const { period, typeFilter, startDate, endDate, categoryId } = filters;
    // Convertit la clé de période en libellé FR pour le nom de fichier
    const periodKeyToFr = {
      day: 'jour',
      week: 'semaine',
      month: 'mois',
      quarter: 'trimestre',
      semester: 'semestre',
      year: 'annee',
      custom: 'personnalise'
    };
    const suffixPeriod = period === 'custom' && startDate && endDate
      ? `${startDate}_${endDate}`
      : (periodKeyToFr[period] || period);
    const suffixType = typeFilter && typeFilter !== 'all' ? `-${typeFilter.toLowerCase()}` : '';
    const suffixCategory = categoryId ? `-cat${categoryId}` : '';
    // Ajoute date et identifiant court aléatoire pour rendre le nom unique et explicite
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const nowStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    const randomId = Math.random().toString(36).slice(2, 6);
    const result = await fileApi.saveFile({
      title: 'Exporter les rapports',
      defaultPath: `${DEFAULT_FILENAME}-${suffixPeriod}${suffixType}${suffixCategory}-${nowStr}-${randomId}.${defaultExtension}`,
      filters: [
        {
          name: defaultExtension.toUpperCase(),
          extensions: [defaultExtension]
        }
      ]
    });
    if (!result || typeof result !== 'string') {
      return null;
    }
    return result;
  };

  const exportToPdf = async () => {
    if (!exportTransactions.length) {
      setError('Aucune transaction ne correspond à ces filtres.');
      return;
    }
    try {
      setExporting(true);
      const filePath = await confirmPath('pdf');
      if (!filePath) {
        return;
      }
      let orgName = 'Ecole Finances';
      try { const s = await appApi.getSettings(); if (s?.org_name) orgName = s.org_name; } catch {}
      const isEntryOnly = filters.typeFilter === 'ENTREE';
      const isExitOnly = filters.typeFilter === 'SORTIE';
      const includeEntries = !isExitOnly;
      const includeSorties = !isEntryOnly;
      const doc = new jsPDF({ orientation: 'landscape' });
      const formatCurrencyPdf = (value) =>
        formatCurrency(value).replace(/\u202f|\u00a0/g, ' ').replace(/\s{2,}/g, ' ').trim();
      // Titre plus visible en PDF
      doc.setFontSize(18);
      doc.text(`Rapport financier — ${orgName}`, 14, 18);
      doc.setFontSize(11);
      const periodLabelText = filters.period === 'custom'
        ? `Période personnalisée du ${filters.startDate || '—'} au ${filters.endDate || '—'}`
        : `Période: ${formatPeriodLabel(filters)}`;
      doc.text(periodLabelText, 14, 26);
      doc.text(`Filtre: ${typeLabel}`, 14, 32);
      doc.text(categoryLabel, 14, 38);
      autoTable(doc, {
        startY: 42,
        head: [['N°', 'Date', 'Heure', 'Catégorie', 'Libellé', 'Type', 'Montant']],
        body: exportTransactions.map((transaction, idx) => [
          String(idx + 1),
          formatDate(transaction.dateHeure),
          formatTime(transaction.dateHeure),
          transaction.categorie,
          transaction.libelle || '—',
          transaction.type === 'ENTREE' ? 'Entrée' : 'Sortie',
          formatCurrencyPdf(transaction.montant)
        ]),
        styles: {
          fontSize: 9,
          halign: 'left'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 20 },
          6: { halign: 'right' }
        },
        headStyles: {
          fillColor: [79, 70, 229],
          fontStyle: 'bold'
        }
      });

      const tableBottomY = doc.lastAutoTable?.finalY ?? 34;
      doc.setFontSize(12);
      const summaryLines = [];
      if (includeEntries) {
        summaryLines.push(`Total entrées : ${formatCurrencyPdf(exportTotals.global.entree)}`);
      }
      if (includeSorties) {
        summaryLines.push(`Total sorties : ${formatCurrencyPdf(exportTotals.global.sortie)}`);
      }
      if (includeEntries && includeSorties) {
        summaryLines.push(`Solde : ${formatCurrencyPdf(exportTotals.global.balance)}`);
      }

      const pageWidth = doc.internal.pageSize.getWidth();
      const left = 14;
      const right = pageWidth - 14;
      const gutter = 12;
      const colWidth = (right - left - gutter);
      const colHalf = colWidth / 2;
      const topY = (doc.lastAutoTable?.finalY ?? 34) + 12;

      // Prepare lines for both sections
      const summaryTitle = 'Résumé';
      const summaryLineHeight = 7;
      const summaryPadding = 6;
      const summaryHeight = summaryPadding * 2 + summaryLineHeight * (summaryLines.length + 1);

      const countLines = [`Nombre d’opérations : ${counts.totalCount}`];
      if (includeEntries) countLines.push(`Entrées : ${counts.entreeCount}`);
      if (includeSorties) countLines.push(`Sorties : ${counts.sortieCount}`);
      const countsTitle = 'Comptage';
      const countsLineHeight = 7;
      const countsPadding = 6;
      const countsHeight = countsPadding * 2 + countsLineHeight * (countLines.length + 1);

      // Draw side-by-side boxes
      doc.setDrawColor(226, 232, 240); // slate-200
      // Left column: Résumé
      doc.roundedRect(left - 2, topY - 8, colHalf + 4, summaryHeight + 12, 3, 3);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(summaryTitle, left, topY);
      doc.setFont(undefined, 'normal');
      summaryLines.forEach((line, index) => {
        doc.text(line, left, topY + summaryPadding + summaryLineHeight * (index + 1));
      });

      // Right column: Comptage
      const rightColLeft = left + colHalf + gutter;
      doc.roundedRect(rightColLeft - 2, topY - 8, colHalf + 4, countsHeight + 12, 3, 3);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(countsTitle, rightColLeft, topY);
      doc.setFont(undefined, 'normal');
      countLines.forEach((line, index) => {
        doc.text(line, rightColLeft, topY + countsPadding + countsLineHeight * (index + 1));
      });

      const pdfArrayBuffer = doc.output('arraybuffer');
      const base64 = arrayBufferToBase64(pdfArrayBuffer);
      await fileApi.write({ filePath, data: base64, encoding: 'base64' });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Impossible de générer le PDF');
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = async () => {
    if (!exportTransactions.length) {
      setError('Aucune transaction ne correspond à ces filtres.');
      return;
    }
    try {
      setExporting(true);
      const filePath = await confirmPath('xlsx');
      if (!filePath) {
        return;
      }
      let orgName = 'Ecole Finances';
      try { const s = await appApi.getSettings(); if (s?.org_name) orgName = s.org_name; } catch {}
      const isEntryOnly = filters.typeFilter === 'ENTREE';
      const isExitOnly = filters.typeFilter === 'SORTIE';
      const includeEntries = !isExitOnly;
      const includeSorties = !isEntryOnly;
      const workbook = XLSXUtils.book_new();
      // Ajoute un titre et des informations de contexte en tête de feuille
      const title = `Rapport financier — ${orgName}`;
      const infoPeriod = filters.period === 'custom'
        ? `Période personnalisée du ${filters.startDate || '—'} au ${filters.endDate || '—'}`
        : `Période : ${formatPeriodLabel(filters)}`;
      const infoFilter = `${typeLabel} • ${categoryLabel}`;
      const worksheetData = [
        [title],
        [infoPeriod],
        [infoFilter],
        [],
        ['N°', 'Date', 'Heure', 'Catégorie', 'Libellé', 'Type', 'Montant'],
        ...exportTransactions.map((t, idx) => [
          idx + 1,
          formatDate(t.dateHeure),
          formatTime(t.dateHeure),
          t.categorie,
          t.libelle || '—',
          t.type === 'ENTREE' ? 'ENTREE' : 'SORTIE',
          t.montant
        ])
      ];
      const worksheet = XLSXUtils.aoa_to_sheet(worksheetData);
      XLSXUtils.book_append_sheet(workbook, worksheet, 'Transactions');

      // Ajuste la zone de données en fonction des lignes d'en-tête ajoutées
      const headerRows = 4; // 3 lignes d'en-tête + 1 ligne vide
      const dataEndRow = exportTransactions.length + headerRows;
      let summaryRow = dataEndRow + 2;
      let entryTotalRow = null;
      let sortieTotalRow = null;

      if (includeEntries) {
        worksheet[`F${summaryRow}`] = { t: 's', v: 'Total entrées' };
        worksheet[`G${summaryRow}`] = {
          t: 'n',
          f: 'SUMIFS($G:$G,$F:$F,"ENTREE")'
        };
        entryTotalRow = summaryRow;
        summaryRow += 1;
      }

      if (includeSorties) {
        worksheet[`F${summaryRow}`] = { t: 's', v: 'Total sorties' };
        worksheet[`G${summaryRow}`] = {
          t: 'n',
          f: 'SUMIFS($G:$G,$F:$F,"SORTIE")'
        };
        sortieTotalRow = summaryRow;
        summaryRow += 1;
      }

      if (includeEntries && includeSorties) {
        worksheet[`F${summaryRow}`] = { t: 's', v: 'Solde net' };
        worksheet[`G${summaryRow}`] = {
          t: 'n',
          f: `G${entryTotalRow}-G${sortieTotalRow}`
        };
        summaryRow += 1;
      }

      // Counts rows
      worksheet[`F${summaryRow}`] = { t: 's', v: 'Nombre opérations' };
      worksheet[`G${summaryRow}`] = { t: 'n', v: counts.totalCount };
      summaryRow += 1;
      if (includeEntries) {
        worksheet[`F${summaryRow}`] = { t: 's', v: 'Nombre entrées' };
        worksheet[`G${summaryRow}`] = { t: 'n', v: counts.entreeCount };
        summaryRow += 1;
      }
      if (includeSorties) {
        worksheet[`F${summaryRow}`] = { t: 's', v: 'Nombre sorties' };
        worksheet[`G${summaryRow}`] = { t: 'n', v: counts.sortieCount };
        summaryRow += 1;
      }

      worksheet['!ref'] = `A1:G${Math.max(summaryRow - 1, dataEndRow)}`;

      const arrayBuffer = writeWorkbook(workbook, { bookType: 'xlsx', type: 'array' });
      const base64 = arrayBufferToBase64(arrayBuffer);
      await fileApi.write({ filePath, data: base64, encoding: 'base64' });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Impossible de générer le fichier Excel');
    } finally {
      setExporting(false);
    }
  };

  const exportDisabled =
    exporting ||
    loading ||
    !data?.transactions?.length ||
    (filters.period === 'custom' && (!filters.startDate || !filters.endDate));

  return (
    <div className="space-y-8">
      <FiltersPanel
        filters={filters}
        onPeriodChange={handlePeriodChange}
        onTypeChange={handleTypeChange}
        onCategoryChange={handleCategoryChange}
        categories={categories}
        categoriesError={categoriesError}
        typeLabel={typeLabel}
        periodLabel={periodLabel}
        categoryLabel={categoryLabel}
        onExportPdf={exportToPdf}
        onExportExcel={exportToExcel}
        exportDisabled={exportDisabled}
        exporting={exporting}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />
      <TotalsSection totals={totals} typeLabel={typeLabel} categoryLabel={categoryLabel} counts={counts} />
      <TransactionsSection
        transactions={sortedTransactions}
        loading={loading}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        emptyMessage={
          totalTransactions === 0
            ? 'Aucune opération enregistrée pour cette période.'
            : 'Aucune opération pour cette page.'
        }
        order={order}
        onOrderChange={handleOrderChange}
        page={page}
        totalPages={totalPages}
        total={totalTransactions}
        onPageChange={handlePageChange}
        filters={filters}
        onPeriodChange={handlePeriodChange}
        categories={categories}
        onCategoryChange={handleCategoryChange}
        onTypeChange={handleTypeChange}
        baseIndex={page * pageSize}
      />
      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Modifier l’opération</h3>
            <form onSubmit={submitEditModal} className="mt-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col text-sm font-medium text-slate-600 dark:text-slate-300">
                  Catégorie
                  <select
                    value={editForm.categorieId}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, categorieId: event.target.value }))}
                    className="mt-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    required
                  >
                    <option value="">Sélectionner…</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.nom}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-600 dark:text-slate-300">
                  Montant (XAF)
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editForm.montant}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, montant: event.target.value }))}
                    className="mt-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    required
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col text-sm font-medium text-slate-600 dark:text-slate-300">
                  Type
                  <select
                    value={editForm.type}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, type: event.target.value }))}
                    className="mt-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    required
                  >
                    <option value="ENTREE">Entrée</option>
                    <option value="SORTIE">Sortie</option>
                  </select>
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-600 dark:text-slate-300">
                  Date &amp; heure
                  <input
                    type="datetime-local"
                    value={editForm.dateHeure}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, dateHeure: event.target.value }))}
                    className="mt-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col text-sm font-medium text-slate-600 dark:text-slate-300">
                  Libellé
                  <input
                    type="text"
                    value={editForm.libelle}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, libelle: event.target.value }))}
                    className="mt-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    placeholder="Ex. Fournisseur"
                  />
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-600 dark:text-slate-300">
                  Lieu / Description
                  <input
                    type="text"
                    value={editForm.lieu}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, lieu: event.target.value }))}
                    className="mt-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    placeholder="Ex. Caisse centrale"
                  />
                </label>
              </div>
              {editModal.error ? (
                <p className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200">
                  {editModal.error}
                </p>
              ) : null}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-2xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editModal.loading}
                  className="rounded-2xl bg-primary-500 px-5 py-2 text-sm font-semibold text-white shadow shadow-primary-500/40 transition hover:bg-primary-400 disabled:cursor-not-allowed disabled:bg-primary-500/60"
                >
                  {editModal.loading ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Supprimer l’opération</h3>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              Confirmez-vous la suppression de cette opération ? Cette action est irréversible.
            </p>
            {deleteModal.error ? (
              <p className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200">
                {deleteModal.error}
              </p>
            ) : null}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-2xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteModal.loading}
                className="rounded-2xl bg-rose-500 px-5 py-2 text-sm font-semibold text-white shadow shadow-rose-500/40 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:bg-rose-500/60"
              >
                {deleteModal.loading ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
      {error && (
        <p className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      )}  
    </div>
  );
}


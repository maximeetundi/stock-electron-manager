import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FiltersPanel from './components/FiltersPanel.jsx';
import TotalsSection from './components/TotalsSection.jsx';
import TransactionsSection from './components/TransactionsSection.jsx';
import { categoriesApi, fileApi, transactionsApi } from '@/utils/apiClient';
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

  const exportTotals = useMemo(() => aggregateTransactions(exportTransactions), [exportTransactions]);

  const categoryLabel = selectedCategory ? `Catégorie : ${selectedCategory.nom}` : 'Toutes les catégories';

  const confirmPath = async (defaultExtension) => {
    const { period, typeFilter, startDate, endDate, categoryId } = filters;
    const suffixPeriod = period === 'custom' && startDate && endDate
      ? `${startDate}_${endDate}`
      : period === 'custom'
        ? 'personnalise'
        : period;
    const suffixType = typeFilter && typeFilter !== 'all' ? `-${typeFilter.toLowerCase()}` : '';
    const suffixCategory = categoryId ? `-cat${categoryId}` : '';
    const result = await fileApi.saveFile({
      title: 'Exporter les rapports',
      defaultPath: `${DEFAULT_FILENAME}-${suffixPeriod}${suffixType}${suffixCategory}.${defaultExtension}`,
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
      const isEntryOnly = filters.typeFilter === 'ENTREE';
      const isExitOnly = filters.typeFilter === 'SORTIE';
      const includeEntries = !isExitOnly;
      const includeSorties = !isEntryOnly;
      const doc = new jsPDF({ orientation: 'landscape' });
      const formatCurrencyPdf = (value) =>
        formatCurrency(value).replace(/\u202f|\u00a0/g, ' ').replace(/\s{2,}/g, ' ').trim();
      doc.setFontSize(16);
      doc.text('Rapport financier - Complexe scolaire', 14, 18);
      doc.setFontSize(11);
      const periodLabelText = filters.period === 'custom'
        ? `Période personnalisée du ${filters.startDate || '—'} au ${filters.endDate || '—'}`
        : `Période: ${formatPeriodLabel(filters)}`;
      doc.text(periodLabelText, 14, 26);
      doc.text(`Filtre: ${typeLabel}`, 14, 32);
      doc.text(categoryLabel, 14, 38);
      autoTable(doc, {
        startY: 42,
        head: [['Date', 'Heure', 'Catégorie', 'Libellé', 'Type', 'Montant']],
        body: exportTransactions.map((transaction) => [
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
          5: { halign: 'right' }
        },
        headStyles: {
          fillColor: [79, 70, 229]
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

      const summaryStartY = tableBottomY + 12;
      doc.text('Résumé', 14, summaryStartY);
      summaryLines.forEach((line, index) => {
        doc.text(line, 14, summaryStartY + 6 * (index + 1));
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
      const isEntryOnly = filters.typeFilter === 'ENTREE';
      const isExitOnly = filters.typeFilter === 'SORTIE';
      const includeEntries = !isExitOnly;
      const includeSorties = !isEntryOnly;
      const workbook = XLSXUtils.book_new();
      const worksheetData = [
        ['Date', 'Heure', 'Catégorie', 'Libellé', 'Type', 'Montant'],
        ...mapTransactionsForExport(exportTransactions)
      ];
      const worksheet = XLSXUtils.aoa_to_sheet(worksheetData);
      XLSXUtils.book_append_sheet(workbook, worksheet, 'Transactions');

      const dataEndRow = exportTransactions.length + 1;
      let summaryRow = dataEndRow + 2;
      let entryTotalRow = null;
      let sortieTotalRow = null;

      if (includeEntries) {
        worksheet[`E${summaryRow}`] = { t: 's', v: 'Total entrées' };
        worksheet[`F${summaryRow}`] = {
          t: 'n',
          f: 'SUMIFS($F:$F,$E:$E,"ENTREE")'
        };
        entryTotalRow = summaryRow;
        summaryRow += 1;
      }

      if (includeSorties) {
        worksheet[`E${summaryRow}`] = { t: 's', v: 'Total sorties' };
        worksheet[`F${summaryRow}`] = {
          t: 'n',
          f: 'SUMIFS($F:$F,$E:$E,"SORTIE")'
        };
        sortieTotalRow = summaryRow;
        summaryRow += 1;
      }

      if (includeEntries && includeSorties) {
        worksheet[`E${summaryRow}`] = { t: 's', v: 'Solde net' };
        worksheet[`F${summaryRow}`] = {
          t: 'n',
          f: `F${entryTotalRow}-F${sortieTotalRow}`
        };
        summaryRow += 1;
      }

      worksheet['!ref'] = `A1:F${Math.max(summaryRow - 1, dataEndRow)}`;

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
      />
      <TotalsSection totals={totals} typeLabel={typeLabel} categoryLabel={categoryLabel} />
      <TransactionsSection transactions={data?.transactions ?? []} loading={loading} />
      {error && (
        <p className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      )}
    </div>
  );
}

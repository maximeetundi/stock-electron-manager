import { formatCurrency, formatDate, formatTime } from '@/utils/format';

const parseDate = (value) => {
  if (!value) {
    return null;
  }
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatPeriodLabel = ({ period, referenceDate, startDate, endDate }) => {
  const intlDay = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const intlMonth = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric'
  });
  const fallbackReference = parseDate(referenceDate) ?? new Date();
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  switch (period) {
    case 'day':
      return `Journée du ${intlDay.format(fallbackReference)}`;
    case 'week': {
      const base = new Date(fallbackReference);
      const monday = new Date(base);
      const sunday = new Date(base);
      const currentDay = base.getDay() || 7;
      monday.setDate(base.getDate() - (currentDay - 1));
      sunday.setDate(monday.getDate() + 6);
      return `Semaine du ${intlDay.format(monday)} au ${intlDay.format(sunday)}`;
    }
    case 'month':
      return `Mois de ${intlMonth.format(fallbackReference)}`;
    case 'quarter': {
      const date = new Date(fallbackReference);
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Trimestre ${quarter} ${date.getFullYear()}`;
    }
    case 'semester': {
      const date = new Date(fallbackReference);
      const semester = date.getMonth() < 6 ? 'Premier' : 'Second';
      return `${semester} semestre ${date.getFullYear()}`;
    }
    case 'year':
      return `Année ${fallbackReference.getFullYear()}`;
    case 'custom':
      if (start && end) {
        return `Du ${intlDay.format(start)} au ${intlDay.format(end)}`;
      }
      return 'Sélectionnez une plage de dates';
    default:
      return '';
  }
};

export const aggregateTransactions = (transactions = []) => {
  if (!transactions.length) {
    return {
      global: { entree: 0, sortie: 0, balance: 0 },
      categories: []
    };
  }

  let totalEntree = 0;
  let totalSortie = 0;
  const categoryMap = new Map();

  transactions.forEach((transaction) => {
    const rawLabel = transaction.libelle || transaction.categorie || 'Sans libellé';
    const label = rawLabel.trim();
    const rawCategory = transaction.categorie || label;
    if (!categoryMap.has(label)) {
      categoryMap.set(label, {
        libelle: label,
        categorie: rawCategory,
        entree: 0,
        sortie: 0,
        balance: 0
      });
    }
    const categoryTotals = categoryMap.get(label);

    if (transaction.type === 'ENTREE') {
      totalEntree += transaction.montant;
      categoryTotals.entree += transaction.montant;
    } else if (transaction.type === 'SORTIE') {
      totalSortie += transaction.montant;
      categoryTotals.sortie += transaction.montant;
    }

    categoryTotals.balance = categoryTotals.entree - categoryTotals.sortie;
  });

  return {
    global: {
      entree: totalEntree,
      sortie: totalSortie,
      balance: totalEntree - totalSortie
    },
    categories: Array.from(categoryMap.values())
  };
};

export const mapTransactionsForExport = (transactions) =>
  transactions.map((transaction) => [
    formatDate(transaction.dateHeure),
    formatTime(transaction.dateHeure),
    transaction.categorie,
    (transaction.libelle || transaction.categorie || '').trim(),
    transaction.type,
    transaction.montant
  ]);

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XAF',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

export function formatCurrency(value) {
  if (value === null || value === undefined) {
    return '—';
  }
  return currencyFormatter.format(Number(value) || 0);
}

export function formatNumber(value) {
  if (value === null || value === undefined) {
    return '—';
  }
  return numberFormatter.format(Number(value) || 0);
}

export function formatDateTime(isoString) {
  if (!isoString) {
    return '—';
  }
  const date = new Date(isoString);
  return date.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDate(isoString) {
  if (!isoString) {
    return '—';
  }
  return new Date(isoString).toLocaleDateString('fr-FR');
}

export function formatTime(isoString) {
  if (!isoString) {
    return '—';
  }
  return new Date(isoString).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

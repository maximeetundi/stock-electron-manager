import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import TransactionsTable from '@/components/tables/TransactionsTable.jsx';
import PeriodSelector from '@/components/common/PeriodSelector.jsx';
import { ClipboardDocumentListIcon, TagIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
import jsPDF from 'jspdf';
import { appApi, fileApi } from '@/utils/apiClient';
import { formatCurrency, formatDate, formatTime } from '@/utils/format';

export default function TransactionsSection({
  transactions,
  loading = false,
  onEdit = undefined,
  onDelete = undefined,
  emptyMessage = 'Aucune opération enregistrée pour cette période.',
  order,
  onOrderChange,
  page,
  totalPages,
  total,
  onPageChange,
  filters,
  onPeriodChange,
  categories,
  onCategoryChange,
  onTypeChange,
  baseIndex = 0
}) {
  const [preview, setPreview] = useState(null);

  const titleForPreview = useMemo(() => {
    if (!preview) return '';
    return preview.type === 'ENTREE' ? 'Reçu de paiement' : 'Note de dépense';
  }, [preview]);

  const openPreview = (transaction) => setPreview(transaction);
  const closePreview = () => setPreview(null);

  const exportOneToPdf = async () => {
    if (!preview) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    // Use a robust built-in font and normalize currency spacing to avoid slashes rendering
    doc.setFont('helvetica', 'normal');

    // Helpers
    const pad = (n) => String(n).padStart(2, '0');
    const d = new Date(preview.dateHeure);
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
    const rand = Math.random().toString(36).slice(2, 6);
    const receiptNo = `REC-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${preview.id}`;

    // Load organization settings
    let orgName = 'Ecole Finances';
    let logoDataUrl = null;
    try {
      const s = await appApi.getSettings();
      if (s?.org_name) orgName = s.org_name;
      if (s?.org_logo_path) {
        try { logoDataUrl = await fileApi.readAsDataUrl(s.org_logo_path); } catch {}
      }
    } catch {}

    // Header with optional logo
    doc.setFillColor(79, 70, 229); // primary
    doc.rect(0, 0, 595, 90, 'F');
    doc.setTextColor(255, 255, 255);
    let titleLeft = 40;
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', 40, 26, 40, 40);
        titleLeft = 90;
      } catch {}
    }
    doc.setFontSize(20);
    doc.text(orgName, titleLeft, 40);
    doc.setFontSize(12);
    doc.text(titleForPreview, titleLeft, 60);
    doc.text(`Reçu N° ${receiptNo}`, 560, 40, { align: 'right' });
    doc.text(`Date: ${formatDate(preview.dateHeure)} ${formatTime(preview.dateHeure)}`, 560, 60, { align: 'right' });

    // Body card
    doc.setTextColor(31, 41, 55); // slate-800
    const left = 40;
    let y = 130;
    const lineGap = 26;

    doc.setFontSize(16);
    doc.text(titleForPreview, left, y); y += 18;
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(left, y, 555, y); y += 20;

    doc.setFontSize(12);
    doc.text('Catégorie', left, y);
    doc.setFont(undefined, 'bold'); doc.text(String(preview.categorie), left + 120, y); doc.setFont(undefined, 'normal');
    y += lineGap;

    doc.text('Libellé', left, y);
    doc.setFont(undefined, 'bold'); doc.text(String(preview.libelle || '—'), left + 120, y); doc.setFont(undefined, 'normal');
    y += lineGap;

    const normalizeSpaces = (s) => String(s).replace(/[\u202F\u00A0]/g, ' ');
    const amount = normalizeSpaces(formatCurrency(preview.montant));
    doc.text('Montant', left, y);
    doc.setFont(undefined, 'bold'); doc.text(amount, left + 120, y, { maxWidth: 360 }); doc.setFont(undefined, 'normal');
    y += 40;

    // Total box
    doc.setDrawColor(79, 70, 229);
    doc.setFillColor(243, 244, 255);
    doc.roundedRect(left, y, 515, 60, 6, 6, 'S');
    doc.setFontSize(14);
    doc.text('TOTAL À PAYER', left + 14, y + 36);
    doc.setFont(undefined, 'bold');
    // Right align amount within the total box to prevent overflow
    const boxRight = left + 515 - 14;
    doc.text(amount, boxRight, y + 36, { align: 'right', maxWidth: 300 });
    doc.setFont(undefined, 'normal');
    y += 100;

    // Footer
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('Merci de votre confiance.', left, y);
    doc.text('Signature et cachet', 430, y);
    doc.line(430, y + 6, 555, y + 6);

    doc.save(`recu-${stamp}-${rand}.pdf`);
  };

  const printOne = async () => {
    if (!preview) return;
    // Local helpers (were only in exportOneToPdf before)
    const pad = (n) => String(n).padStart(2, '0');
    const d = new Date(preview.dateHeure);
    const receiptNo = `REC-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${preview.id}`;
    let orgName = 'Ecole Finances';
    let logoDataUrl = '/logo.png';
    try {
      const s = await appApi.getSettings();
      if (s?.org_name) orgName = s.org_name;
      if (s?.org_logo_path) {
        try { logoDataUrl = await fileApi.readAsDataUrl(s.org_logo_path); } catch {}
      }
    } catch {}
    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${titleForPreview}</title>
          <style>
            :root{--primary:#4f46e5;--slate-50:#f8fafc;--slate-200:#e2e8f0;--slate-500:#64748b;--slate-800:#1f2937}
            body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding:28px; color:var(--slate-800)}
            .header{background:var(--primary); color:white; padding:18px 22px; border-radius:14px; display:flex; align-items:center; justify-content:space-between}
            .left{display:flex; align-items:center; gap:12px}
            .logo{width:40px; height:40px; object-fit:contain; background:white; border-radius:8px; padding:4px}
            .title{margin:0; font-size:20px}
            .sub{margin:2px 0 0; font-size:12px}
            .row{margin:8px 0; display:flex}
            .label{width:140px; color:var(--slate-500)}
            .value{font-weight:600}
            .card{margin-top:18px; background:var(--slate-50); border:1px solid var(--slate-200); border-radius:14px; padding:18px}
            .total{margin-top:14px; display:flex; justify-content:space-between; align-items:center; border:1px solid var(--primary); border-radius:12px; padding:14px 18px}
            .muted{color:var(--slate-500); font-size:12px; margin-top:36px; display:flex; justify-content:space-between;}
            .sig{width:160px; border-top:1px solid var(--slate-200); text-align:center; padding-top:6px}
            .right{float:right; text-align:right}
          </style>
        </head>
        <body>
          <div class="header">
            <div class="left">
              <img src="${logoDataUrl}" class="logo" onerror="this.style.display='none'" alt="logo" />
              <div>
                <div class="title">${orgName}</div>
                <div class="sub">${titleForPreview}</div>
              </div>
            </div>
            <div style="text-align:right; font-size:12px">
              <div>Reçu N° ${receiptNo}</div>
              <div>Date: ${formatDate(preview.dateHeure)} ${formatTime(preview.dateHeure)}</div>
            </div>
          </div>
          <div class="card">
            <div class="row"><div class="label">Reçu N°</div><div class="value">${receiptNo}</div></div>
            <div class="row"><div class="label">Date</div><div class="value">${formatDate(preview.dateHeure)} ${formatTime(preview.dateHeure)}</div></div>
            <div class="row"><div class="label">Catégorie</div><div class="value">${preview.categorie}</div></div>
            <div class="row"><div class="label">Libellé</div><div class="value">${(preview.libelle || '—').toString()}</div></div>
            <div class="total"><div>TOTAL À PAYER</div><div class="value">${formatCurrency(preview.montant)}</div></div>
            <div class="muted"><div>Merci de votre confiance.</div><div class="sig">Signature</div></div>
          </div>
          <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };</script>
        </body>
      </html>`;
    const w = window.open('', '_blank', 'width=800,height=900');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    }
  };
  const typeOptions = [
    { value: 'all', label: 'Toutes' },
    { value: 'ENTREE', label: 'Entrées' },
    { value: 'SORTIE', label: 'Sorties' }
  ];

  return (
    <>
    <section className="rounded-3xl bg-white/80 p-8 shadow-xl dark:bg-slate-900/80">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
        <ClipboardDocumentListIcon className="h-5 w-5 text-primary-500" />
        Opérations détaillées
      </h2>
      <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-5 shadow dark:border-slate-800 dark:bg-slate-900/70">
        <PeriodSelector value={filters} onChange={onPeriodChange} allowCustom />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onTypeChange(option.value)}
                className={classNames(
                  'rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition',
                  filters.typeFilter === option.value
                    ? 'border-primary-500 bg-primary-500 text-white shadow shadow-primary-500/30'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-primary-500 hover:text-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
            <TagIcon className="h-4 w-4 text-primary-500" />
            <span>Catégorie</span>
            <select
              value={filters.categoryId}
              onChange={onCategoryChange}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">Toutes</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nom}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <TransactionsTable
        transactions={transactions}
        loading={loading}
        onEdit={onEdit}
        onDelete={onDelete}
        onPreview={openPreview}
        emptyMessage={emptyMessage}
        baseIndex={baseIndex}
      />
      <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-white/60 p-4 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm dark:bg-slate-900/60 dark:text-slate-300 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={() => onOrderChange(order === 'DESC' ? 'ASC' : 'DESC')}
          className="w-full rounded-full border border-slate-200 px-4 py-2 transition hover:border-primary-500 hover:text-primary-500 dark:border-slate-700 md:w-auto"
        >
          {order === 'DESC' ? 'Plus récentes' : 'Plus anciennes'}
        </button>
        <div className="flex w-full items-center justify-between gap-2 rounded-full border border-slate-200 px-4 py-2 dark:border-slate-700 md:w-auto">
          <span>
            Page {total === 0 ? 0 : Math.min(page + 1, totalPages)} / {total === 0 ? 0 : totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="rounded-full border border-transparent px-3 py-1 transition hover:border-primary-500 hover:text-primary-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1 || total === 0}
              className="rounded-full border border-transparent px-3 py-1 transition hover;border-primary-500 hover:text-primary-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
    </section>
    {preview && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
        <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{titleForPreview}</h3>
          <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p><span className="text-slate-500">Date:</span> {formatDate(preview.dateHeure)} {formatTime(preview.dateHeure)}</p>
            <p><span className="text-slate-500">Type:</span> {preview.type === 'ENTREE' ? 'Entrée' : 'Sortie'}</p>
            <p><span className="text-slate-500">Catégorie:</span> {preview.categorie}</p>
            <p><span className="text-slate-500">Libellé:</span> {preview.libelle || '—'}</p>
            <p><span className="text-slate-500">Montant:</span> <span className={classNames(
              'rounded-full px-2 py-0.5',
              preview.type === 'ENTREE' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
            )}>{formatCurrency(preview.montant)}</span></p>
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={printOne}
              className="rounded-2xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-300"
            >
              Imprimer
            </button>
            <button
              type="button"
              onClick={exportOneToPdf}
              className="rounded-2xl bg-primary-500 px-5 py-2 text-sm font-semibold text-white shadow shadow-primary-500/40 transition hover:bg-primary-400"
            >
              Exporter en PDF
            </button>
            <button
              type="button"
              onClick={closePreview}
              className="rounded-2xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-300"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

TransactionsSection.propTypes = {
  transactions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      categorie: PropTypes.string.isRequired,
      montant: PropTypes.number.isRequired,
      dateHeure: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      libelle: PropTypes.string
    })
  ).isRequired,
  loading: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  emptyMessage: PropTypes.string,
  order: PropTypes.oneOf(['ASC', 'DESC']).isRequired,
  onOrderChange: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  filters: PropTypes.shape({
    period: PropTypes.string,
    typeFilter: PropTypes.string,
    categoryId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    referenceDate: PropTypes.string,
    startDate: PropTypes.string,
    endDate: PropTypes.string
  }).isRequired,
  onPeriodChange: PropTypes.func.isRequired,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      nom: PropTypes.string.isRequired
    })
  ).isRequired,
  onCategoryChange: PropTypes.func.isRequired,
  onTypeChange: PropTypes.func.isRequired,
  baseIndex: PropTypes.number
};

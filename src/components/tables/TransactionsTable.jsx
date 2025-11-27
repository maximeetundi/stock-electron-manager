import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { formatCurrency, formatDate } from '@/utils/format';
import { PencilSquareIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';

export default function TransactionsTable({
  transactions,
  loading = false,
  emptyMessage = 'Aucune opération.',
  onEdit,
  onDelete,
  onPreview,
  selectedIds,
  onToggleSelection,
  onToggleAll,
  baseIndex = 0
}) {
  const hasSelection = Array.isArray(selectedIds) && selectedIds.length >= 0 && onToggleSelection;
  const selectAllRef = useRef(null);
  const allIds = transactions.map((transaction) => transaction.id);
  const allSelected = hasSelection && allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
  const isIndeterminate = hasSelection && selectedIds.length > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  if (loading) {
    return (
      <div className="mt-6 space-y-2 rounded-3xl bg-white/80 p-6 shadow dark:bg-slate-900/80">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
        ))}
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <p className="mt-6 rounded-3xl bg-white/60 p-6 text-sm text-slate-500 shadow dark:bg-slate-900/60 dark:text-slate-300">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/90 shadow-xl backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/80">
      <div className={classNames(
        'hidden bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400 md:grid md:gap-6 md:px-8 md:py-4',
        hasSelection ? 'md:grid-cols-[0.5fr,0.4fr,1.5fr,1fr,1fr,1fr,1fr,0.8fr]' : 'md:grid-cols-[0.4fr,1.5fr,1fr,1fr,1fr,1fr,0.8fr]'
      )}>
        {hasSelection ? (
          <div className="flex items-center">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected && !isIndeterminate}
              onChange={(event) => onToggleAll(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
            />
          </div>
        ) : null}
        <div>N°</div>
        <div>Catégorie</div>
        <div>Libellé</div>
        <div>Date</div>
        <div>Montant</div>
        <div className="text-right">Actions</div>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {transactions.map((transaction, idx) => (
          <li
            key={transaction.id}
            className={classNames(
              'grid grid-cols-1 gap-3 px-5 py-4 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50 md:items-center md:gap-6 md:px-8',
              hasSelection
                ? 'md:grid-cols-[0.5fr,0.4fr,1.5fr,1fr,1fr,1fr,1fr,0.8fr]'
                : 'md:grid-cols-[0.4fr,1.5fr,1fr,1fr,1fr,1fr,0.8fr]'
            )}
          >
            {hasSelection ? (
              <div className="flex items-start pt-1 md:items-center">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(transaction.id)}
                  onChange={(event) => onToggleSelection(transaction, event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                />
              </div>
            ) : null}
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 md:text-center">{baseIndex + idx + 1}</div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {transaction.categorie}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {transaction.type === 'ENTREE' ? 'Entrée' : 'Sortie'}
              </p>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">{transaction.libelle || '—'}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">{formatDate(transaction.dateHeure)}</div>
            <div className="text-right text-sm font-semibold">
              <span
                className={classNames(
                  'rounded-full px-3 py-1',
                  transaction.type === 'ENTREE'
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
                )}
              >
                {transaction.type === 'ENTREE' ? '+' : '-'} {formatCurrency(transaction.montant)}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2 text-slate-500 dark:text-slate-400">
              {onPreview ? (
                <button
                  type="button"
                  onClick={() => onPreview(transaction)}
                  className="rounded-full border border-transparent p-2 transition hover:border-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  title="Aperçu"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
              ) : null}
              {onEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit(transaction)}
                  className="rounded-full border border-transparent p-2 transition hover:border-primary-500 hover:text-primary-500"
                  title="Modifier"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(transaction)}
                  className="rounded-full border border-transparent p-2 transition hover:border-rose-500 hover:text-rose-500"
                  title="Supprimer"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

TransactionsTable.propTypes = {
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
  emptyMessage: PropTypes.string,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onPreview: PropTypes.func,
  selectedIds: PropTypes.arrayOf(PropTypes.number),
  onToggleSelection: PropTypes.func,
  onToggleAll: PropTypes.func
};

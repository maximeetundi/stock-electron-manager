import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { formatCurrency, formatDate, formatTime } from '@/utils/format';

export default function TransactionsTable({ transactions, loading = false, emptyMessage = 'Aucune opération.' }) {
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
      <div className="hidden bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400 md:grid md:grid-cols-[1.5fr,1fr,1fr,1fr,1fr] md:gap-6 md:px-8 md:py-4">
        <div>Catégorie</div>
        <div>Libellé</div>
        <div>Date</div>
        <div>Heure</div>
        <div>Montant</div>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {transactions.map((transaction) => (
          <li
            key={transaction.id}
            className="grid grid-cols-1 gap-3 px-5 py-4 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50 md:grid-cols-[1.5fr,1fr,1fr,1fr,1fr] md:items-center md:gap-6 md:px-8"
          >
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
            <div className="text-sm text-slate-600 dark:text-slate-300">{formatTime(transaction.dateHeure)}</div>
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
  emptyMessage: PropTypes.string
};

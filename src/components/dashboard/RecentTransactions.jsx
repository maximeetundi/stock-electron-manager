import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { formatCurrency, formatDateTime } from '@/utils/format';

export default function RecentTransactions({ transactions, loading = false }) {
  if (loading) {
    return (
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-4 shadow dark:bg-slate-900/80"
          >
            <div className="h-5 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="h-5 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <p className="mt-6 rounded-2xl bg-white/60 p-6 text-sm text-slate-500 shadow dark:bg-slate-900/60 dark:text-slate-300">
        Aucune opération récente.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {transaction.categorie}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatDateTime(transaction.dateHeure)}
            </p>
          </div>
          <span
            className={classNames(
              'rounded-full px-3 py-1 text-sm font-semibold',
              transaction.type === 'ENTREE'
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
            )}
          >
            {transaction.type === 'ENTREE' ? '+' : '-'} {formatCurrency(transaction.montant)}
          </span>
        </div>
      ))}
    </div>
  );
}

RecentTransactions.propTypes = {
  transactions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      categorie: PropTypes.string.isRequired,
      montant: PropTypes.number.isRequired,
      dateHeure: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired
    })
  ).isRequired,
  loading: PropTypes.bool
};

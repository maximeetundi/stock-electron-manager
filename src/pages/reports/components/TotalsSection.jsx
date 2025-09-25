import React from 'react';
import PropTypes from 'prop-types';
import { formatCurrency } from '@/utils/format';
import {
  FolderIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ScaleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

export default function TotalsSection({ totals, typeLabel, categoryLabel }) {
  return (
    <section className="rounded-3xl bg-white/80 p-8 shadow-xl dark:bg-slate-900/80">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
            <FolderIcon className="h-5 w-5 text-primary-500" />
            Totaux par catégorie
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <InformationCircleIcon className="h-4 w-4 text-primary-400" />
            Vue d’ensemble détaillée des entrées et sorties.
          </p>
          <p className="mt-2 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
            <ArrowTrendingUpIcon className="h-3 w-3" />
            {typeLabel}
          </p>
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
            <FolderIcon className="h-3 w-3" />
            {categoryLabel}
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white dark:bg-primary-500">
          <p className="flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-4 w-4" />
            Total entrées : {formatCurrency(totals.global.entree)}
          </p>
          <p className="flex items-center gap-2">
            <ArrowTrendingDownIcon className="h-4 w-4" />
            Total sorties : {formatCurrency(totals.global.sortie)}
          </p>
          <p className="flex items-center gap-2">
            <ScaleIcon className="h-4 w-4" />
            Solde : {formatCurrency(totals.global.balance)}
          </p>
        </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/90 shadow-lg backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/80">
        <div className="hidden bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400 md:grid md:grid-cols-[1.5fr,1fr,1fr,1fr] md:gap-6 md:px-8 md:py-4">
          <div>Catégorie</div>
          <div>Entrées</div>
          <div>Sorties</div>
          <div>Solde</div>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {(totals.categories || []).map((item) => (
            <li
              key={item.categorie}
              className="grid grid-cols-1 gap-3 px-5 py-4 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50 md:grid-cols-[1.5fr,1fr,1fr,1fr] md:items-center md:gap-6 md:px-8"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.categorie}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{formatCurrency(item.entree)}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{formatCurrency(item.sortie)}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(item.balance)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

TotalsSection.propTypes = {
  totals: PropTypes.shape({
    global: PropTypes.shape({
      entree: PropTypes.number,
      sortie: PropTypes.number,
      balance: PropTypes.number
    }).isRequired,
    categories: PropTypes.arrayOf(
      PropTypes.shape({
        categorie: PropTypes.string,
        entree: PropTypes.number,
        sortie: PropTypes.number,
        balance: PropTypes.number
      })
    )
  }).isRequired,
  typeLabel: PropTypes.string.isRequired,
  categoryLabel: PropTypes.string.isRequired
};

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { formatCurrency } from '@/utils/format';

const labelMap = {
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois',
  quarter: 'Trimestre',
  semester: 'Semestre',
  year: 'Année'
};

export default function MetricCard({ period, totals }) {
  const label = labelMap[period] || period;
  const balancePositive = (totals?.balance ?? 0) >= 0;

  return (
    <div className="group rounded-3xl border border-white/10 bg-gradient-to-br from-white/70 via-white/90 to-white p-6 shadow-xl shadow-primary-500/10 transition hover:-translate-y-1 hover:shadow-2xl dark:border-slate-800/60 dark:from-slate-900/60 dark:via-slate-900/70 dark:to-slate-900">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary-500 dark:text-primary-300">
        {label}
      </p>
      <div className="mt-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Entrées</p>
          <p className="text-xl font-semibold text-emerald-500">
            {formatCurrency(totals?.entree)}
          </p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-300">{(totals?.entreeCount ?? 0)} opérations</p>
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sorties</p>
          <p className="text-xl font-semibold text-rose-500">
            {formatCurrency(totals?.sortie)}
          </p>
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{(totals?.sortieCount ?? 0)} opérations</p>
        </div>
      </div>
      <div className="mt-6 rounded-2xl bg-slate-900/90 p-4 text-white dark:bg-slate-800">
        <p className="text-xs uppercase tracking-wide text-white/60">Solde</p>
        <p
          className={classNames(
            'mt-2 text-2xl font-bold',
            balancePositive ? 'text-emerald-400' : 'text-rose-400'
          )}
        >
          {formatCurrency(totals?.balance)}
        </p>
        <p className="mt-2 text-[11px] text-white/70">Total opérations: {(totals?.totalCount ?? 0)}</p>
      </div>
    </div>
  );
}

MetricCard.propTypes = {
  period: PropTypes.string.isRequired,
  totals: PropTypes.shape({
    entree: PropTypes.number,
    sortie: PropTypes.number,
    balance: PropTypes.number
  })
};

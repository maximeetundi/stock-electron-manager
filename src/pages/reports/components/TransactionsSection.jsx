import React from 'react';
import PropTypes from 'prop-types';
import TransactionsTable from '@/components/tables/TransactionsTable.jsx';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

export default function TransactionsSection({ transactions, loading }) {
  return (
    <section className="rounded-3xl bg-white/80 p-8 shadow-xl dark:bg-slate-900/80">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
        <ClipboardDocumentListIcon className="h-5 w-5 text-primary-500" />
        Opérations détaillées
      </h2>
      <TransactionsTable transactions={transactions} loading={loading} />
    </section>
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
  loading: PropTypes.bool
};

TransactionsSection.defaultProps = {
  loading: false
};

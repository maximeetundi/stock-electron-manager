import React, { useEffect, useMemo, useState } from 'react';
import { categoriesApi, transactionsApi } from '@/utils/apiClient';
import { formatCurrency } from '@/utils/format';
import classNames from 'classnames';
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  TagIcon,
  CurrencyDollarIcon,
  PencilSquareIcon,
  ArrowRightCircleIcon,
  ClockIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';

const TYPE_OPTIONS = [
  { value: 'ENTREE', label: 'Entrée', icon: ArrowTrendingUpIcon },
  { value: 'SORTIE', label: 'Sortie', icon: ArrowTrendingDownIcon }
];

export default function NewTransactionPage() {
  const [categories, setCategories] = useState([]);
  const [type, setType] = useState('ENTREE');
  const [categorieId, setCategorieId] = useState('');
  const [montant, setMontant] = useState('');
  const [libelle, setLibelle] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const categoriesOptions = useMemo(
    () => categories.map((category) => ({ value: category.id, label: category.nom })),
    [categories]
  );

  const categoriesMap = useMemo(() => {
    const map = new Map();
    categories.forEach((category) => {
      map.set(category.id, category.nom);
    });
    return map;
  }, [categories]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoriesApi.list();
        setCategories(data);
        if (data?.length) {
          setCategorieId(String(data[0].id));
        }
      } catch (err) {
        setFeedback({ type: 'error', message: err.message });
      }
    };

    fetchCategories();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const trimmedLibelle = libelle.trim();
      const payload = {
        categorieId: Number(categorieId),
        montant: Number(montant),
        type,
        libelle: trimmedLibelle || undefined,
        lieu: trimmedLibelle || undefined
      };
      const transaction = await transactionsApi.create(payload);
      setFeedback({ type: 'success', message: 'Opération ajoutée avec succès !' });
      setMontant('');
      setLibelle('');
      setHistory((prev) => [
        {
          ...transaction,
          libelle: transaction.libelle ?? transaction.lieu ?? trimmedLibelle,
          categorie: transaction.categorie ?? categoriesMap.get(transaction.categorieId) ?? ''
        },
        ...prev
      ].slice(0, 5));
      setType('ENTREE');
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-white/80 p-8 shadow-xl dark:bg-slate-900/80">
        <header>
          <h1 className="flex items-center gap-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            <BanknotesIcon className="h-7 w-7 text-primary-500" />
            Nouvelle opération
          </h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <PencilSquareIcon className="h-4 w-4 text-primary-400" />
            Enregistrez une entrée ou une sortie financière pour le complexe scolaire.
          </p>
        </header>
        <form onSubmit={handleSubmit} className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <ArrowsRightLeftIcon className="h-4 w-4 text-primary-500" />
              Type d’opération
            </p>
            <div className="mt-3 flex gap-3">
              {TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={classNames(
                      'flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                      isActive
                        ? 'border-primary-500 bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-primary-500 hover:text-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    )}
                  >
                    {Icon ? (
                      <Icon className={classNames('h-5 w-5', isActive ? 'text-white' : 'text-primary-500')} />
                    ) : null}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <TagIcon className="h-4 w-4 text-primary-500" />
              Catégorie
            </label>
            <select
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              value={categorieId}
              onChange={(event) => setCategorieId(event.target.value)}
            >
              {categoriesOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <CurrencyDollarIcon className="h-5 w-5 text-emerald-500" />
              Montant (XAF)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={montant}
              onChange={(event) => setMontant(event.target.value)}
              required
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <PencilSquareIcon className="h-5 w-5 text-primary-400" />
              Libellé (optionnel)
            </label>
            <input
              type="text"
              value={libelle}
              onChange={(event) => setLibelle(event.target.value)}
              placeholder="Ex. Fournisseur, Atelier..."
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="flex items-center">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-primary-500/40 transition hover:bg-primary-400 disabled:cursor-not-allowed disabled:bg-primary-500/60"
            >
              <ArrowRightCircleIcon className="h-5 w-5" />
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
        {feedback && (
          <p
            className={classNames(
              'mt-6 rounded-2xl px-5 py-4 text-sm',
              feedback.type === 'success'
                ? 'border border-emerald-400 bg-emerald-50 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'border border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200'
            )}
          >
            {feedback.message}
          </p>
        )}
      </section>
      <section className="rounded-3xl bg-white/80 p-8 shadow-xl dark:bg-slate-900/80">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
          <ClockIcon className="h-5 w-5 text-primary-500" />
          Dernières opérations enregistrées
        </h2>
        {!history.length ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Les opérations apparaîtront ici après leur enregistrement.
          </p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {history.map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={classNames(
                      'flex h-9 w-9 items-center justify-center rounded-full',
                      transaction.type === 'ENTREE'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300'
                        : 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300'
                    )}
                  >
                    {transaction.type === 'ENTREE' ? (
                      <ArrowTrendingUpIcon className="h-5 w-5" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-5 w-5" />
                    )}
                  </span>
                  <span className="flex flex-col gap-1">
                    <span>
                      {transaction.type === 'ENTREE' ? 'Entrée' : 'Sortie'} •
                      {` ${transaction.categorie || categoriesMap.get(transaction.categorieId) || '—'}`}
                    </span>
                    {transaction.libelle && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">Libellé : {transaction.libelle}</span>
                    )}
                  </span>
                </span>
                <span className="flex items-center gap-2 font-semibold">
                  <CurrencyDollarIcon className="h-4 w-4 text-primary-500" />
                  {formatCurrency(transaction.montant)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

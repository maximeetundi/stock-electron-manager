import React, { useState } from 'react';
import { userApi, categoriesApi } from '@/utils/apiClient';
import classNames from 'classnames';
import {
  Cog6ToothIcon,
  LockClosedIcon,
  KeyIcon,
  ShieldCheckIcon,
  PlusCircleIcon,
  TagIcon
} from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryFeedback, setCategoryFeedback] = useState(null);

  const handleUpdatePassword = async (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Les mots de passe ne correspondent pas.' });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      await userApi.updatePassword({ currentPassword, newPassword });
      setFeedback({ type: 'success', message: 'Mot de passe mis à jour avec succès.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (event) => {
    event.preventDefault();
    if (!categoryName.trim()) {
      setCategoryFeedback({ type: 'error', message: 'Veuillez saisir un nom de catégorie.' });
      return;
    }

    try {
      await categoriesApi.add(categoryName.trim());
      setCategoryFeedback({ type: 'success', message: 'Catégorie ajoutée.' });
      setCategoryName('');
    } catch (error) {
      setCategoryFeedback({ type: 'error', message: error.message });
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-white/80 p-8 shadow-xl dark:bg-slate-900/80">
        <h1 className="flex items-center gap-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          <Cog6ToothIcon className="h-7 w-7 text-primary-500" />
          Paramètres du compte
        </h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <LockClosedIcon className="h-4 w-4 text-primary-400" />
          Mettez à jour votre mot de passe et gérez les paramètres essentiels de l’application.
        </p>
        <form onSubmit={handleUpdatePassword} className="mt-8 space-y-5 max-w-xl">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <KeyIcon className="h-4 w-4 text-primary-500" />
              Mot de passe actuel
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                <LockClosedIcon className="h-4 w-4 text-primary-500" />
                Nouveau mot de passe
              </label>
              <input
                type="password"
                required
                value={newPassword}
                minLength={8}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                <ShieldCheckIcon className="h-4 w-4 text-primary-500" />
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-2xl bg-primary-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-primary-500/40 transition hover:bg-primary-400 disabled:cursor-not-allowed disabled:bg-primary-500/60"
          >
            <ShieldCheckIcon className="h-5 w-5" />
            {loading ? 'Enregistrement...' : 'Mettre à jour'}
          </button>
          {feedback && (
            <p
              className={classNames(
                'rounded-2xl px-5 py-4 text-sm',
                feedback.type === 'success'
                  ? 'border border-emerald-400 bg-emerald-50 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : 'border border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200'
              )}
            >
              {feedback.message}
            </p>
          )}
        </form>
      </section>
      <section className="rounded-3xl bg-white/80 p-8 shadow-xl dark:bg-slate-900/80 max-w-xl">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
          <TagIcon className="h-5 w-5 text-primary-500" />
          Gestion des catégories
        </h2>
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <PlusCircleIcon className="h-4 w-4 text-primary-400" />
          Ajoutez rapidement une nouvelle catégorie pour les opérations financières.
        </p>
        <form onSubmit={handleAddCategory} className="mt-6 space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <TagIcon className="h-4 w-4 text-primary-500" />
              Nom de la catégorie
            </label>
            <input
              type="text"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              placeholder="Ex: Cantine, Transport..."
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-2xl border border-primary-500 px-6 py-3 text-sm font-semibold text-primary-500 transition hover:bg-primary-500 hover:text-white dark:border-primary-400 dark:text-primary-300 dark:hover:bg-primary-400 dark:hover:text-slate-900"
          >
            <PlusCircleIcon className="h-5 w-5" />
            Ajouter la catégorie
          </button>
          {categoryFeedback && (
            <p
              className={classNames(
                'rounded-2xl px-4 py-3 text-sm',
                categoryFeedback.type === 'success'
                  ? 'border border-emerald-400 bg-emerald-50 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : 'border border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200'
              )}
            >
              {categoryFeedback.message}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}

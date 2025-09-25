import React, { useState } from 'react';
import { useAuth } from '@/state/AuthContext.jsx';

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const ok = await login(password);
    if (ok) {
      setSuccess(true);
    } else {
      setSuccess(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white/10 p-10 backdrop-blur-lg shadow-2xl">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-primary-300">Complexe scolaire</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Accès caissière</h1>
          <p className="mt-2 text-sm text-slate-300">
            Saisissez votre mot de passe pour accéder au tableau de bord financier.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-200">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          {error && (
            <p className="rounded-xl border border-red-400 bg-red-50/20 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-xl border border-emerald-400 bg-emerald-50/20 px-4 py-3 text-sm text-emerald-200">
              Connexion réussie. Redirection...
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-primary-500 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-primary-500/40 transition hover:bg-primary-400 disabled:cursor-not-allowed disabled:bg-primary-500/60"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          Mot de passe par défaut : <span className="font-medium text-slate-100">Caissiere@2024</span>
        </p>
      </div>
    </div>
  );
}

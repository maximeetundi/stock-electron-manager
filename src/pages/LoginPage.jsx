import React, { useState } from 'react';
import { useAuth } from '@/state/AuthContext.jsx';
import { userApi } from '@/utils/apiClient';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [recoveryMsg, setRecoveryMsg] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const ok = await login(password);
    if (ok) {
      setSuccess(true);
    } else {
      setSuccess(false);
    }
  };

  const handleRecovery = async (event) => {
    event.preventDefault();
    setRecoveryMsg(null);
    if (!recoveryCode.trim() || !newPassword.trim()) {
      setRecoveryMsg({ type: 'error', message: 'Code et nouveau mot de passe requis.' });
      return;
    }
    try {
      setRecovering(true);
      await userApi.updatePasswordByRecovery({ code: recoveryCode.trim(), newPassword: newPassword.trim() });
      setRecoveryMsg({ type: 'success', message: 'Mot de passe réinitialisé. Connectez-vous avec le nouveau mot de passe.' });
      setShowRecovery(false);
      setPassword('');
      setRecoveryCode('');
      setNewPassword('');
    } catch (e) {
      setRecoveryMsg({ type: 'error', message: e.message || 'Échec de la réinitialisation.' });
    } finally {
      setRecovering(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white/10 p-10 backdrop-blur-lg shadow-2xl">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-primary-300">Complexe scolaire</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Connexion sécurisée</h1>
          <p className="mt-2 text-sm text-slate-300">
            Saisissez votre mot de passe pour accéder au tableau de bord financier.
          </p>
        </div>
        {!showRecovery ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-200">
              Mot de passe
            </label>
            <div className="mt-2 relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 pr-12 text-white placeholder:text-white/50 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-white/70 hover:text-white"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
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
          <button
            type="button"
            className="mt-2 w-full text-center text-xs text-primary-300 hover:underline"
            onClick={() => setShowRecovery(true)}
          >
            Mot de passe oublié ?
          </button>
        </form>
        ) : (
        <form onSubmit={handleRecovery} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-200">Code de récupération</label>
            <input
              type="text"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder="ABCD-EFGH"
              className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200">Nouveau mot de passe</label>
            <input
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          {recoveryMsg && (
            <p className={`rounded-xl px-4 py-3 text-sm ${recoveryMsg.type === 'success' ? 'border border-emerald-400 bg-emerald-50/20 text-emerald-200' : 'border border-red-400 bg-red-50/20 text-red-200'}`}>
              {recoveryMsg.message}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={recovering}
              className="flex-1 rounded-xl bg-primary-500 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-primary-500/40 transition hover:bg-primary-400 disabled:cursor-not-allowed disabled:bg-primary-500/60"
            >
              {recovering ? 'Réinitialisation...' : 'Réinitialiser'}
            </button>
            <button
              type="button"
              onClick={() => { setShowRecovery(false); setRecoveryMsg(null); }}
              className="flex-1 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white/90 transition hover:bg-white/10"
            >
              Annuler
            </button>
          </div>
        </form>
        )}
        <p className="mt-6 text-center text-xs text-slate-400">
          Mot de passe par défaut : <span className="font-medium text-slate-100">Caissiere@2024</span>
        </p>
      </div>
    </div>
  );
}

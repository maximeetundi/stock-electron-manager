import React, { useState } from 'react';

export default function BackupPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const pad = (n) => String(n).padStart(2, '0');
  const makeTimestamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  };
  const randomId = () => Math.random().toString(36).slice(2, 6);

  const handleExport = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const defaultPath = `ecole-finances-${makeTimestamp()}-${randomId()}.db`;
      const result = await window.api.dialog.saveFile({
        title: 'Exporter la base de données',
        defaultPath,
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }]
      });
      if (!result || typeof result !== 'string') {
        setBusy(false);
        return;
      }
      const { ok, error } = await window.api.db.export(result);
      if (!ok) throw new Error(error || 'Export échoué');
      setMessage({ type: 'success', text: 'Export réalisé avec succès.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || "Impossible d'exporter la base." });
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await window.api.dialog.openFile({
        title: 'Importer une base de données',
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }],
        properties: ['openFile']
      });
      const filePath = result?.data || result; // compat selon preload
      if (!filePath || typeof filePath !== 'string') {
        setBusy(false);
        return;
      }
      const { ok, error } = await window.api.db.import(filePath);
      if (!ok) throw new Error(error || 'Import échoué');
      setMessage({ type: 'success', text: "Import réalisé avec succès. L'application va recharger." });
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || "Impossible d'importer la base." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-white p-8 shadow-xl dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Sauvegarde et restauration</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Exportez la base SQLite pour sauvegarde, ou importez un fichier pour restaurer toutes les données.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={handleExport}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white shadow shadow-primary-500/40 transition hover:bg-primary-400 disabled:cursor-not-allowed disabled:bg-primary-500/60"
          >
            Exporter la base
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white shadow shadow-slate-800/40 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-700/60"
          >
            Importer une base
          </button>
        </div>
        {message && (
          <p
            className={
              'mt-6 rounded-2xl px-5 py-4 text-sm ' +
              (message.type === 'success'
                ? 'border border-emerald-400 bg-emerald-50 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'border border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200')
            }
          >
            {message.text}
          </p>
        )}
      </section>
    </div>
  );
}

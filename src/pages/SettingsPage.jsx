import React, { useEffect, useState } from 'react';
import { userApi, categoriesApi, fileApi, authApi, appApi } from '@/utils/apiClient';
import classNames from 'classnames';
import {
  Cog6ToothIcon,
  LockClosedIcon,
  KeyIcon,
  ShieldCheckIcon,
  PlusCircleIcon,
  TagIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckIcon,
  ChartBarIcon,
  Square3Stack3DIcon
} from '@heroicons/react/24/outline';
import { useAppMode, APP_MODES } from '@/state/AppModeContext.jsx';

const SIGNER_SLOTS = ['left', 'center', 'right'];

export default function SettingsPage() {
  const { appMode, changeMode } = useAppMode();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryFeedback, setCategoryFeedback] = useState(null);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState({}); // { [id]: name }
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, name: '' });
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [recoveryFeedback, setRecoveryFeedback] = useState(null);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgLogoPath, setOrgLogoPath] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [identityFeedback, setIdentityFeedback] = useState(null);
  const [defaultDashboard, setDefaultDashboard] = useState('finances');
  const [dashboardFeedback, setDashboardFeedback] = useState(null);
  const [modeFeedback, setModeFeedback] = useState(null);
  const [docHeaderLeft, setDocHeaderLeft] = useState('');
  const [docHeaderRight, setDocHeaderRight] = useState('');
  const [docHeaderCenterTitle, setDocHeaderCenterTitle] = useState('');
  const [docHeaderCenterSubtitle, setDocHeaderCenterSubtitle] = useState('');
  const [docHeaderEmblemPath, setDocHeaderEmblemPath] = useState('');
  const [docHeaderEmblemPreview, setDocHeaderEmblemPreview] = useState('');
  const [docFooterSigners, setDocFooterSigners] = useState([
    { slot: 'left', label: '', name: '' },
    { slot: 'center', label: '', name: '' },
    { slot: 'right', label: '', name: '' }
  ]);
  const [documentFeedback, setDocumentFeedback] = useState(null);

  const normalizeSignersState = (value) => {
    let parsed = [];
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        parsed = [];
      }
    } else if (Array.isArray(value)) {
      parsed = value;
    }
    return SIGNER_SLOTS.map((slot, index) => ({
      slot,
      label: parsed[index]?.label || '',
      name: parsed[index]?.name || ''
    }));
  };

  const handleSignerChange = (index, field, value) => {
    setDocFooterSigners((prev) =>
      prev.map((signer, idx) =>
        idx === index ? { ...signer, [field]: value } : signer
      )
    );
  };

  const chooseHeaderEmblem = async () => {
    try {
      const selected = await window.api.dialog.openFile({
        title: 'Choisir un emblème',
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
      });
      const filePath = typeof selected === 'string' ? selected : selected?.data;
      if (!filePath || typeof filePath !== 'string') return;
      setDocHeaderEmblemPath(filePath);
      try {
        setDocHeaderEmblemPreview(await fileApi.readAsDataUrl(filePath));
      } catch {
        setDocHeaderEmblemPreview('');
      }
    } catch (error) {
      setDocumentFeedback({ type: 'error', message: error.message || "Impossible de sélectionner l'emblème." });
    }
  };

  const saveDocumentBranding = async () => {
    try {
      setDocumentFeedback(null);
      await appApi.updateSettings({
        doc_header_left: docHeaderLeft,
        doc_header_right: docHeaderRight,
        doc_header_center_title: docHeaderCenterTitle,
        doc_header_center_subtitle: docHeaderCenterSubtitle,
        doc_header_emblem_path: docHeaderEmblemPath || '',
        doc_footer_signers: JSON.stringify(docFooterSigners)
      });
      setDocumentFeedback({ type: 'success', message: 'Personnalisation des documents enregistrée.' });
    } catch (error) {
      setDocumentFeedback({ type: 'error', message: error.message || 'Impossible de sauvegarder la personnalisation.' });
    }
  };

  const refreshCategories = async () => {
    try {
      const list = await categoriesApi.list();
      setCategories(list || []);
    } catch (err) {
      setCategoryFeedback({ type: 'error', message: err.message || 'Impossible de charger les catégories.' });
    }
  };

  const generateCodes = async () => {
    try {
      setRecoveryFeedback(null);
      if (!recoveryPassword) {
        setRecoveryFeedback({ type: 'error', message: 'Veuillez confirmer votre mot de passe.' });
        return;
      }
      // Vérifier le mot de passe actuel via authApi.login
      try {
        await authApi.login(recoveryPassword);
      } catch (e) {
        setRecoveryFeedback({ type: 'error', message: 'Mot de passe incorrect.' });
        return;
      }
      const codes = await userApi.generateRecoveryCodes();
      setRecoveryCodes(codes || []);
      setRecoveryFeedback({ type: 'success', message: 'Nouveaux codes générés. Téléchargez-les et conservez-les en lieu sûr.' });
      setRecoveryPassword('');
    } catch (err) {
      setRecoveryFeedback({ type: 'error', message: err.message || 'Impossible de générer les codes.' });
    }
  };

  const downloadCodes = async () => {
    if (!recoveryCodes?.length) return;
    const content = `Codes de récupération Ecole Finances\n\n${recoveryCodes.map((c) => `- ${c}`).join('\n')}\n\nChaque code n\'est utilisable qu\'une seule fois.`;
    const filePath = await fileApi.saveFile({
      title: 'Enregistrer les codes de récupération',
      defaultPath: 'codes-de-recuperation.txt',
      filters: [{ name: 'TXT', extensions: ['txt'] }]
    });
    if (!filePath) return;
    await fileApi.write({ filePath, data: content, encoding: 'utf8' });
    setRecoveryFeedback({ type: 'success', message: `Codes enregistrés dans: ${filePath}` });
  };

  useEffect(() => {
    (async () => {
      refreshCategories();
      try {
        const s = await appApi.getSettings();
        setOrgName(s.org_name || '');
        setOrgLogoPath(s.org_logo_path || '');
        setDefaultDashboard(s.default_dashboard || 'finances');
        setDocHeaderLeft(s.doc_header_left || '');
        setDocHeaderRight(s.doc_header_right || '');
        setDocHeaderCenterTitle(s.doc_header_center_title || '');
        setDocHeaderCenterSubtitle(s.doc_header_center_subtitle || '');
        setDocHeaderEmblemPath(s.doc_header_emblem_path || '');
        setDocFooterSigners(normalizeSignersState(s.doc_footer_signers));
        if (s.org_logo_path) {
          try { setLogoPreview(await fileApi.readAsDataUrl(s.org_logo_path)); } catch {}
        }
        if (s.doc_header_emblem_path) {
          try { setDocHeaderEmblemPreview(await fileApi.readAsDataUrl(s.doc_header_emblem_path)); } catch { setDocHeaderEmblemPreview(''); }
        } else {
          setDocHeaderEmblemPreview('');
        }
      } catch (e) {
        // silent: settings not critical to block page
      }
    })();
  }, []);

  const chooseLogo = async () => {
    try {
      const selected = await window.api.dialog.openFile({
        title: 'Choisir un logo',
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
      });
      if (!selected) return;
      // window.api.dialog.openFile renvoie { ok, data } via preload; on accepte aussi un string direct par sécurité
      const filePath = typeof selected === 'string' ? selected : selected?.data;
      if (!filePath || typeof filePath !== 'string') return;
      setOrgLogoPath(filePath);
      try { setLogoPreview(await fileApi.readAsDataUrl(filePath)); } catch {}
    } catch (e) {
      setIdentityFeedback({ type: 'error', message: e.message || 'Impossible de sélectionner le logo.' });
    }
  };

  const saveIdentity = async () => {
    try {
      setIdentityFeedback(null);
      const updated = await appApi.updateSettings({ org_name: orgName.trim(), org_logo_path: orgLogoPath || '' });
      setIdentityFeedback({ type: 'success', message: 'Identité mise à jour.' });
      if (updated?.org_logo_path) {
        try { setLogoPreview(await fileApi.readAsDataUrl(updated.org_logo_path)); } catch {}
      }
    } catch (e) {
      setIdentityFeedback({ type: 'error', message: e.message || "Impossible d'enregistrer l'identité." });
    }
  };

  const saveDashboardPreference = async () => {
    try {
      setDashboardFeedback(null);
      await appApi.updateSettings({ default_dashboard: defaultDashboard });
      setDashboardFeedback({ type: 'success', message: 'Préférence de dashboard enregistrée.' });
    } catch (e) {
      setDashboardFeedback({ type: 'error', message: e.message || "Impossible d'enregistrer la préférence." });
    }
  };

  const handleModeChange = (newMode) => {
    try {
      setModeFeedback(null);
      changeMode(newMode);
      setModeFeedback({ type: 'success', message: 'Mode d\'application changé avec succès. Le menu a été mis à jour.' });
      // Le feedback disparaît après 3 secondes
      setTimeout(() => setModeFeedback(null), 3000);
    } catch (e) {
      setModeFeedback({ type: 'error', message: e.message || "Impossible de changer le mode." });
    }
  };

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
      await refreshCategories();
    } catch (error) {
      setCategoryFeedback({ type: 'error', message: error.message });
    }
  };

  const startEdit = (cat) => setEditing((prev) => ({ ...prev, [cat.id]: cat.nom }));
  const cancelEdit = (id) => setEditing((prev) => {
    const copy = { ...prev };
    delete copy[id];
    return copy;
  });
  const changeEdit = (id, value) => setEditing((prev) => ({ ...prev, [id]: value }));
  const saveEdit = async (id) => {
    const name = (editing[id] || '').trim();
    if (!name) {
      setCategoryFeedback({ type: 'error', message: 'Le nom ne peut pas être vide.' });
      return;
    }
    try {
      await categoriesApi.update(id, name);
      setCategoryFeedback({ type: 'success', message: 'Catégorie renommée.' });
      cancelEdit(id);
      await refreshCategories();
    } catch (err) {
      setCategoryFeedback({ type: 'error', message: err.message || 'Impossible de renommer la catégorie.' });
    }
  };

  const doRemoveCategory = async (id) => {
    try {
      const result = await categoriesApi.remove(id);
      const savedPath = result?.savedPath || result?.backupPath;
      setCategoryFeedback({
        type: 'success',
        message: savedPath ? `Catégorie supprimée. Sauvegarde: ${savedPath}` : 'Catégorie supprimée.'
      });
      await refreshCategories();
    } catch (err) {
      setCategoryFeedback({ type: 'error', message: err.message || 'Impossible de supprimer la catégorie.' });
    }
  };

  const askRemoveCategory = (cat) => {
    setConfirmDelete({ open: true, id: cat.id, name: cat.nom });
  };
  const cancelRemove = () => setConfirmDelete({ open: false, id: null, name: '' });
  const confirmRemove = async () => {
    if (!confirmDelete.id) return;
    const id = confirmDelete.id;
    setConfirmDelete({ open: false, id: null, name: '' });
    await doRemoveCategory(id);
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
      <div className="rounded-3xl bg-white/80 p-6 shadow-xl dark:bg-slate-900/80 max-w-2xl">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
          <Cog6ToothIcon className="h-5 w-5 text-primary-500" />
          Identité de l’établissement
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Ces informations apparaîtront dans l’entête des PDF et impressions. Dans Excel, seul le nom est ajouté.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="md:col-span-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            Nom de la structure
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              placeholder="Ex: Complexe scolaire — Ecole Finances"
            />
          </label>
          <div>
            <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Logo</span>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="max-h-14 max-w-14 object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">Aucun</span>
                )}
              </div>
              <button type="button" onClick={chooseLogo} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Choisir…</button>
            </div>
            {typeof orgLogoPath === 'string' && orgLogoPath ? (
              <p className="mt-1 truncate text-xs text-slate-500" title={orgLogoPath}>{orgLogoPath}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={saveIdentity} className="rounded-2xl bg-primary-500 px-5 py-2 text-sm font-semibold text-white shadow shadow-primary-500/40 transition hover:bg-primary-400">Enregistrer</button>
        </div>
        {identityFeedback && (
          <p className={classNames(
            'mt-3 rounded-2xl px-4 py-3 text-sm',
            identityFeedback.type === 'success'
              ? 'border border-emerald-400 bg-emerald-50 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200'
              : 'border border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200'
          )}>{identityFeedback.message}</p>
        )}
      </div>

      <div className="rounded-3xl bg-white/80 p-6 shadow-xl dark:bg-slate-900/80">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
          <Cog6ToothIcon className="h-5 w-5 text-primary-500" />
          Personnalisation des documents
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Définissez l’entête bilingue et les signataires qui apparaîtront sur les impressions et exports PDF (bons, rapports, etc.).
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Colonne gauche (français)
            <textarea
              rows={8}
              value={docHeaderLeft}
              onChange={(e) => setDocHeaderLeft(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              placeholder="Une ligne par texte (ex: République du Cameroun)"
            />
          </label>
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Colonne droite (anglais)
            <textarea
              rows={8}
              value={docHeaderRight}
              onChange={(e) => setDocHeaderRight(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              placeholder="One line per text (ex: Republic of Cameroon)"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Titre central
            <input
              type="text"
              value={docHeaderCenterTitle}
              onChange={(e) => setDocHeaderCenterTitle(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              placeholder="Ex: COMPLEXE SCOLAIRE ..."
            />
          </label>
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Sous-titre / contacts
            <input
              type="text"
              value={docHeaderCenterSubtitle}
              onChange={(e) => setDocHeaderCenterSubtitle(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              placeholder="Ex: BP - Téléphone"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <div>
            <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">Emblème central</span>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                {docHeaderEmblemPreview ? (
                  <img src={docHeaderEmblemPreview} alt="Emblème" className="max-h-16 max-w-16 object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">Aucun</span>
                )}
              </div>
              <button
                type="button"
                onClick={chooseHeaderEmblem}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Choisir…
              </button>
            </div>
            {typeof docHeaderEmblemPath === 'string' && docHeaderEmblemPath ? (
              <p className="mt-1 max-w-xs truncate text-xs text-slate-500" title={docHeaderEmblemPath}>{docHeaderEmblemPath}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Signataires en pied de page</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Renseignez uniquement les colonnes nécessaires. S’ils sont vides, ils n’apparaîtront pas.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {docFooterSigners.map((signer, index) => (
              <div key={signer.slot} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  {signer.slot === 'left' ? 'Colonne gauche' : signer.slot === 'center' ? 'Colonne centrale' : 'Colonne droite'}
                </p>
                <label className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Fonction / rôle
                  <input
                    type="text"
                    value={signer.label}
                    onChange={(e) => handleSignerChange(index, 'label', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                </label>
                <label className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Nom (optionnel)
                  <input
                    type="text"
                    value={signer.name}
                    onChange={(e) => handleSignerChange(index, 'name', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={saveDocumentBranding}
            className="rounded-2xl bg-primary-500 px-5 py-2 text-sm font-semibold text-white shadow shadow-primary-500/40 transition hover:bg-primary-400"
          >
            Enregistrer la personnalisation
          </button>
          {documentFeedback && (
            <p className={classNames(
              'rounded-2xl px-4 py-2 text-sm',
              documentFeedback.type === 'success'
                ? 'border border-emerald-400 bg-emerald-50 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'border border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200'
            )}>
              {documentFeedback.message}
            </p>
          )}
        </div>
      </div>

      {/* Dashboard par défaut */}
      <div className="rounded-3xl bg-white/80 p-6 shadow-xl dark:bg-slate-900/80 max-w-2xl">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
          <ChartBarIcon className="h-5 w-5 text-primary-500" />
          Dashboard par défaut
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Choisissez le dashboard qui s'affiche par défaut à l'ouverture de l'application.
        </p>
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
            Mode par défaut
          </label>
          <select
            value={defaultDashboard}
            onChange={(e) => setDefaultDashboard(e.target.value)}
            className="mt-2 w-full max-w-xs rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="finances">💰 Finances</option>
            <option value="stock">📦 Stock</option>
          </select>
        </div>
        <div className="mt-4">
          <button 
            type="button" 
            onClick={saveDashboardPreference}
            className="rounded-2xl bg-primary-500 px-5 py-2 text-sm font-semibold text-white shadow shadow-primary-500/40 transition hover:bg-primary-400"
          >
            Enregistrer
          </button>
        </div>
        {dashboardFeedback && (
          <p className={classNames(
            'mt-3 rounded-2xl px-4 py-3 text-sm',
            dashboardFeedback.type === 'success'
              ? 'border border-emerald-400 bg-emerald-50 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200'
              : 'border border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200'
          )}>{dashboardFeedback.message}</p>
        )}
      </div>

      {/* Mode d'application */}
      <div className="rounded-3xl bg-white/80 p-6 shadow-xl dark:bg-slate-900/80 max-w-2xl">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
          <Square3Stack3DIcon className="h-5 w-5 text-primary-500" />
          Mode d'application
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Choisissez le mode d'utilisation de l'application. Cela détermine quelles fonctionnalités sont visibles dans le menu.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {/* Mode Finance */}
          <button
            onClick={() => handleModeChange(APP_MODES.FINANCE)}
            className={classNames(
              'relative rounded-2xl border-2 p-4 text-left transition-all',
              appMode === APP_MODES.FINANCE
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                : 'border-slate-200 hover:border-primary-300 dark:border-slate-700 dark:hover:border-primary-600'
            )}
          >
            {appMode === APP_MODES.FINANCE && (
              <div className="absolute right-3 top-3">
                <CheckIcon className="h-5 w-5 text-primary-500" />
              </div>
            )}
            <div className="text-2xl mb-2">💰</div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Finance</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Opérations financières, statistiques et rapports
            </p>
          </button>

          {/* Mode Stock */}
          <button
            onClick={() => handleModeChange(APP_MODES.STOCK)}
            className={classNames(
              'relative rounded-2xl border-2 p-4 text-left transition-all',
              appMode === APP_MODES.STOCK
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                : 'border-slate-200 hover:border-primary-300 dark:border-slate-700 dark:hover:border-primary-600'
            )}
          >
            {appMode === APP_MODES.STOCK && (
              <div className="absolute right-3 top-3">
                <CheckIcon className="h-5 w-5 text-primary-500" />
              </div>
            )}
            <div className="text-2xl mb-2">📦</div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Stock</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Gestion de stock, bons de commande et rapports stock
            </p>
          </button>

          {/* Mode All */}
          <button
            onClick={() => handleModeChange(APP_MODES.ALL)}
            className={classNames(
              'relative rounded-2xl border-2 p-4 text-left transition-all',
              appMode === APP_MODES.ALL
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                : 'border-slate-200 hover:border-primary-300 dark:border-slate-700 dark:hover:border-primary-600'
            )}
          >
            {appMode === APP_MODES.ALL && (
              <div className="absolute right-3 top-3">
                <CheckIcon className="h-5 w-5 text-primary-500" />
              </div>
            )}
            <div className="text-2xl mb-2">🌐</div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Tout</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Toutes les fonctionnalités (finance + stock)
            </p>
          </button>
        </div>
        {modeFeedback && (
          <p className={classNames(
            'mt-4 rounded-2xl px-4 py-3 text-sm',
            modeFeedback.type === 'success'
              ? 'border border-emerald-400 bg-emerald-50 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200'
              : 'border border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200'
          )}>{modeFeedback.message}</p>
        )}
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

      <div className="mt-10 rounded-3xl bg-white/80 p-6 shadow-xl dark:bg-slate-900/80 max-w-2xl">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
          <ShieldCheckIcon className="h-5 w-5 text-primary-500" />
          Codes de récupération
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Générez des codes de secours pour réinitialiser le mot de passe si vous l\'oubliez. Conservez-les dans un lieu sûr. Chaque code est utilisable **une seule fois**.
        </p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="password"
            placeholder="Confirmez votre mot de passe"
            value={recoveryPassword}
            onChange={(e) => setRecoveryPassword(e.target.value)}
            className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
          <button
            type="button"
            onClick={generateCodes}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:bg-slate-700 dark:bg-primary-500 dark:hover:bg-primary-400"
          >
            Générer 10 codes
          </button>
          <button
            type="button"
            onClick={downloadCodes}
            disabled={!recoveryCodes.length}
            className="rounded-2xl border border-primary-500 px-4 py-2 text-sm font-semibold text-primary-500 transition hover:bg-primary-500 hover:text-white disabled:cursor-not-allowed disabled:border-slate-400 disabled:text-slate-400 dark:border-primary-400 dark:text-primary-300 dark:hover:bg-primary-400 dark:hover:text-slate-900"
          >
            Télécharger (.txt)
          </button>
        </div>
        {recoveryFeedback && (
          <p className={classNames(
            'mt-4 rounded-2xl px-4 py-3 text-sm',
            recoveryFeedback.type === 'success'
              ? 'border border-emerald-400 bg-emerald-50 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200'
              : 'border border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200'
          )}>{recoveryFeedback.message}</p>
        )}
        {recoveryCodes.length ? (
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
            {recoveryCodes.map((code) => (
              <div key={code} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-800">
                {code}
              </div>
            ))}
          </div>
        ) : null}
      </div>
        </form>
        {categories?.length ? (
          <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {categories.map((cat) => {
              const isEditing = Object.prototype.hasOwnProperty.call(editing, cat.id);
              return (
                <div key={cat.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  {isEditing ? (
                    <input
                      value={editing[cat.id]}
                      onChange={(e) => changeEdit(cat.id, e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    />
                  ) : (
                    <span className="text-sm text-slate-700 dark:text-slate-200">{cat.nom}</span>
                  )}
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveEdit(cat.id)}
                          className="rounded-xl border border-emerald-400 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500 hover:text-white dark:border-emerald-500 dark:text-emerald-300"
                          title="Enregistrer"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelEdit(cat.id)}
                          className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          title="Annuler"
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(cat)}
                        className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        title="Renommer"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => askRemoveCategory(cat)}
                      className="rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500 hover:text-white dark:border-rose-500 dark:text-rose-300"
                      title="Supprimer"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
      {confirmDelete.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Confirmer la suppression</h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Voulez-vous vraiment supprimer la catégorie « {confirmDelete.name} » ? Cette action est irréversible et peut supprimer les opérations liées.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={cancelRemove}
                className="rounded-2xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                className="rounded-2xl bg-rose-500 px-5 py-2 text-sm font-semibold text-white shadow shadow-rose-500/40 transition hover:bg-rose-400"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
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

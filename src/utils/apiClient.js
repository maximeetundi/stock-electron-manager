const api = window.api;

const ensureApiAvailable = () => {
  if (!api) {
    throw new Error(
      "API Electron indisponible. Veuillez lancer l'application via le conteneur Electron (ex : `npm run dev`)."
    );
  }
};

if (!api) {
  console.warn('Electron preload API non disponible. L’application est probablement exécutée dans un navigateur.');
}

const safeInvoke = async (fn, fallbackMessage) => {
  try {
    ensureApiAvailable();
    const response = await fn();
    if (!response) {
      throw new Error(fallbackMessage || 'Réponse invalide');
    }
    if (!response.ok) {
      throw new Error(response.error || fallbackMessage || 'Une erreur est survenue');
    }
    if (Object.prototype.hasOwnProperty.call(response, 'data')) {
      return response.data;
    }
    return true;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const authApi = {
  login: async (password) => {
    try {
      ensureApiAvailable();
      const response = await api.auth.login(password);
      if (!response?.ok) {
        throw new Error(response?.error || 'Mot de passe incorrect');
      }
      return true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
};

export const categoriesApi = {
  list: () => safeInvoke(api.categories.list, 'Impossible de récupérer les catégories'),
  add: (name) => safeInvoke(() => api.categories.add(name), 'Impossible d’ajouter la catégorie'),
  update: (id, name) => safeInvoke(() => api.categories.update(id, name), 'Impossible de renommer la catégorie'),
  remove: (id) => safeInvoke(() => api.categories.deleteForce(id), 'Impossible de supprimer la catégorie')
};

export const transactionsApi = {
  create: (payload) => safeInvoke(() => api.transactions.create(payload), 'Impossible de créer la transaction'),
  byPeriod: (options) => safeInvoke(() => api.transactions.byPeriod(options), 'Impossible de récupérer les transactions'),
  recent: (limit) => safeInvoke(() => api.transactions.recent(limit), 'Impossible de récupérer les transactions récentes'),
  update: (id, payload) =>
    safeInvoke(() => api.transactions.update(id, payload), 'Impossible de mettre à jour la transaction'),
  delete: (id) => safeInvoke(() => api.transactions.delete(id), 'Impossible de supprimer la transaction'),
  list: (options) => safeInvoke(() => api.transactions.list(options), 'Impossible de lister les transactions')
};

export const dashboardApi = {
  totals: () => safeInvoke(() => api.dashboard.totals(), 'Impossible de charger le tableau de bord')
};

export const appApi = {
  toggleTheme: () => safeInvoke(() => api.app.toggleTheme(), 'Impossible de changer le thème'),
  getTheme: () => safeInvoke(() => api.app.getTheme(), 'Impossible de récupérer le thème'),
  getSettings: () => safeInvoke(() => api.app.getSettings(), 'Impossible de récupérer les paramètres'),
  updateSettings: (partial) => safeInvoke(() => api.app.updateSettings(partial), 'Impossible de mettre à jour les paramètres')
};

export const userApi = {
  updatePassword: (payload) =>
    safeInvoke(() => api.user.updatePassword(payload), 'Impossible de mettre à jour le mot de passe'),
  generateRecoveryCodes: () =>
    safeInvoke(() => api.user.generateRecoveryCodes(), 'Impossible de générer les codes de récupération'),
  updatePasswordByRecovery: ({ code, newPassword }) =>
    safeInvoke(() => api.user.updatePasswordByRecovery({ code, newPassword }), 'Impossible de réinitialiser le mot de passe avec le code')
};

export const fileApi = {
  saveFile: (options) => safeInvoke(() => api.dialog.saveFile(options), 'Impossible d’ouvrir la fenêtre de sauvegarde'),
  write: ({ filePath, data, encoding }) => safeInvoke(() => api.file.write({ filePath, data, encoding }), 'Impossible d’écrire le fichier'),
  readAsDataUrl: (filePath) => safeInvoke(() => api.file.readAsDataUrl(filePath), 'Impossible de lire le fichier sélectionné')
};

export const PERIOD_OPTIONS = [
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'semester', label: 'Semestre' },
  { key: 'year', label: 'Année' },
  { key: 'custom', label: 'Personnalisé' }
];

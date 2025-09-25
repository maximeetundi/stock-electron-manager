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
  add: (name) => safeInvoke(() => api.categories.add(name), 'Impossible d’ajouter la catégorie')
};

export const transactionsApi = {
  create: (payload) => safeInvoke(() => api.transactions.create(payload), 'Impossible de créer la transaction'),
  byPeriod: (options) => safeInvoke(() => api.transactions.byPeriod(options), 'Impossible de récupérer les transactions'),
  recent: (limit) => safeInvoke(() => api.transactions.recent(limit), 'Impossible de récupérer les transactions récentes')
};

export const dashboardApi = {
  totals: () => safeInvoke(() => api.dashboard.totals(), 'Impossible de charger le tableau de bord')
};

export const appApi = {
  toggleTheme: () => safeInvoke(() => api.app.toggleTheme(), 'Impossible de changer le thème'),
  getTheme: () => safeInvoke(() => api.app.getTheme(), 'Impossible de récupérer le thème')
};

export const userApi = {
  updatePassword: (payload) =>
    safeInvoke(() => api.user.updatePassword(payload), 'Impossible de mettre à jour le mot de passe')
};

export const fileApi = {
  saveFile: (options) => safeInvoke(() => api.dialog.saveFile(options), 'Impossible d’ouvrir la fenêtre de sauvegarde'),
  write: ({ filePath, data, encoding }) => safeInvoke(() => api.file.write({ filePath, data, encoding }), 'Impossible d’écrire le fichier')
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

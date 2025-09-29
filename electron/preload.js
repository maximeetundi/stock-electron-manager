const { contextBridge, ipcRenderer } = require('electron');

const api = {
  auth: {
    login: async (password) => ipcRenderer.invoke('auth:login', { password })
  },
  categories: {
    list: async () => ipcRenderer.invoke('categories:list'),
    add: async (name) => ipcRenderer.invoke('categories:add', name),
    update: async (id, name) => ipcRenderer.invoke('categories:update', { id, name }),
    delete: async (id) => ipcRenderer.invoke('categories:delete', id),
    deleteForce: async (id) => ipcRenderer.invoke('categories:delete:force', id)
  },
  transactions: {
    create: async (payload) => ipcRenderer.invoke('transactions:create', payload),
    byPeriod: async (options) => ipcRenderer.invoke('transactions:byPeriod', options),
    recent: async (limit) => ipcRenderer.invoke('transactions:recent', limit),
    update: async (id, payload) => ipcRenderer.invoke('transactions:update', { id, payload }),
    delete: async (id) => ipcRenderer.invoke('transactions:delete', id),
    list: async (options) => ipcRenderer.invoke('transactions:list', options)
  },
  dashboard: {
    totals: async () => ipcRenderer.invoke('dashboard:totals')
  },
  user: {
    updatePassword: async (payload) => ipcRenderer.invoke('user:update-password', payload),
    generateRecoveryCodes: async () => ipcRenderer.invoke('user:generate-recovery-codes'),
    updatePasswordByRecovery: async (payload) => ipcRenderer.invoke('user:update-password-recovery', payload)
  },
  app: {
    toggleTheme: async () => ipcRenderer.invoke('app:toggle-theme'),
    getTheme: async () => ipcRenderer.invoke('app:get-theme'),
    getSettings: async () => ipcRenderer.invoke('app:get-settings'),
    updateSettings: async (partial) => ipcRenderer.invoke('app:update-settings', partial)
  },
  dialog: {
    saveFile: async (options) => ipcRenderer.invoke('dialog:saveFile', options),
    openFile: async (options) => ipcRenderer.invoke('dialog:openFile', options)
  },
  file: {
    write: async ({ filePath, data, encoding }) =>
      ipcRenderer.invoke('file:write', { filePath, data, encoding }),
    readAsDataUrl: async (filePath) => ipcRenderer.invoke('file:readAsDataUrl', filePath)
  },
  db: {
    export: async (targetPath) => ipcRenderer.invoke('db:export', targetPath),
    import: async (sourcePath) => ipcRenderer.invoke('db:import', sourcePath)
  },
  onThemeUpdated: (callback) => {
    const subscription = (_event, theme) => callback(theme);
    ipcRenderer.on('app:theme-updated', subscription);
    return () => ipcRenderer.removeListener('app:theme-updated', subscription);
  }
};

contextBridge.exposeInMainWorld('api', api);

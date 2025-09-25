const { contextBridge, ipcRenderer } = require('electron');

const api = {
  auth: {
    login: async (password) => ipcRenderer.invoke('auth:login', { password })
  },
  categories: {
    list: async () => ipcRenderer.invoke('categories:list'),
    add: async (name) => ipcRenderer.invoke('categories:add', name)
  },
  transactions: {
    create: async (payload) => ipcRenderer.invoke('transactions:create', payload),
    byPeriod: async (options) => ipcRenderer.invoke('transactions:byPeriod', options),
    recent: async (limit) => ipcRenderer.invoke('transactions:recent', limit)
  },
  dashboard: {
    totals: async () => ipcRenderer.invoke('dashboard:totals')
  },
  user: {
    updatePassword: async (payload) => ipcRenderer.invoke('user:update-password', payload)
  },
  app: {
    toggleTheme: async () => ipcRenderer.invoke('app:toggle-theme'),
    getTheme: async () => ipcRenderer.invoke('app:get-theme')
  },
  dialog: {
    saveFile: async (options) => ipcRenderer.invoke('dialog:saveFile', options)
  },
  file: {
    write: async ({ filePath, data, encoding }) =>
      ipcRenderer.invoke('file:write', { filePath, data, encoding })
  },
  onThemeUpdated: (callback) => {
    const subscription = (_event, theme) => callback(theme);
    ipcRenderer.on('app:theme-updated', subscription);
    return () => ipcRenderer.removeListener('app:theme-updated', subscription);
  }
};

contextBridge.exposeInMainWorld('api', api);

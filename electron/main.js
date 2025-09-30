const { app, BrowserWindow, ipcMain, nativeTheme, dialog, Menu } = require('electron');
const { createDatabaseService } = require('./db');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let dbService;

function createWindow() {
  const iconPath = isDev
    ? path.join(app.getAppPath(), 'logo.png')
    : path.join(process.resourcesPath, 'logo.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f172a' : '#f8fafc',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Theme: get current
  ipcMain.handle('app:get-theme', () => {
    try {
      const mode = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
      return { ok: true, data: mode };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  // Alias robuste pour forcer le flux de sauvegarde même si d'anciens canaux sont mis en cache côté renderer
  ipcMain.handle('categories:delete:force', async (_event, id) => {
    console.log('[main] categories:delete:force', id);
    try {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
      const rand = Math.random().toString(36).slice(2, 6);
      const defaultName = `backup-categorie-${id}-${stamp}-${rand}.db`;

      const saveRes = await dialog.showSaveDialog(mainWindow, {
        title: 'Sauvegarder les données de la catégorie avant suppression',
        defaultPath: defaultName,
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }]
      });
      if (saveRes.canceled || !saveRes.filePath) {
        return { ok: false, error: "Suppression annulée: vous devez d'abord enregistrer la sauvegarde." };
      }
      await dbService.exportCategory(id, saveRes.filePath);
      const result = dbService.deleteCategory(id);
      const { list } = result || {};
      return { ok: true, data: { list, savedPath: saveRes.filePath } };
    } catch (error) {
      console.error('categories:delete:force failed', error);
      return { ok: false, error: error.message };
    }
  });

  

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Resolve index.html robustly in packaged app
    const candidates = [
      path.join(app.getAppPath(), 'dist', 'index.html'),
      path.join(process.resourcesPath, 'app', 'dist', 'index.html'),
      path.join(process.resourcesPath, 'dist', 'index.html')
    ];
    const indexPath = candidates.find((p) => {
      try { return fs.existsSync(p); } catch { return false; }
    }) || path.join(app.getAppPath(), 'dist', 'index.html');
    console.log('[main] Loading index from', indexPath);
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('[main] loadFile failed', err);
    });
    // TEMP: open devtools in production to debug white screen
    //mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Diagnostics for white screen issues
  mainWindow.webContents.on('did-fail-load', async (_e, errorCode, errorDescription, validatedURL) => {
    console.error('[main] did-fail-load', { errorCode, errorDescription, validatedURL });
    try {
      await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Chargement échoué',
        message: `Impossible de charger l'interface (code ${errorCode}).`,
        detail: `${errorDescription}\nURL: ${validatedURL}`
      });
    } catch {}
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[main] render-process-gone', details);
  });
  mainWindow.on('unresponsive', () => {
    console.error('[main] BrowserWindow unresponsive');
  });

  ipcMain.handle('dialog:openFile', async (_event, options) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, options || {});
      if (result.canceled || !result.filePaths?.length) {
        return { ok: true, data: null };
      }
      return { ok: true, data: result.filePaths[0] };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('dialog:saveFile', async (_event, options) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, options || {});
      if (result.canceled || !result.filePath) {
        return { ok: true, data: null };
      }
      return { ok: true, data: result.filePath };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('db:export', async (_event, targetPath) => {
    try {
      await dbService.exportDatabase(targetPath);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('db:import', async (_event, sourcePath) => {
    try {
      await dbService.importDatabase(sourcePath);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });
}

function setupIPC() {
  console.log('[main] Registering IPC handlers...');
  ipcMain.handle('auth:login', (_event, { password }) => {
    try {
      const isValid = dbService.verifyUser(password);
      return { ok: isValid };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('categories:list', () => {
    try {
      const categories = dbService.getCategories();
      return { ok: true, data: categories };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('categories:add', (_event, name) => {
    console.log('[main] categories:add');
    try {
      const categories = dbService.addCategory(name);
      return { ok: true, data: categories };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('categories:update', (_event, { id, name }) => {
    console.log('[main] categories:update', id, name);
    try {
      const categories = dbService.updateCategory(id, name);
      return { ok: true, data: categories };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('categories:delete', async (_event, id) => {
    console.log('[main] categories:delete', id);
    try {
      // 1) Demander OBLIGATOIREMENT où sauvegarder la catégorie avant suppression
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
      const rand = Math.random().toString(36).slice(2, 6);
      const defaultName = `backup-categorie-${id}-${stamp}-${rand}.db`;

      const saveRes = await dialog.showSaveDialog(mainWindow, {
        title: 'Sauvegarder les données de la catégorie avant suppression',
        defaultPath: defaultName,
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }]
      });
      if (saveRes.canceled || !saveRes.filePath) {
        return { ok: false, error: "Suppression annulée: vous devez d'abord enregistrer la sauvegarde." };
      }

      // 2) Exporter la catégorie (avec ou sans opérations) vers le chemin choisi
      await dbService.exportCategory(id, saveRes.filePath);

      // 3) Supprimer la catégorie (créera aussi un backup interne si des opérations existent)
      const result = dbService.deleteCategory(id);
      const { list } = result || {};
      return { ok: true, data: { list, savedPath: saveRes.filePath } };
    } catch (error) {
      console.error('categories:delete failed', error);
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('transactions:create', (_event, payload) => {
    try {
      const transaction = dbService.createTransaction(payload);
      return { ok: true, data: transaction };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('transactions:byPeriod', (_event, options) => {
    try {
      const data = dbService.getTransactionsByPeriod(options);
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('transactions:update', (_event, { id, payload }) => {
    try {
      const data = dbService.updateTransaction(id, payload);
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('transactions:delete', (_event, id) => {
    try {
      const data = dbService.deleteTransaction(id);
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('transactions:list', (_event, options) => {
    try {
      const data = dbService.listTransactions(options || {});
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('dashboard:totals', () => {
    try {
      const data = dbService.getDashboardTotals();
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('transactions:recent', (_event, limit) => {
    try {
      const data = dbService.getRecentTransactions(limit);
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('user:update-password', (_event, payload) => {
    try {
      const result = dbService.updateUserPassword(payload);
      return { ok: true, data: result };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  // Recovery codes: generate and reset by code
  ipcMain.handle('user:generate-recovery-codes', () => {
    try {
      const codes = dbService.generateRecoveryCodes(10);
      return { ok: true, data: codes };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('user:update-password-recovery', (_event, payload) => {
    try {
      const result = dbService.updateUserPasswordByRecovery(payload);
      return { ok: true, data: result };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('app:toggle-theme', () => {
    try {
      const shouldUseDarkColors = !nativeTheme.shouldUseDarkColors;
      nativeTheme.themeSource = shouldUseDarkColors ? 'dark' : 'light';
      return { ok: true, data: shouldUseDarkColors ? 'dark' : 'light' };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  // Settings: get/update
  ipcMain.handle('app:get-settings', () => {
    try {
      const data = dbService.getSettings();
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('app:update-settings', (_event, partial) => {
    try {
      const data = dbService.updateSettings(partial || {});
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  // Read file as Data URL (logo preview)
  ipcMain.handle('file:readAsDataUrl', async (_event, filePath) => {
    try {
      if (!filePath) throw new Error('Chemin de fichier manquant');
      const buffer = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase().replace('.', '') || 'png';
      const base64 = buffer.toString('base64');
      return { ok: true, data: `data:image/${ext};base64,${base64}` };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  // Write arbitrary file (used by PDF/XLSX exports)
  ipcMain.handle('file:write', async (_event, { filePath, data, encoding = 'utf8' }) => {
    try {
      if (!filePath) throw new Error('Aucun chemin de fichier fourni');
      const buffer = Buffer.isBuffer(data)
        ? data
        : Buffer.from(data, encoding === 'base64' ? 'base64' : encoding);
      await fs.promises.writeFile(filePath, buffer);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });
}

app.whenReady().then(() => {
  try {
    // Defensive require in case top-level import didn't refresh
    const dbModule = require('./db');
    const createDb = dbModule && dbModule.createDatabaseService ? dbModule.createDatabaseService : createDatabaseService;
    if (typeof createDb !== 'function') {
      console.error('[main] createDatabaseService introuvable. Vérifiez electron/db.js exports.');
    } else {
      dbService = createDb(app);
    }
  } catch (e) {
    console.error('[main] Erreur lors du chargement de createDatabaseService:', e);
  }
  createWindow();
  setupIPC();
  setupMenu();

  nativeTheme.on('updated', () => {
    if (mainWindow) {
      mainWindow.webContents.send(
        'app:theme-updated',
        nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
      );
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        { role: 'quit', label: 'Quitter' }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

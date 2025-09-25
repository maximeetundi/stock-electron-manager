const { app, BrowserWindow, ipcMain, nativeTheme, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';
const { createDatabaseService } = require('./db');

let mainWindow;
let dbService;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f172a' : '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIPC() {
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
    try {
      const categories = dbService.addCategory(name);
      return { ok: true, data: categories };
    } catch (error) {
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

  ipcMain.handle('app:toggle-theme', () => {
    try {
      const shouldUseDarkColors = !nativeTheme.shouldUseDarkColors;
      nativeTheme.themeSource = shouldUseDarkColors ? 'dark' : 'light';
      return { ok: true, data: shouldUseDarkColors ? 'dark' : 'light' };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('app:get-theme', () => {
    try {
      return { ok: true, data: nativeTheme.shouldUseDarkColors ? 'dark' : 'light' };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('dialog:saveFile', async (_event, options) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, options);
      if (result.canceled) {
        return { ok: true, data: null };
      }
      return { ok: true, data: result.filePath };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('file:write', async (_event, { filePath, data, encoding = 'utf8' }) => {
    try {
      if (!filePath) {
        throw new Error('Aucun chemin de fichier fourni');
      }
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
  dbService = createDatabaseService(app);
  createWindow();
  setupIPC();

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

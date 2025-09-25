const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear
} = require('date-fns');

const WEEK_OPTIONS = { weekStartsOn: 1 };

const DEFAULT_CATEGORIES = [
  'Pension',
  'Première inscription',
  'Réinscription',
  'Frais divers'
];

const DEFAULT_USER = {
  username: 'caissiere',
  password: 'Caissiere@2024'
};

function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getDatabasePath(app) {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'ecole-finances.db');
}

function initializeSchema(db) {
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  db.prepare(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL UNIQUE
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categorie_id INTEGER NOT NULL,
      montant REAL NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('ENTREE', 'SORTIE')),
      date_heure TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      lieu TEXT,
      FOREIGN KEY (categorie_id) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `).run();

  const transactionColumns = db.prepare('PRAGMA table_info(transactions)').all();
  const hasLieuColumn = transactionColumns.some((column) => column.name === 'lieu');
  if (!hasLieuColumn) {
    db.prepare('ALTER TABLE transactions ADD COLUMN lieu TEXT').run();
  }
}

function seedCategories(db) {
  const insert = db.prepare('INSERT OR IGNORE INTO categories (nom) VALUES (?)');
  const insertMany = db.transaction((categories) => {
    categories.forEach((name) => insert.run(name));
  });
  insertMany(DEFAULT_CATEGORIES);
}

function seedDefaultUser(db) {
  const existing = db
    .prepare('SELECT id FROM users WHERE username = ?')
    .get(DEFAULT_USER.username);

  if (!existing) {
    const hashed = bcrypt.hashSync(DEFAULT_USER.password, 10);
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(
      DEFAULT_USER.username,
      hashed
    );
  }
}

function getQuarterRange(date) {
  const startDate = startOfQuarter(date);
  const endDate = endOfQuarter(date);
  return { start: startDate, end: endDate };
}

function getSemesterRange(date) {
  const firstHalf = date.getMonth() < 6;
  const startDate = firstHalf ? new Date(date.getFullYear(), 0, 1) : new Date(date.getFullYear(), 6, 1);
  const endDate = firstHalf
    ? endOfMonth(new Date(date.getFullYear(), 5, 1))
    : endOfMonth(new Date(date.getFullYear(), 11, 1));
  return { start: startDate, end: endDate };
}

function toISOString(date) {
  return new Date(date).toISOString();
}

function resolvePeriodRange({ period, startDate, endDate, referenceDate }) {
  const baseDateRaw = referenceDate ? new Date(referenceDate) : new Date();
  const baseDate = Number.isNaN(baseDateRaw.getTime()) ? new Date() : baseDateRaw;
  switch (period) {
    case 'day':
      return { start: toISOString(startOfDay(baseDate)), end: toISOString(endOfDay(baseDate)) };
    case 'week':
      return {
        start: toISOString(startOfWeek(baseDate, WEEK_OPTIONS)),
        end: toISOString(endOfWeek(baseDate, WEEK_OPTIONS))
      };
    case 'month':
      return { start: toISOString(startOfMonth(baseDate)), end: toISOString(endOfMonth(baseDate)) };
    case 'quarter': {
      const range = getQuarterRange(baseDate);
      return { start: toISOString(range.start), end: toISOString(range.end) };
    }
    case 'semester': {
      const range = getSemesterRange(baseDate);
      return { start: toISOString(range.start), end: toISOString(range.end) };
    }
    case 'year':
      return { start: toISOString(startOfYear(baseDate)), end: toISOString(endOfYear(baseDate)) };
    case 'custom':
      if (!startDate || !endDate) {
        throw new Error('Custom period requires startDate and endDate');
      }
      {
        const start = startOfDay(new Date(startDate));
        const end = endOfDay(new Date(endDate));
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          throw new Error('Période personnalisée invalide');
        }
        if (start > end) {
          throw new Error('La date de début doit précéder la date de fin');
        }
        return { start: toISOString(start), end: toISOString(end) };
      }
    default:
      throw new Error(`Unknown period: ${period}`);
  }
}

function mapTransaction(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    categorieId: row.categorie_id,
    categorie: row.categorie,
    montant: Number(row.montant),
    type: row.type,
    dateHeure: row.date_heure,
    lieu: row.lieu || null
  };
}

function createDatabaseService(app) {
  const dbPath = getDatabasePath(app);
  ensureDirectoryExists(dbPath);

  const db = new Database(dbPath);
  initializeSchema(db);
  seedCategories(db);
  seedDefaultUser(db);

  const statements = {
    userByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
    categories: db.prepare('SELECT id, nom FROM categories ORDER BY nom ASC'),
    insertTransaction: db.prepare(
      `INSERT INTO transactions (categorie_id, montant, type, date_heure, lieu)
       VALUES (@categorieId, @montant, @type, @dateHeure, @lieu)`
    ),
    transactionById: db.prepare(
      `SELECT t.id, t.categorie_id, t.montant, t.type, t.date_heure, t.lieu, c.nom AS categorie
       FROM transactions t
       INNER JOIN categories c ON c.id = t.categorie_id
       WHERE t.id = ?`
    ),
    transactionsByRange: db.prepare(
      `SELECT t.id, t.categorie_id, t.montant, t.type, t.date_heure, t.lieu, c.nom AS categorie
       FROM transactions t
       INNER JOIN categories c ON c.id = t.categorie_id
       WHERE t.date_heure BETWEEN @start AND @end
       ORDER BY t.date_heure DESC`
    ),
    recentTransactions: db.prepare(
      `SELECT t.id, t.categorie_id, t.montant, t.type, t.date_heure, t.lieu, c.nom AS categorie
       FROM transactions t
       INNER JOIN categories c ON c.id = t.categorie_id
       ORDER BY t.date_heure DESC
       LIMIT @limit`
    )
  };

  function verifyUser(password) {
    const user = statements.userByUsername.get(DEFAULT_USER.username);
    if (!user) {
      return false;
    }
    return bcrypt.compareSync(password, user.password);
  }

  function getCategories() {
    return statements.categories.all();
  }

  function addCategory(name) {
    const trimmed = String(name).trim();
    if (!trimmed) {
      throw new Error('Le nom de la catégorie est requis');
    }
    db.prepare('INSERT OR IGNORE INTO categories (nom) VALUES (?)').run(trimmed);
    return getCategories();
  }

  function createTransaction({ categorieId, montant, type, lieu }) {
    if (!categorieId) {
      throw new Error('categorieId est requis');
    }
    const numericAmount = Number(montant);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Le montant doit être un nombre positif');
    }
    const normalizedType = String(type || '').toUpperCase();
    if (!['ENTREE', 'SORTIE'].includes(normalizedType)) {
      throw new Error("Le type doit être 'ENTREE' ou 'SORTIE'");
    }
    const normalizedLieu = typeof lieu === 'string' ? lieu.trim() : '';
    const finalLieu = normalizedLieu.length ? normalizedLieu : null;
    const nowISO = new Date().toISOString();
    const payload = {
      categorieId,
      montant: numericAmount,
      type: normalizedType,
      dateHeure: nowISO,
      lieu: finalLieu
    };
    const info = statements.insertTransaction.run(payload);
    const row = statements.transactionById.get(info.lastInsertRowid);
    return mapTransaction(row);
  }

  function getTransactionsByPeriod(options = {}) {
    const rawCategoryId = options.categoryId;
    const normalizedCategoryId =
      rawCategoryId === undefined || rawCategoryId === null || rawCategoryId === ''
        ? null
        : Number(rawCategoryId);
    const hasCategoryFilter = Number.isInteger(normalizedCategoryId) && normalizedCategoryId > 0;
    const { typeFilter = 'all' } = options;
    const normalizedType = String(typeFilter || 'all').toUpperCase();
    const allowedTypes = new Set(['ENTREE', 'SORTIE', 'ALL']);
    const effectiveType = allowedTypes.has(normalizedType) ? normalizedType : 'ALL';

    const range = resolvePeriodRange(options);
    const allTransactions = statements.transactionsByRange
      .all(range)
      .map(mapTransaction)
      .filter(Boolean);

    const typeFilteredTransactions =
      effectiveType === 'ALL'
        ? allTransactions
        : allTransactions.filter((transaction) => transaction.type === effectiveType);

    const transactions = hasCategoryFilter
      ? typeFilteredTransactions.filter((transaction) => transaction.categorieId === normalizedCategoryId)
      : typeFilteredTransactions;

    const totals = transactions.reduce(
      (acc, transaction) => {
        if (transaction.type === 'ENTREE') {
          acc.entree += transaction.montant;
        } else if (transaction.type === 'SORTIE') {
          acc.sortie += transaction.montant;
        }
        return acc;
      },
      { entree: 0, sortie: 0 }
    );

    const categoryMap = new Map();
    transactions.forEach((transaction) => {
      const existing = categoryMap.get(transaction.categorie) || {
        categorie: transaction.categorie,
        entree: 0,
        sortie: 0,
        balance: 0
      };

      if (transaction.type === 'ENTREE') {
        existing.entree += transaction.montant;
      } else if (transaction.type === 'SORTIE') {
        existing.sortie += transaction.montant;
      }
      existing.balance = existing.entree - existing.sortie;
      categoryMap.set(transaction.categorie, existing);
    });

    const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) =>
      a.categorie.localeCompare(b.categorie, 'fr', { sensitivity: 'base' })
    );

    const computedTotals = {
      entree: totals.entree,
      sortie: totals.sortie,
      balance: totals.entree - totals.sortie
    };

    return {
      range,
      transactions,
      totals: computedTotals,
      balance: computedTotals.balance,
      categoryBreakdown,
      type: effectiveType,
      categoryId: hasCategoryFilter ? normalizedCategoryId : null
    };
  }

  function getDashboardTotals() {
    const periods = ['day', 'week', 'month', 'quarter', 'semester', 'year'];
    const totals = {};

    periods.forEach((period) => {
      const { totals: periodTotals, balance } = getTransactionsByPeriod({ period });
      totals[period] = {
        entree: periodTotals.entree,
        sortie: periodTotals.sortie,
        balance
      };
    });

    return totals;
  }

  function getRecentTransactions(limit = 5) {
    const rows = statements.recentTransactions.all({ limit });
    return rows.map(mapTransaction).filter(Boolean);
  }

  function updateUserPassword({ currentPassword, newPassword }) {
    if (!currentPassword || !newPassword) {
      throw new Error('Les mots de passe actuel et nouveau sont requis');
    }

    if (newPassword.length < 8) {
      throw new Error('Le nouveau mot de passe doit contenir au moins 8 caractères');
    }

    const user = statements.userByUsername.get(DEFAULT_USER.username);
    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    const isValid = bcrypt.compareSync(currentPassword, user.password);
    if (!isValid) {
      throw new Error('Mot de passe actuel incorrect');
    }

    const hashed = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, user.id);
    return true;
  }

  return {
    verifyUser,
    getCategories,
    addCategory,
    createTransaction,
    getTransactionsByPeriod,
    getDashboardTotals,
    getRecentTransactions,
    updateUserPassword
  };
}

module.exports = {
  createDatabaseService,
  resolvePeriodRange
};

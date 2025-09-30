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

  function clearOldRecoveryCodes() {
    db.prepare('DELETE FROM recovery_codes WHERE used = 1').run();
  }

  function generateRecoveryCodes(count = 10) {
    clearOldRecoveryCodes();
    const codes = [];
    const insert = db.prepare('INSERT INTO recovery_codes (code_hash) VALUES (?)');
    for (let i = 0; i < count; i++) {
      const raw = Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      const hash = bcrypt.hashSync(raw, 10);
      insert.run(hash);
      codes.push(raw);
    }
    return codes;
  }

  function verifyAndConsumeRecoveryCode(code) {
    const rows = db.prepare('SELECT id, code_hash, used FROM recovery_codes WHERE used = 0').all();
    for (const row of rows) {
      if (bcrypt.compareSync(code, row.code_hash)) {
        db.prepare('UPDATE recovery_codes SET used = 1, used_at = datetime(\'now\') WHERE id = ?').run(row.id);
        return true;
      }
    }
    return false;
  }

  function updateUserPasswordByRecovery({ code, newPassword }) {
    if (!code || !newPassword) {
      throw new Error('Code de récupération et nouveau mot de passe requis');
    }
    const ok = verifyAndConsumeRecoveryCode(code);
    if (!ok) {
      throw new Error('Code de récupération invalide ou déjà utilisé');
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    const info = db
      .prepare('UPDATE users SET password_hash = ? WHERE username = ?')
      .run(hash, DEFAULT_USER.username);
    return info.changes > 0;
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

  // Application settings (key/value)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categorie_id INTEGER NOT NULL,
      montant REAL NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('ENTREE', 'SORTIE')),
      date_heure TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      libelle TEXT,
      lieu TEXT,
      FOREIGN KEY (categorie_id) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `).run();

  // Codes de récupération de mot de passe (hashés)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS recovery_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code_hash TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      used_at TEXT
    )
  `).run();

  const transactionColumns = db.prepare('PRAGMA table_info(transactions)').all();
  const hasLibelleColumn = transactionColumns.some((column) => column.name === 'libelle');
  if (!hasLibelleColumn) {
    db.prepare('ALTER TABLE transactions ADD COLUMN libelle TEXT').run();
  }
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
    libelle: row.libelle || null,
    lieu: row.lieu || null
  };
}

function createDatabaseService(app) {
  const dbPath = getDatabasePath(app);
  ensureDirectoryExists(dbPath);
  const userDataDir = app.getPath('userData');

  let db = new Database(dbPath);
  initializeSchema(db);
  seedCategories(db);
  seedDefaultUser(db);

  let statements = {
    userByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
    categories: db.prepare('SELECT id, nom FROM categories ORDER BY nom ASC'),
    insertTransaction: db.prepare(
      `INSERT INTO transactions (categorie_id, montant, type, date_heure, libelle, lieu)
       VALUES (@categorieId, @montant, @type, @dateHeure, @libelle, @lieu)`
    ),
    transactionById: db.prepare(
      `SELECT t.id, t.categorie_id, t.montant, t.type, t.date_heure, t.libelle, t.lieu, c.nom AS categorie
       FROM transactions t
       INNER JOIN categories c ON c.id = t.categorie_id
       WHERE t.id = ?`
    ),
    transactionsByRange: db.prepare(
      `SELECT t.id, t.categorie_id, t.montant, t.type, t.date_heure, t.libelle, t.lieu, c.nom AS categorie
       FROM transactions t
       INNER JOIN categories c ON c.id = t.categorie_id
       WHERE t.date_heure BETWEEN @start AND @end
       ORDER BY t.date_heure DESC`
    ),
    recentTransactions: db.prepare(
      `SELECT t.id, t.categorie_id, t.montant, t.type, t.date_heure, t.libelle, t.lieu, c.nom AS categorie
       FROM transactions t
       INNER JOIN categories c ON c.id = t.categorie_id
       ORDER BY t.date_heure DESC
       LIMIT @limit`
    ),
    listTransactionsAsc: db.prepare(
      `SELECT t.id, t.categorie_id, t.montant, t.type, t.date_heure, t.libelle, t.lieu, c.nom AS categorie
       FROM transactions t
       INNER JOIN categories c ON c.id = t.categorie_id
       ORDER BY t.date_heure ASC`
    ),
    listTransactionsDesc: db.prepare(
      `SELECT t.id, t.categorie_id, t.montant, t.type, t.date_heure, t.libelle, t.lieu, c.nom AS categorie
       FROM transactions t
       INNER JOIN categories c ON c.id = t.categorie_id
       ORDER BY t.date_heure DESC`
    ),
    updateTransaction: db.prepare(
      `UPDATE transactions
       SET categorie_id = @categorieId,
           montant = @montant,
           type = @type,
           date_heure = @dateHeure,
           libelle = @libelle,
           lieu = @lieu
       WHERE id = @id`
    ),
    deleteTransaction: db.prepare('DELETE FROM transactions WHERE id = ?')
  };

  function rebuildStatements() {
    statements = {
      userByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
      categories: db.prepare('SELECT id, nom FROM categories ORDER BY nom ASC'),
      insertTransaction: db.prepare(
        `INSERT INTO transactions (categorie_id, montant, type, date_heure, libelle, lieu)
         VALUES (@categorieId, @montant, @type, @dateHeure, @libelle, @lieu)`
      ),
      transactionById: db.prepare(
        `SELECT t.id, t.categorie_id, t.montant, t.type, t.date_heure, t.libelle, t.lieu, c.nom AS categorie
         FROM transactions t
         INNER JOIN categories c ON c.id = t.categorie_id
         WHERE t.id = ?`
      ),
      transactionsByRange: db.prepare(
        `SELECT t.id, t.categorie_id, t.montant, t.type, t.date_heure, t.libelle, t.lieu, c.nom AS categorie
         FROM transactions t
         INNER JOIN categories c ON c.id = t.categorie_id
         WHERE t.date_heure BETWEEN @start AND @end
         ORDER BY t.date_heure DESC`
      ),
      recentTransactions: db.prepare(
        `SELECT t.id, t.categorie_id, t.montant, t.type, t.date_heure, t.libelle, t.lieu, c.nom AS categorie
         FROM transactions t
         INNER JOIN categories c ON c.id = t.categorie_id
         ORDER BY t.date_heure DESC
         LIMIT @limit`
      ),
      listTransactionsAsc: db.prepare(
        `SELECT t.id, t.categorie_id, t.montant, t.type, t.date_heure, t.libelle, t.lieu, c.nom AS categorie
         FROM transactions t
         INNER JOIN categories c ON c.id = t.categorie_id
         ORDER BY t.date_heure ASC`
      ),
      listTransactionsDesc: db.prepare(
        `SELECT t.id, t.categorie_id, t.montant, t.type, t.date_heure, t.libelle, t.lieu, c.nom AS categorie
         FROM transactions t
         INNER JOIN categories c ON c.id = t.categorie_id
         ORDER BY t.date_heure DESC`
      ),
      updateTransaction: db.prepare(
        `UPDATE transactions
         SET categorie_id = @categorieId,
             montant = @montant,
             type = @type,
             date_heure = @dateHeure,
             libelle = @libelle,
             lieu = @lieu
         WHERE id = @id`
      ),
      deleteTransaction: db.prepare('DELETE FROM transactions WHERE id = ?')
    };
  }

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

  function updateCategory(id, name) {
    const numericId = Number(id);
    const trimmed = String(name || '').trim();
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new Error('Identifiant de catégorie invalide');
    }
    if (!trimmed) {
      throw new Error('Le nom de la catégorie est requis');
    }
    const info = db.prepare('UPDATE categories SET nom = ? WHERE id = ?').run(trimmed, numericId);
    if (!info.changes) {
      throw new Error('Catégorie introuvable');
    }
    return getCategories();
  }

  function deleteCategory(id) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new Error('Identifiant de catégorie invalide');
    }
    // Fetch category and related transactions for backup
    const categoryRow = db.prepare('SELECT id, nom FROM categories WHERE id = ?').get(numericId);
    const related = db.prepare(
      'SELECT id, categorie_id, montant, type, date_heure, libelle, lieu FROM transactions WHERE categorie_id = ? ORDER BY date_heure ASC'
    ).all(numericId);

    let backupPath = null;
    if (categoryRow && related.length) {
      try {
        const pad = (n) => String(n).padStart(2, '0');
        const now = new Date();
        const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
        const rand = Math.random().toString(36).slice(2, 6);
        const safeName = String(categoryRow.nom).replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 40) || `cat${numericId}`;
        const backupsDir = path.join(userDataDir, 'backups');
        ensureDirectoryExists(path.join(backupsDir, 'dummy.file'));
        backupPath = path.join(backupsDir, `backup-categorie-${numericId}-${safeName}-${stamp}-${rand}.db`);

        const backupDb = new Database(backupPath);
        initializeSchema(backupDb);
        // Insert only the category and its transactions
        backupDb.prepare('INSERT OR REPLACE INTO categories (id, nom) VALUES (?, ?)').run(categoryRow.id, categoryRow.nom);
        const insertTx = backupDb.prepare(
          'INSERT INTO transactions (id, categorie_id, montant, type, date_heure, libelle, lieu) VALUES (@id, @categorie_id, @montant, @type, @date_heure, @libelle, @lieu)'
        );
        const insertMany = backupDb.transaction((rows) => rows.forEach((r) => insertTx.run(r)));
        insertMany(related);
        backupDb.close();
      } catch (e) {
        // If backup fails, continue with delete but log error
        console.error('Backup avant suppression échoué:', e);
      }
    }

    const info = db.prepare('DELETE FROM categories WHERE id = ?').run(numericId);
    if (!info.changes) {
      throw new Error('Catégorie introuvable');
    }
    return { list: getCategories(), backupPath };
  }

  function categoryHasTransactions(id) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) return false;
    const row = db.prepare('SELECT COUNT(1) AS c FROM transactions WHERE categorie_id = ?').get(numericId);
    return (row?.c || 0) > 0;
  }

  function exportCategory(id, targetPath) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new Error('Identifiant de catégorie invalide');
    }
    if (!targetPath) {
      throw new Error('Chemin de sauvegarde manquant');
    }
    const categoryRow = db.prepare('SELECT id, nom FROM categories WHERE id = ?').get(numericId);
    if (!categoryRow) throw new Error('Catégorie introuvable');
    const related = db.prepare(
      'SELECT id, categorie_id, montant, type, date_heure, libelle, lieu FROM transactions WHERE categorie_id = ? ORDER BY date_heure ASC'
    ).all(numericId);

    const backupDb = new Database(targetPath);
    initializeSchema(backupDb);
    backupDb.prepare('INSERT OR REPLACE INTO categories (id, nom) VALUES (?, ?)').run(categoryRow.id, categoryRow.nom);
    if (related.length) {
      const insertTx = backupDb.prepare(
        'INSERT INTO transactions (id, categorie_id, montant, type, date_heure, libelle, lieu) VALUES (@id, @categorie_id, @montant, @type, @date_heure, @libelle, @lieu)'
      );
      const insertMany = backupDb.transaction((rows) => rows.forEach((r) => insertTx.run(r)));
      insertMany(related);
    }
    backupDb.close();
    return true;
  }

  function createTransaction({ categorieId, montant, type, libelle, dateHeure, lieu }) {
    const numericCategorieId = Number(categorieId);
    if (!Number.isInteger(numericCategorieId) || numericCategorieId <= 0) {
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

    const normalizedLibelle = typeof libelle === 'string' ? libelle.trim() : '';
    const finalLibelle = normalizedLibelle.length ? normalizedLibelle : null;

    const normalizedLieu = typeof lieu === 'string' ? lieu.trim() : '';
    const finalLieu = normalizedLieu.length ? normalizedLieu : finalLibelle;

    const baseDate = dateHeure ? new Date(dateHeure) : new Date();
    if (Number.isNaN(baseDate.getTime())) {
      throw new Error('Date invalide');
    }
    const isoDate = baseDate.toISOString();

    const payload = {
      categorieId: numericCategorieId,
      montant: numericAmount,
      type: normalizedType,
      dateHeure: isoDate,
      libelle: finalLibelle,
      lieu: finalLieu
    };
    const info = statements.insertTransaction.run(payload);
    const row = statements.transactionById.get(info.lastInsertRowid);
    return mapTransaction(row);
  }

  function updateTransaction(id, updates = {}) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new Error('Identifiant de transaction invalide');
    }

    const current = statements.transactionById.get(numericId);
    if (!current) {
      throw new Error('Transaction introuvable');
    }

    const nextCategorieId = updates.categorieId ?? current.categorie_id;
    const numericCategorieId = Number(nextCategorieId);
    if (!Number.isInteger(numericCategorieId) || numericCategorieId <= 0) {
      throw new Error('categorieId invalide');
    }

    const nextMontant = updates.montant ?? current.montant;
    const numericAmount = Number(nextMontant);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Le montant doit être un nombre positif');
    }

    const nextTypeRaw = updates.type ?? current.type;
    const normalizedType = String(nextTypeRaw || '').toUpperCase();
    if (!['ENTREE', 'SORTIE'].includes(normalizedType)) {
      throw new Error("Le type doit être 'ENTREE' ou 'SORTIE'");
    }

    let finalLibelle;
    if (Object.prototype.hasOwnProperty.call(updates, 'libelle')) {
      const normalized = typeof updates.libelle === 'string' ? updates.libelle.trim() : '';
      finalLibelle = normalized.length ? normalized : null;
    } else {
      finalLibelle = current.libelle || null;
    }

    let finalLieu;
    if (Object.prototype.hasOwnProperty.call(updates, 'lieu')) {
      const normalized = typeof updates.lieu === 'string' ? updates.lieu.trim() : '';
      finalLieu = normalized.length ? normalized : null;
    } else if (Object.prototype.hasOwnProperty.call(updates, 'libelle') && finalLibelle) {
      finalLieu = finalLibelle;
    } else {
      finalLieu = current.lieu || null;
    }

    const nextDateRaw = updates.dateHeure ? new Date(updates.dateHeure) : new Date(current.date_heure);
    if (Number.isNaN(nextDateRaw.getTime())) {
      throw new Error('Date invalide');
    }
    const isoDate = nextDateRaw.toISOString();

    const payload = {
      id: numericId,
      categorieId: numericCategorieId,
      montant: numericAmount,
      type: normalizedType,
      dateHeure: isoDate,
      libelle: finalLibelle,
      lieu: finalLieu
    };

    const info = statements.updateTransaction.run(payload);
    if (!info.changes) {
      throw new Error("Impossible de mettre à jour la transaction");
    }

    const row = statements.transactionById.get(numericId);
    return mapTransaction(row);
  }

  function deleteTransaction(id) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new Error('Identifiant de transaction invalide');
    }
    const info = statements.deleteTransaction.run(numericId);
    if (!info.changes) {
      throw new Error('Transaction introuvable');
    }
    return true;
  }

  function listTransactions(options = {}) {
    const direction = String(options.order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const rows = direction === 'ASC' ? statements.listTransactionsAsc.all() : statements.listTransactionsDesc.all();
    const mapped = rows.map(mapTransaction).filter(Boolean);
    if (Number.isInteger(options.limit) && options.limit > 0) {
      const start = Number.isInteger(options.offset) && options.offset > 0 ? options.offset : 0;
      return mapped.slice(start, start + options.limit);
    }
    return mapped;
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

    const counts = {
      totalCount: transactions.length,
      entreeCount: transactions.filter((t) => t.type === 'ENTREE').length,
      sortieCount: transactions.filter((t) => t.type === 'SORTIE').length
    };

    return {
      range,
      transactions,
      totals: computedTotals,
      balance: computedTotals.balance,
      categoryBreakdown,
      type: effectiveType,
      categoryId: hasCategoryFilter ? normalizedCategoryId : null,
      counts
    };
  }

  function getDashboardTotals() {
    const periods = ['day', 'week', 'month', 'quarter', 'semester', 'year'];
    const totals = {};

    periods.forEach((period) => {
      const { totals: periodTotals, balance, counts } = getTransactionsByPeriod({ period });
      totals[period] = {
        entree: periodTotals.entree,
        sortie: periodTotals.sortie,
        balance,
        totalCount: counts.totalCount,
        entreeCount: counts.entreeCount,
        sortieCount: counts.sortieCount
      };
    });

    return totals;
  }

  function getRecentTransactions(limit = 5) {
    const rows = statements.recentTransactions.all({ limit });
    return rows.map(mapTransaction).filter(Boolean);
  }

  function getSettings() {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    // defaults
    if (!('org_name' in map)) map.org_name = 'Ecole Finances';
    if (!('org_logo_path' in map)) map.org_logo_path = '';
    return map;
  }

  function updateSettings(partial = {}) {
    const entries = Object.entries(partial).filter(([k, v]) => v !== undefined);
    if (!entries.length) return getSettings();
    const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    const tx = db.transaction((pairs) => {
      for (const [k, v] of pairs) upsert.run(k, String(v ?? ''));
    });
    tx(entries);
    return getSettings();
  }

  async function exportDatabase(targetPath) {
    if (!targetPath) throw new Error('Chemin de sauvegarde manquant');
    await db.backup(targetPath);
    return true;
  }

  async function importDatabase(sourcePath) {
    if (!sourcePath) throw new Error('Fichier source manquant');
    // Ferme la DB courante, restaure puis rouvre
    try {
      db.close();
    } catch (_) {}
    const source = new Database(sourcePath, { readonly: true });
    await source.backup(dbPath);
    source.close();
    db = new Database(dbPath);
    initializeSchema(db);
    seedCategories(db);
    seedDefaultUser(db);
    rebuildStatements();
    return true;
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

  function generateRecoveryCodes(count = 10) {
    // Nettoyer les anciens codes utilisés
    db.prepare('DELETE FROM recovery_codes WHERE used = 1').run();
    const insert = db.prepare('INSERT INTO recovery_codes (code_hash) VALUES (?)');
    const codes = [];
    for (let i = 0; i < count; i++) {
      const raw = `${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;
      const hash = bcrypt.hashSync(raw, 10);
      insert.run(hash);
      codes.push(raw);
    }
    return codes;
  }

  function updateUserPasswordByRecovery({ code, newPassword }) {
    if (!code || !newPassword) {
      throw new Error('Code de récupération et nouveau mot de passe requis');
    }
    if (newPassword.length < 8) {
      throw new Error('Le nouveau mot de passe doit contenir au moins 8 caractères');
    }
    const rows = db.prepare('SELECT id, code_hash, used FROM recovery_codes WHERE used = 0').all();
    let matchedId = null;
    for (const row of rows) {
      if (bcrypt.compareSync(code, row.code_hash)) {
        matchedId = row.id;
        break;
      }
    }
    if (!matchedId) {
      throw new Error('Code de récupération invalide ou déjà utilisé');
    }
    db.prepare('UPDATE recovery_codes SET used = 1, used_at = CURRENT_TIMESTAMP WHERE id = ?').run(matchedId);
    const hashed = bcrypt.hashSync(newPassword, 10);
    const user = statements.userByUsername.get(DEFAULT_USER.username);
    if (!user) throw new Error('Utilisateur introuvable');
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, user.id);
    return true;
  }

  return {
    verifyUser,
    getCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    listTransactions,
    getTransactionsByPeriod,
    getDashboardTotals,
    getRecentTransactions,
    getSettings,
    updateSettings,
    updateUserPassword,
    generateRecoveryCodes,
    updateUserPasswordByRecovery,
    exportDatabase,
    importDatabase,
    categoryHasTransactions,
    exportCategory
  };
}

module.exports = {
  createDatabaseService,
  resolvePeriodRange
};

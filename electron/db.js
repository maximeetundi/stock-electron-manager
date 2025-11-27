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

const DEFAULT_DOC_HEADER_LEFT = [
  'RÉPUBLIQUE DU CAMEROUN',
  'Paix-Travail-Patrie',
  '************',
  "MINISTÈRE DE L'ÉDUCATION DE BASE",
  '************',
  'DÉLÉGATION RÉGIONALE DU CENTRE',
  '************',
  'DÉLÉGATION DÉPARTEMENTALE DE LA MEFOU ET AFAMBA',
  '************',
  "INSPECTION D'ARRONDISSEMENT DE MFOU"
].join('\n');

const DEFAULT_DOC_HEADER_RIGHT = [
  'REPUBLIC OF CAMEROON',
  'Peace-Work-Fatherland',
  '************',
  'MINISTRY OF BASIC EDUCATION',
  '************',
  'REGIONAL DELEGATION OF CENTRE',
  '************',
  'DIVISIONAL DELEGATION OF MEFOU-AFAMBA',
  '************',
  'SUB DIVISIONAL INSPECTION OF MFOU'
].join('\n');

const DEFAULT_DOC_HEADER_CENTER_TITLE = 'COMPLEXE SCOLAIRE SAINT-MICHEL ARCHANGE DE MINKAN';
const DEFAULT_DOC_HEADER_CENTER_SUBTITLE = 'BP. 10247 Yaoundé • Tél. : 242 04 15 16';

const DEFAULT_DOC_FOOTER_SIGNERS = JSON.stringify([
  { slot: 'left', label: 'Directeur Administratif et Financier', name: '' },
  { slot: 'center', label: 'Responsable Logistique', name: '' },
  { slot: 'right', label: 'Comptable', name: '' }
]);

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
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  const hasTransactionCreatedAt = transactionColumns.some((column) => column.name === 'created_at');
  if (!hasTransactionCreatedAt) {
    db.prepare('ALTER TABLE transactions ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP').run();
  }

  // Tables pour la gestion de stock (version 1.2)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS fournisseurs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL UNIQUE,
      adresse TEXT,
      telephone TEXT,
      email TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      designation TEXT NOT NULL,
      unite TEXT NOT NULL DEFAULT 'unité',
      prix_unitaire REAL NOT NULL DEFAULT 0,
      quantite_stock INTEGER NOT NULL DEFAULT 0,
      quantite_min INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS bons_commande (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT NOT NULL UNIQUE,
      fournisseur_id INTEGER,
      date_commande TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      statut TEXT NOT NULL DEFAULT 'EN_COURS' CHECK (statut IN ('EN_COURS', 'LIVREE', 'ANNULEE')),
      montant_total REAL NOT NULL DEFAULT 0,
      observations TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id) ON DELETE SET NULL ON UPDATE CASCADE
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS bons_commande_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bon_commande_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'article' CHECK (type IN ('article', 'service')),
      article_id INTEGER,
      designation TEXT NOT NULL DEFAULT '',
      unite TEXT NOT NULL DEFAULT 'unité',
      quantite INTEGER NOT NULL,
      prix_unitaire REAL NOT NULL,
      montant REAL NOT NULL,
      affecte_stock INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (bon_commande_id) REFERENCES bons_commande(id) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `).run();

  // Migration : ajouter les colonnes si elles n'existent pas
  try {
    db.prepare(`ALTER TABLE bons_commande_items ADD COLUMN type TEXT NOT NULL DEFAULT 'article'`).run();
  } catch (e) { /* Colonne existe déjà */ }
  
  try {
    db.prepare(`ALTER TABLE bons_commande_items ADD COLUMN designation TEXT NOT NULL DEFAULT ''`).run();
  } catch (e) { /* Colonne existe déjà */ }
  
  try {
    db.prepare(`ALTER TABLE bons_commande_items ADD COLUMN unite TEXT NOT NULL DEFAULT 'unité'`).run();
  } catch (e) { /* Colonne existe déjà */ }
  
  try {
    db.prepare(`ALTER TABLE bons_commande_items ADD COLUMN affecte_stock INTEGER NOT NULL DEFAULT 1`).run();
  } catch (e) { /* Colonne existe déjà */ }

  // Migration: rendre fournisseur_id optionnel dans bons_commande
  try {
    const columns = db.prepare(`PRAGMA table_info(bons_commande)`).all();
    const fournisseurColumn = columns.find((col) => col.name === 'fournisseur_id');

    if (fournisseurColumn && fournisseurColumn.notnull === 1) {
      const migrateNullableFournisseur = db.transaction(() => {
        db.prepare(`
          CREATE TABLE IF NOT EXISTS bons_commande__tmp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero TEXT NOT NULL UNIQUE,
            fournisseur_id INTEGER,
            date_commande TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            statut TEXT NOT NULL DEFAULT 'EN_COURS' CHECK (statut IN ('EN_COURS', 'LIVREE', 'ANNULEE')),
            montant_total REAL NOT NULL DEFAULT 0,
            observations TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id) ON DELETE SET NULL ON UPDATE CASCADE
          )
        `).run();

        db.prepare(`
          INSERT INTO bons_commande__tmp (id, numero, fournisseur_id, date_commande, statut, montant_total, observations, created_at)
          SELECT id, numero, fournisseur_id, date_commande, statut, montant_total, observations, created_at
          FROM bons_commande
        `).run();

        db.prepare(`DROP TABLE bons_commande`).run();
        db.prepare(`ALTER TABLE bons_commande__tmp RENAME TO bons_commande`).run();
      });

      migrateNullableFournisseur();
    }
  } catch (err) {
    console.error('Migration bons_commande nullable échouée:', err);
  }

  // Migration: articles - unités de conditionnement
  try {
    db.prepare(`ALTER TABLE articles ADD COLUMN unite_conditionnement TEXT`).run();
  } catch (e) { /* Colonne existe déjà */ }

  try {
    db.prepare(`ALTER TABLE articles ADD COLUMN qte_par_conditionnement INTEGER NOT NULL DEFAULT 1`).run();
  } catch (e) { /* Colonne existe déjà */ }

  // Table des mouvements de stock
  db.prepare(`
    CREATE TABLE IF NOT EXISTS mouvements_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('ENTREE', 'SORTIE', 'AJUSTEMENT')),
      quantite INTEGER NOT NULL,
      reference TEXT,
      motif TEXT,
      date_mouvement TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `).run();

  // Migration: mouvements_stock - conserver l'unité et la quantité saisies
  try {
    db.prepare(`ALTER TABLE mouvements_stock ADD COLUMN quantite_saisie INTEGER`).run();
  } catch (e) { /* Colonne existe déjà */ }
  try {
    db.prepare(`ALTER TABLE mouvements_stock ADD COLUMN unite_saisie TEXT`).run();
  } catch (e) { /* Colonne existe déjà */ }
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
    createdAt: row.created_at,
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
      `SELECT t.id, t.categorie_id, t.montant, t.type, t.date_heure, t.libelle, t.lieu, t.created_at, c.nom AS categorie
       FROM transactions t
       INNER JOIN categories c ON c.id = t.categorie_id
       ORDER BY t.created_at DESC
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
        `SELECT t.id, t.categorie_id, t.montant, t.type, t.date_heure, t.libelle, t.lieu, t.created_at, c.nom AS categorie
         FROM transactions t
         INNER JOIN categories c ON c.id = t.categorie_id
         ORDER BY t.created_at DESC
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
    if (!('doc_header_left' in map)) map.doc_header_left = DEFAULT_DOC_HEADER_LEFT;
    if (!('doc_header_right' in map)) map.doc_header_right = DEFAULT_DOC_HEADER_RIGHT;
    if (!('doc_header_center_title' in map)) map.doc_header_center_title = DEFAULT_DOC_HEADER_CENTER_TITLE;
    if (!('doc_header_center_subtitle' in map)) map.doc_header_center_subtitle = DEFAULT_DOC_HEADER_CENTER_SUBTITLE;
    if (!('doc_header_emblem_path' in map)) map.doc_header_emblem_path = '';
    if (!('doc_footer_signers' in map)) map.doc_footer_signers = DEFAULT_DOC_FOOTER_SIGNERS;
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

  // ========== GESTION DES FOURNISSEURS ==========
  function getFournisseurs() {
    return db.prepare('SELECT * FROM fournisseurs ORDER BY nom ASC').all();
  }

  function addFournisseur({ nom, adresse, telephone, email }) {
    if (!nom?.trim()) throw new Error('Le nom du fournisseur est requis');
    const info = db.prepare(
      'INSERT INTO fournisseurs (nom, adresse, telephone, email) VALUES (?, ?, ?, ?)'
    ).run(nom.trim(), adresse?.trim() || null, telephone?.trim() || null, email?.trim() || null);
    return db.prepare('SELECT * FROM fournisseurs WHERE id = ?').get(info.lastInsertRowid);
  }

  function updateFournisseur(id, { nom, adresse, telephone, email }) {
    if (!nom?.trim()) throw new Error('Le nom du fournisseur est requis');
    const info = db.prepare(
      'UPDATE fournisseurs SET nom = ?, adresse = ?, telephone = ?, email = ? WHERE id = ?'
    ).run(nom.trim(), adresse?.trim() || null, telephone?.trim() || null, email?.trim() || null, id);
    if (!info.changes) throw new Error('Fournisseur introuvable');
    return db.prepare('SELECT * FROM fournisseurs WHERE id = ?').get(id);
  }

  function deleteFournisseur(id) {
    const info = db.prepare('DELETE FROM fournisseurs WHERE id = ?').run(id);
    if (!info.changes) throw new Error('Fournisseur introuvable');
    return true;
  }

  // ========== GESTION DES ARTICLES ==========
  function getArticles() {
    return db.prepare('SELECT * FROM articles ORDER BY designation ASC').all();
  }

  function getArticleById(id) {
    return db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  }

  function addArticle({ code, designation, unite, prix_unitaire, quantite_stock, quantite_min, unite_conditionnement, qte_par_conditionnement }) {
    if (!code?.trim()) throw new Error('Le code article est requis');
    if (!designation?.trim()) throw new Error('La désignation est requise');
    const info = db.prepare(
      `INSERT INTO articles (code, designation, unite, prix_unitaire, quantite_stock, quantite_min, unite_conditionnement, qte_par_conditionnement)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      code.trim(),
      designation.trim(),
      unite?.trim() || 'unité',
      Number(prix_unitaire) || 0,
      Number(quantite_stock) || 0,
      Number(quantite_min) || 0,
      (unite_conditionnement?.trim() || null),
      Number(qte_par_conditionnement) || 1
    );
    return db.prepare('SELECT * FROM articles WHERE id = ?').get(info.lastInsertRowid);
  }

  function updateArticle(id, { code, designation, unite, prix_unitaire, quantite_min, unite_conditionnement, qte_par_conditionnement }) {
    if (!code?.trim()) throw new Error('Le code article est requis');
    if (!designation?.trim()) throw new Error('La désignation est requise');
    const info = db.prepare(
      `UPDATE articles 
       SET code = ?, designation = ?, unite = ?, prix_unitaire = ?, quantite_min = ?, unite_conditionnement = ?, qte_par_conditionnement = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      code.trim(),
      designation.trim(),
      unite?.trim() || 'unité',
      Number(prix_unitaire) || 0,
      Number(quantite_min) || 0,
      (unite_conditionnement?.trim() || null),
      Number(qte_par_conditionnement) || 1,
      id
    );
    if (!info.changes) throw new Error('Article introuvable');
    return db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  }

  function deleteArticle(id) {
    const info = db.prepare('DELETE FROM articles WHERE id = ?').run(id);
    if (!info.changes) throw new Error('Article introuvable');
    return true;
  }

  function getArticlesAlertStock() {
    return db.prepare('SELECT * FROM articles WHERE quantite_stock <= quantite_min ORDER BY designation ASC').all();
  }

  // ========== GESTION DES MOUVEMENTS DE STOCK ==========
  function addMouvementStock({ article_id, type, quantite, reference, motif, unite_saisie, date_mouvement }) {
    if (!['ENTREE', 'SORTIE', 'AJUSTEMENT'].includes(type)) {
      throw new Error('Type de mouvement invalide');
    }
    const article = getArticleById(article_id);
    if (!article) throw new Error('Article introuvable');

    const qte = Number(quantite) || 0;
    let newStock = article.quantite_stock;

    // Conversion d'unités: base = article.unite
    const baseUnite = String(article.unite || '').trim();
    const packUnite = String(article.unite_conditionnement || '').trim();
    const packSize = Number(article.qte_par_conditionnement || 1) || 1;
    const saisieUnite = String(unite_saisie || '').trim();

    // Conversion vers l'unité de base (article.unite)
    // Convention: l'unité (article.unite) est l'unité de stock (ex: Carton)
    // et l'unité de conditionnement (article.unite_conditionnement) est l'unité interne (ex: Ram)
    // 1 unité (Carton) = N unités de conditionnement (Ram)
    let qteEffective = qte;
    if (saisieUnite && packUnite && packSize > 0 && saisieUnite.toLowerCase() === packUnite.toLowerCase()) {
      qteEffective = qte / packSize; // saisie en conditionnement (ram) => convertir en base (carton)
    } else {
      // saisie en unité de base ou unité inconnue => pas de conversion
      qteEffective = qte;
    }
    
    if (type === 'ENTREE') {
      newStock += qteEffective;
    } else if (type === 'SORTIE') {
      newStock -= qteEffective;
      if (newStock < 0) throw new Error('Stock insuffisant');
    } else if (type === 'AJUSTEMENT') {
      newStock = qteEffective;
    }

    // Formater la date: si fournie, l'utiliser; sinon utiliser la date actuelle
    const dateMouvement = date_mouvement ? new Date(date_mouvement).toISOString() : new Date().toISOString();

    const transaction = db.transaction(() => {
      const info = db.prepare(
        'INSERT INTO mouvements_stock (article_id, type, quantite, reference, motif, quantite_saisie, unite_saisie, date_mouvement) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        article_id,
        type,
        qteEffective,
        reference?.trim() || null,
        motif?.trim() || null,
        qte,
        saisieUnite || baseUnite || null,
        dateMouvement
      );
      
      db.prepare('UPDATE articles SET quantite_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newStock, article_id);
      
      return info.lastInsertRowid;
    });

    const mouvementId = transaction();
    return db.prepare('SELECT * FROM mouvements_stock WHERE id = ?').get(mouvementId);
  }

  function getMouvementsStock(article_id = null, limit = 50) {
    if (article_id) {
      return db.prepare(
        `SELECT m.*, a.designation, a.code, a.unite AS article_unite
         FROM mouvements_stock m
         INNER JOIN articles a ON a.id = m.article_id
         WHERE m.article_id = ?
         ORDER BY m.date_mouvement DESC
         LIMIT ?`
      ).all(article_id, limit);
    }
    return db.prepare(
      `SELECT m.*, a.designation, a.code, a.unite AS article_unite
       FROM mouvements_stock m
       INNER JOIN articles a ON a.id = m.article_id
       ORDER BY m.date_mouvement DESC
       LIMIT ?`
    ).all(limit);
  }

  function updateMouvementStock(id, { quantite, reference, motif, date_mouvement }) {
    const mouvement = db.prepare('SELECT * FROM mouvements_stock WHERE id = ?').get(id);
    if (!mouvement) throw new Error('Mouvement introuvable');

    const dateMouvement = date_mouvement ? new Date(date_mouvement).toISOString() : mouvement.date_mouvement;

    db.prepare(
      'UPDATE mouvements_stock SET quantite = ?, reference = ?, motif = ?, date_mouvement = ? WHERE id = ?'
    ).run(
      quantite !== undefined ? quantite : mouvement.quantite,
      reference !== undefined ? (reference?.trim() || null) : mouvement.reference,
      motif !== undefined ? (motif?.trim() || null) : mouvement.motif,
      dateMouvement,
      id
    );

    return db.prepare('SELECT * FROM mouvements_stock WHERE id = ?').get(id);
  }

  function deleteMouvementStock(id) {
    const mouvement = db.prepare('SELECT * FROM mouvements_stock WHERE id = ?').get(id);
    if (!mouvement) throw new Error('Mouvement introuvable');

    const article = getArticleById(mouvement.article_id);
    if (!article) throw new Error('Article introuvable');

    // Annuler l'effet du mouvement sur le stock
    let newStock = article.quantite_stock;
    if (mouvement.type === 'ENTREE') {
      newStock -= mouvement.quantite;
    } else if (mouvement.type === 'SORTIE') {
      newStock += mouvement.quantite;
    } else if (mouvement.type === 'AJUSTEMENT') {
      // Pour un ajustement, on ne peut pas vraiment annuler sans connaître l'ancien stock
      // On va juste supprimer le mouvement
    }

    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM mouvements_stock WHERE id = ?').run(id);
      db.prepare('UPDATE articles SET quantite_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newStock, mouvement.article_id);
    });

    transaction();
    return true;
  }

  // ========== GESTION DES BONS DE COMMANDE ==========
  function generateNumeroBC() {
    const year = new Date().getFullYear();
    const lastBC = db.prepare(
      `SELECT numero FROM bons_commande 
       WHERE numero LIKE ? 
       ORDER BY id DESC LIMIT 1`
    ).get(`BC-${year}-%`);
    
    if (!lastBC) return `BC-${year}-001`;
    
    const match = lastBC.numero.match(/-(\d+)$/);
    const nextNum = match ? parseInt(match[1]) + 1 : 1;
    return `BC-${year}-${String(nextNum).padStart(3, '0')}`;
  }

  function getBonsCommande() {
    return db.prepare(
      `SELECT bc.*, f.nom as fournisseur_nom
       FROM bons_commande bc
       LEFT JOIN fournisseurs f ON f.id = bc.fournisseur_id
       ORDER BY bc.date_commande DESC`
    ).all();
  }

  function getBonCommandeById(id) {
    const bon = db.prepare(
      `SELECT bc.*, f.nom as fournisseur_nom, f.adresse as fournisseur_adresse, 
              f.telephone as fournisseur_telephone, f.email as fournisseur_email
       FROM bons_commande bc
       LEFT JOIN fournisseurs f ON f.id = bc.fournisseur_id
       WHERE bc.id = ?`
    ).get(id);
    
    if (!bon) return null;
    
    const items = db.prepare(
      `SELECT bci.*, 
              COALESCE(a.code, 'SERVICE') as code,
              COALESCE(a.designation, bci.designation) as designation,
              COALESCE(a.unite, bci.unite) as unite
       FROM bons_commande_items bci
       LEFT JOIN articles a ON a.id = bci.article_id
       WHERE bci.bon_commande_id = ?`
    ).all(id);
    
    return { ...bon, items };
  }

  function createBonCommande({ fournisseur_id, date_commande, observations, items }) {
    if (!items || !items.length) throw new Error('Le bon de commande doit contenir au moins une ligne');

    const numero = generateNumeroBC();
    const montant_total = items.reduce((sum, item) => sum + (item.quantite * item.prix_unitaire), 0);
    const fournisseurValue = fournisseur_id || null;

    const transaction = db.transaction(() => {
      const bcInfo = db.prepare(
        `INSERT INTO bons_commande (numero, fournisseur_id, date_commande, montant_total, observations)
         VALUES (?, ?, ?, ?, ?)`
      ).run(
        numero,
        fournisseurValue,
        date_commande || new Date().toISOString(),
        montant_total,
        observations?.trim() || null
      );

      const bonId = bcInfo.lastInsertRowid;
      const insertItem = db.prepare(
        `INSERT INTO bons_commande_items 
         (bon_commande_id, type, article_id, designation, unite, quantite, prix_unitaire, montant, affecte_stock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      items.forEach(item => {
        const montant = item.quantite * item.prix_unitaire;
        const type = item.type || 'article';
        const affecte_stock = item.affecte_stock !== false ? 1 : 0;
        
        insertItem.run(
          bonId, 
          type,
          item.article_id || null, 
          item.designation || '',
          item.unite || 'unité',
          item.quantite, 
          item.prix_unitaire, 
          montant,
          affecte_stock
        );
      });

      return bonId;
    });

    const bonId = transaction();
    return getBonCommandeById(bonId);
  }

  function updateBonCommandeStatut(id, statut) {
    if (!['EN_COURS', 'LIVREE', 'ANNULEE'].includes(statut)) {
      throw new Error('Statut invalide');
    }

    const transaction = db.transaction(() => {
      const info = db.prepare('UPDATE bons_commande SET statut = ? WHERE id = ?').run(statut, id);
      if (!info.changes) throw new Error('Bon de commande introuvable');

      // Si le statut est LIVREE, mettre à jour le stock (uniquement pour les articles)
      if (statut === 'LIVREE') {
        const items = db.prepare(
          `SELECT article_id, quantite, unite FROM bons_commande_items 
           WHERE bon_commande_id = ? AND affecte_stock = 1 AND article_id IS NOT NULL`
        ).all(id);

        const bon = db.prepare('SELECT numero FROM bons_commande WHERE id = ?').get(id);

        items.forEach(item => {
          addMouvementStock({
            article_id: item.article_id,
            type: 'ENTREE',
            quantite: item.quantite,
            unite_saisie: item.unite,
            reference: bon.numero,
            motif: 'Réception bon de commande'
          });
        });
      }

      return true;
    });

    transaction();
    return getBonCommandeById(id);
  }

  function deleteBonCommande(id) {
    const bon = db.prepare('SELECT statut FROM bons_commande WHERE id = ?').get(id);
    if (!bon) throw new Error('Bon de commande introuvable');
    if (bon.statut === 'LIVREE') throw new Error('Impossible de supprimer un bon de commande livré');

    const info = db.prepare('DELETE FROM bons_commande WHERE id = ?').run(id);
    if (!info.changes) throw new Error('Bon de commande introuvable');
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
    exportCategory,
    // Nouvelles fonctions version 1.2
    getFournisseurs,
    addFournisseur,
    updateFournisseur,
    deleteFournisseur,
    getArticles,
    getArticleById,
    addArticle,
    updateArticle,
    deleteArticle,
    getArticlesAlertStock,
    addMouvementStock,
    getMouvementsStock,
    updateMouvementStock,
    deleteMouvementStock,
    getBonsCommande,
    getBonCommandeById,
    createBonCommande,
    updateBonCommandeStatut,
    deleteBonCommande
  };
}

module.exports = {
  createDatabaseService,
  resolvePeriodRange
};

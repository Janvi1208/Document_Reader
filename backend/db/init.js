const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../data');
const DB_PATH = path.join(DATA_DIR, 'biztel.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let _sqlDb = null;
let _wrapper = null;

function saveDb() {
  if (!_sqlDb) return;
  try {
    const data = _sqlDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) { console.error('DB save error:', e.message); }
}

function createWrapper(db) {
  return {
    prepare: (sql) => ({
      run: (...params) => {
        db.run(sql, params.length ? params : undefined);
        saveDb();
        return { changes: 1 };
      },
      get: (...params) => {
        try {
          const stmt = db.prepare(sql);
          if (params.length) stmt.bind(params);
          const row = stmt.step() ? stmt.getAsObject() : undefined;
          stmt.free();
          return row;
        } catch(e) { return undefined; }
      },
      all: (...params) => {
        const results = [];
        try {
          const stmt = db.prepare(sql);
          if (params.length) stmt.bind(params);
          while (stmt.step()) results.push(stmt.getAsObject());
          stmt.free();
        } catch(e) { console.error('SQL all error:', e.message, sql); }
        return results;
      }
    }),
    exec: (sql) => { db.run(sql); saveDb(); }
  };
}

async function initDb() {
  if (_wrapper) return _wrapper;
  const SQL = await initSqlJs();
  
  if (fs.existsSync(DB_PATH)) {
    const fileData = fs.readFileSync(DB_PATH);
    _sqlDb = new SQL.Database(fileData);
  } else {
    _sqlDb = new SQL.Database();
  }

  setInterval(saveDb, 3000);
  process.on('exit', saveDb);
  process.on('SIGINT', () => { saveDb(); process.exit(0); });
  process.on('SIGTERM', () => { saveDb(); process.exit(0); });

  // Create tables
  _sqlDb.run(`CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    upload_date TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  _sqlDb.run(`CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    upload_id TEXT NOT NULL,
    date TEXT,
    shift TEXT,
    employee_number TEXT,
    operation_code TEXT,
    machine_number TEXT,
    work_order_number TEXT,
    quantity_produced REAL,
    time_taken REAL,
    operator_name TEXT,
    product_code TEXT,
    raw_extracted TEXT,
    confidence_scores TEXT,
    validation_errors TEXT,
    status TEXT DEFAULT 'pending_review',
    reviewed_by TEXT,
    reviewed_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  saveDb();
  _wrapper = createWrapper(_sqlDb);
  return _wrapper;
}

function getDbSync() {
  if (!_wrapper) throw new Error('DB not initialized. Server must await initDb() before handling requests.');
  return _wrapper;
}

module.exports = { initDb, getDbSync };

// Add users table if not exists (called after initDb())
async function ensureUsersTable() {
  const db = getDbSync();
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'operator',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}

module.exports.ensureUsersTable = ensureUsersTable;

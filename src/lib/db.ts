import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../../data/contacts.db');

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initializeDb();
  }
  return db;
}

function initializeDb() {
  const database = getDb();
  
  database.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL,
      mensaje TEXT NOT NULL,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'nuevo'
    );

    CREATE TABLE IF NOT EXISTS rate_limit (
      ip TEXT PRIMARY KEY,
      count INTEGER DEFAULT 1,
      reset_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function saveContact(nombre: string, email: string, mensaje: string, ip?: string) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO contacts (nombre, email, mensaje, ip) VALUES (?, ?, ?, ?)'
  );
  return stmt.run(nombre, email, mensaje, ip || 'unknown');
}

export function checkRateLimit(ip: string, maxAttempts = 5, windowHours = 24) {
  const db = getDb();
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

  // Limpiar entradas antiguas
  db.prepare('DELETE FROM rate_limit WHERE reset_at < ?').run(windowStart.toISOString());

  const record = db.prepare('SELECT count FROM rate_limit WHERE ip = ?').get(ip) as any;
  
  if (!record) {
    db.prepare('INSERT INTO rate_limit (ip, count, reset_at) VALUES (?, 1, ?)').run(
      ip,
      now.toISOString()
    );
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  db.prepare('UPDATE rate_limit SET count = count + 1 WHERE ip = ?').run(ip);
  return { allowed: true, remaining: maxAttempts - record.count - 1 };
}

export function getAllContacts() {
  const db = getDb();
  return db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
}

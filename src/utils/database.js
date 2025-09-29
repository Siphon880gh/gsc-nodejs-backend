import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'gsc_auth.db');

// Initialize database connection
let db = null;

export function getDatabase() {
  if (!db) {
    db = new Database(DB_PATH);
    initializeTables();
  }
  return db;
}

// Initialize database tables
function initializeTables() {
  // Create oauth_tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      scope TEXT NOT NULL,
      token_type TEXT DEFAULT 'Bearer',
      expiry_date INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create selected_sites table
  db.exec(`
    CREATE TABLE IF NOT EXISTS selected_sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      site_url TEXT NOT NULL,
      selected_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Store OAuth2 tokens for a user
export function storeTokensForUser(userId, tokens) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO oauth_tokens 
    (user_id, access_token, refresh_token, scope, token_type, expiry_date, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  return stmt.run(
    userId,
    tokens.access_token,
    tokens.refresh_token,
    tokens.scope,
    tokens.token_type || 'Bearer',
    tokens.expiry_date
  );
}

// Get OAuth2 tokens for a user
export function getTokensForUser(userId) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM oauth_tokens 
    WHERE user_id = ? 
    ORDER BY updated_at DESC 
    LIMIT 1
  `);
  
  return stmt.get(userId);
}

// Store selected site for a user
export function storeSiteForUser(userId, siteUrl) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO selected_sites 
    (user_id, site_url, selected_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `);
  
  return stmt.run(userId, siteUrl);
}

// Get selected site for a user
export function getSiteForUser(userId) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM selected_sites 
    WHERE user_id = ? 
    ORDER BY selected_at DESC 
    LIMIT 1
  `);
  
  const result = stmt.get(userId);
  return result ? result.site_url : null;
}

// Close database connection
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

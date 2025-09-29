import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDatabase } from '../utils/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate a JWT token for a user
 */
export function generateToken(userId) {
  return jwt.sign(
    { userId, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify a JWT token and extract user ID
 */
export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Authentication middleware for Express routes
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required. Include Authorization header with Bearer token.'
    });
  }

  try {
    const userId = verifyToken(token);
    req.userId = userId;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

/**
 * Store user session in database
 */
export function storeUserSession(userId, token) {
  const db = getDatabase();
  
  // Create sessions table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      is_active BOOLEAN DEFAULT 1
    )
  `);

  // Hash the token for storage (we'll store a hash, not the actual token)
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  // Calculate expiration time
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  
  // Store the session
  const stmt = db.prepare(`
    INSERT INTO user_sessions (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `);
  
  stmt.run(userId, tokenHash, expiresAt.toISOString());
}

/**
 * Validate user session from database
 */
export function validateUserSession(token) {
  const db = getDatabase();
  
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const stmt = db.prepare(`
    SELECT user_id, expires_at FROM user_sessions 
    WHERE token_hash = ? AND is_active = 1 AND expires_at > datetime('now')
  `);
  
  const session = stmt.get(tokenHash);
  
  if (!session) {
    throw new Error('Invalid or expired session');
  }
  
  return session.user_id;
}

/**
 * Revoke user session (logout)
 */
export function revokeUserSession(token) {
  const db = getDatabase();
  
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const stmt = db.prepare(`
    UPDATE user_sessions 
    SET is_active = 0 
    WHERE token_hash = ?
  `);
  
  const result = stmt.run(tokenHash);
  return result.changes > 0;
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions() {
  try {
    const db = getDatabase();
    
    // Check if table exists first
    const tableCheck = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='user_sessions'
    `).get();
    
    if (!tableCheck) {
      // Table doesn't exist yet, no cleanup needed
      return 0;
    }
    
    const stmt = db.prepare(`
      UPDATE user_sessions 
      SET is_active = 0 
      WHERE expires_at <= datetime('now')
    `);
    
    const result = stmt.run();
    return result.changes;
  } catch (error) {
    // If there's any error, just return 0 - cleanup is not critical
    console.log('Warning: Could not cleanup expired sessions:', error.message);
    return 0;
  }
}

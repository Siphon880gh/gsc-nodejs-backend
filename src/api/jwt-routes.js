#!/usr/bin/env node
import express from "express";
import { loadConfig } from "../utils/config.js";
import { getOAuth2Client, getAvailableSites } from "../datasources/searchconsole.js";
import { runQuery } from "../core/query-runner.js";
import { 
  saveSelectedSite, 
  getSelectedSite, 
  hasValidSiteSelection, 
  clearSelectedSite, 
  getVerifiedSites, 
  signOut 
} from "../utils/site-manager.js";
import { ensureAuthentication } from "../utils/auth-helper.js";
import { applySorting } from "../cli/renderers.js";
import { stringify } from "csv-stringify/sync";
import { 
  generateToken, 
  authenticateToken, 
  storeUserSession, 
  validateUserSession, 
  revokeUserSession,
  cleanupExpiredSessions 
} from "./auth-middleware.js";
import { getDatabase, storeTokensForUser, getTokensForUser } from "../utils/database.js";

const router = express.Router();

// Helper function to get user ID from authenticated request
function getUserId(req) {
  return req.userId;
}

// Helper function to set user ID in config
function setUserId(userId) {
  process.env.USER_ID = userId;
}

// Helper function to get user-specific OAuth client
async function getUserOAuthClient(userId, cfg) {
  const { OAuth2Client } = await import('google-auth-library');
  const { readFileSync } = await import('fs');
  
  const credentialsPath = cfg.sources.searchconsole.credentialsFile || process.env.GSC_CREDENTIALS_FILE;
  const credentialsContent = readFileSync(credentialsPath, 'utf8');
  const credentials = JSON.parse(credentialsContent);
  
  const oauth2Client = new OAuth2Client(
    credentials.web.client_id,
    credentials.web.client_secret,
    credentials.web.redirect_uris[0]
  );
  
  // Get stored tokens for this user
  const tokens = getTokensForUser(userId);
  if (tokens) {
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date
    });
    
    // Test if tokens are still valid
    try {
      await oauth2Client.getAccessToken();
      return oauth2Client;
    } catch (error) {
      console.log("Stored tokens expired, need to re-authenticate");
      throw new Error("OAuth tokens expired. Please re-authenticate.");
    }
  } else {
    throw new Error("No OAuth tokens found for user. Please authenticate first.");
  }
}

// Helper function to handle errors
function handleError(res, error, statusCode = 500) {
  console.error("API Error:", error);
  res.status(statusCode).json({
    success: false,
    error: error.message || "Internal server error"
  });
}

// User management endpoints
router.post("/api/auth/signup", async (req, res) => {
  try {
    const { userId, email, name } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        error: "userId and email are required"
      });
    }
    
    const db = getDatabase();
    
    // Create users table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      )
    `);
    
    // Check if user already exists
    const existingUser = db.prepare(`
      SELECT user_id FROM users WHERE user_id = ? OR email = ?
    `).get(userId, email);
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "User already exists with this userId or email"
      });
    }
    
    // Create new user
    const stmt = db.prepare(`
      INSERT INTO users (user_id, email, name, is_active)
      VALUES (?, ?, ?, 1)
    `);
    
    const result = stmt.run(userId, email, name || null);
    
    res.status(201).json({
      success: true,
      message: "User created successfully",
      userId: userId,
      email: email
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

router.post("/api/auth/login", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required in request body"
      });
    }
    
    // Check if user exists
    const db = getDatabase();
    const user = db.prepare(`
      SELECT user_id FROM users WHERE user_id = ? AND is_active = 1
    `).get(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found or inactive"
      });
    }
    
    setUserId(userId);
    const cfg = loadConfig();
    
    // Check if user already has OAuth tokens
    const existingTokens = getTokensForUser(userId);
    if (!existingTokens) {
      return res.status(401).json({
        success: false,
        error: "No OAuth tokens found. Please authenticate with Google first by visiting the OAuth endpoint."
      });
    }
    
    // Generate JWT token
    const token = generateToken(userId);
    
    // Store session in database
    storeUserSession(userId, token);
    
    res.json({
      success: true,
      message: "Authentication successful",
      token: token,
      userId: userId,
      expiresIn: "24h"
    });
  } catch (error) {
    handleError(res, error, 401);
  }
});

router.post("/api/auth/oauth", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required in request body"
      });
    }
    
    // Check if user exists
    const db = getDatabase();
    const user = db.prepare(`
      SELECT user_id FROM users WHERE user_id = ? AND is_active = 1
    `).get(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found or inactive"
      });
    }
    
    setUserId(userId);
    const cfg = loadConfig();
    
    // Set a dummy site URL for authentication
    const originalSiteUrl = process.env.GSC_SITE_URL;
    process.env.GSC_SITE_URL = "https://example.com/";
    
    const auth = await getOAuth2Client(cfg.sources.searchconsole);
    
    // Store OAuth tokens for this user
    if (auth.credentials) {
      storeTokensForUser(userId, auth.credentials);
    }
    
    // Restore original site URL
    if (originalSiteUrl) {
      process.env.GSC_SITE_URL = originalSiteUrl;
    } else {
      delete process.env.GSC_SITE_URL;
    }
    
    res.json({
      success: true,
      message: "OAuth authentication successful",
      userId: userId
    });
  } catch (error) {
    handleError(res, error, 401);
  }
});

router.post("/api/auth/logout", authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization'].split(' ')[1];
    const userId = getUserId(req);
    
    // Revoke session
    revokeUserSession(token);
    
    // Clear user data
    setUserId(userId);
    const cleared = await signOut();
    
    res.json({
      success: true,
      message: "Logout successful",
      cleared: cleared
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

router.delete("/api/auth/user", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const db = getDatabase();
    
    // Delete user from database
    const stmt = db.prepare(`
      DELETE FROM users WHERE user_id = ?
    `);
    
    const result = stmt.run(userId);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }
    
    // Delete all sessions for this user
    const deleteSessionsStmt = db.prepare(`
      DELETE FROM user_sessions WHERE user_id = ?
    `);
    deleteSessionsStmt.run(userId);
    
    // Clear user data
    setUserId(userId);
    await signOut();
    
    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// User status endpoint
router.get("/api/status", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const cfg = loadConfig();
    const currentSite = getSelectedSite();
    const hasValidSite = hasValidSiteSelection();
    
    let authStatus = false;
    try {
      await getUserOAuthClient(userId, cfg);
      authStatus = true;
    } catch (error) {
      authStatus = false;
    }
    
    res.json({
      success: true,
      userId: userId,
      authenticated: authStatus,
      currentSite: currentSite,
      hasValidSite: hasValidSite,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// Site management endpoints
router.get("/api/sites", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const cfg = loadConfig();
    const auth = await getUserOAuthClient(userId, cfg);
    const sites = await getAvailableSites(cfg, auth);
    
    const currentSite = getSelectedSite();
    
    res.json({
      success: true,
      sites: sites,
      currentSite: currentSite,
      total: sites.length
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

router.get("/api/sites/verified", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const cfg = loadConfig();
    const auth = await getUserOAuthClient(userId, cfg);
    const verifiedSites = await getVerifiedSites(cfg, auth);
    
    res.json({
      success: true,
      sites: verifiedSites,
      total: verifiedSites.length
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

router.post("/api/sites/select", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const { siteUrl } = req.body;
    if (!siteUrl) {
      return res.status(400).json({
        success: false,
        error: "siteUrl is required in request body"
      });
    }
    
    const cfg = loadConfig();
    await ensureAuthentication(cfg);
    
    // Verify the site exists and user has access
    const verifiedSites = await getVerifiedSites(cfg);
    const siteExists = verifiedSites.some(site => site.siteUrl === siteUrl);
    
    if (!siteExists) {
      return res.status(400).json({
        success: false,
        error: "Site not found or you don't have access to it"
      });
    }
    
    const success = saveSelectedSite(siteUrl);
    if (success) {
      res.json({
        success: true,
        message: `Selected site: ${siteUrl}`,
        selectedSite: siteUrl
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to save site selection"
      });
    }
  } catch (error) {
    handleError(res, error, 500);
  }
});

router.get("/api/sites/current", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const currentSite = getSelectedSite();
    const hasValidSite = hasValidSiteSelection();
    
    res.json({
      success: true,
      currentSite: currentSite,
      hasValidSite: hasValidSite
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

router.delete("/api/sites/current", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const success = await clearSelectedSite();
    if (success) {
      res.json({
        success: true,
        message: "Selected site cleared"
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to clear site selection"
      });
    }
  } catch (error) {
    handleError(res, error, 500);
  }
});

// Query endpoints
router.post("/api/query/adhoc", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const {
      metrics = ["clicks", "impressions", "ctr", "position"],
      dimensions = ["query"],
      dateRangeType = "last7",
      customStartDate,
      customEndDate,
      limit = 1000,
      outputFormat = "json",
      sorting
    } = req.body;
    
    // Validate required fields
    if (!metrics || metrics.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one metric is required"
      });
    }
    
    if (!dimensions || dimensions.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one dimension is required"
      });
    }
    
    const cfg = loadConfig();
    
    // Check if we have a valid site selection
    if (!hasValidSiteSelection()) {
      return res.status(400).json({
        success: false,
        error: "No Google Search Console site selected. Please select a site first."
      });
    }
    
    // Set the selected site as environment variable
    const selectedSite = getSelectedSite();
    process.env.GSC_SITE_URL = selectedSite;
    
    // Ensure authentication
    const auth = await ensureAuthentication(cfg);
    
    // Build query parameters
    const answers = {
      action: "adhoc",
      source: "searchconsole",
      metrics,
      dimensions,
      dateRangeType,
      customStartDate,
      customEndDate,
      limit
    };
    
    // Run the query
    const rows = await runQuery(answers, cfg, auth);
    
    // Apply sorting if provided
    let sortedRows = rows;
    if (sorting && sorting.columns && !sorting.columns.includes('none')) {
      sortedRows = applySorting(rows, sorting);
    }
    
    // Format response based on output format
    let responseData;
    if (outputFormat === "csv") {
      responseData = stringify(sortedRows, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="gsc-data.csv"');
      return res.send(responseData);
    } else {
      responseData = {
        success: true,
        data: sortedRows,
        total: sortedRows.length,
        site: selectedSite,
        query: {
          metrics,
          dimensions,
          dateRange: {
            start: answers.customStartDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: answers.customEndDate || new Date().toISOString().split('T')[0]
          },
          limit
        }
      };
      
      if (outputFormat === "json") {
        res.json(responseData);
      } else {
        // For table format, return JSON with table structure
        res.json(responseData);
      }
    }
  } catch (error) {
    handleError(res, error, 500);
  }
});

router.post("/api/query/preset", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const {
      preset,
      dateRangeType = "last7",
      customStartDate,
      customEndDate,
      limit = 1000,
      outputFormat = "json"
    } = req.body;
    
    if (!preset) {
      return res.status(400).json({
        success: false,
        error: "Preset ID is required"
      });
    }
    
    const cfg = loadConfig();
    
    // Check if we have a valid site selection
    if (!hasValidSiteSelection()) {
      return res.status(400).json({
        success: false,
        error: "No Google Search Console site selected. Please select a site first."
      });
    }
    
    // Set the selected site as environment variable
    const selectedSite = getSelectedSite();
    process.env.GSC_SITE_URL = selectedSite;
    
    // Ensure authentication
    const auth = await ensureAuthentication(cfg);
    
    // Build query parameters
    const answers = {
      action: "preset",
      source: "searchconsole",
      preset,
      dateRangeType,
      customStartDate,
      customEndDate,
      limit
    };
    
    // Run the query
    const rows = await runQuery(answers, cfg, auth);
    
    // Format response based on output format
    let responseData;
    if (outputFormat === "csv") {
      responseData = stringify(rows, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="gsc-preset-data.csv"');
      return res.send(responseData);
    } else {
      responseData = {
        success: true,
        data: rows,
        total: rows.length,
        site: selectedSite,
        preset: preset,
        query: {
          dateRange: {
            start: answers.customStartDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: answers.customEndDate || new Date().toISOString().split('T')[0]
          },
          limit
        }
      };
      
      if (outputFormat === "json") {
        res.json(responseData);
      } else {
        // For table format, return JSON with table structure
        res.json(responseData);
      }
    }
  } catch (error) {
    handleError(res, error, 500);
  }
});

// Configuration endpoints
router.get("/api/presets", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const cfg = loadConfig();
    const presets = cfg.presets.filter(p => p.source === "searchconsole" || p.source === "any");
    
    res.json({
      success: true,
      presets: presets.map(p => ({
        id: p.id,
        label: p.label,
        description: p.description,
        metrics: p.metrics,
        dimensions: p.dimensions
      }))
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

router.get("/api/schema", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const cfg = loadConfig();
    const sourceConfig = cfg.sources.searchconsole;
    
    res.json({
      success: true,
      metrics: sourceConfig.metrics || {},
      dimensions: sourceConfig.dimensions || {}
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// Cleanup expired sessions on startup
cleanupExpiredSessions();

export default router;

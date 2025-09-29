#!/usr/bin/env node
import "dotenv/config";
import express from "express";
import cors from "cors";
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

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to get user ID from authenticated request
function getUserId(req) {
  return req.userId;
}

// Helper function to set user ID in config
function setUserId(userId) {
  process.env.USER_ID = userId;
}

// Helper function to handle errors
function handleError(res, error, statusCode = 500) {
  console.error("API Error:", error);
  res.status(statusCode).json({
    success: false,
    error: error.message || "Internal server error"
  });
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "GSC API Server is running",
    timestamp: new Date().toISOString()
  });
});

// Authentication endpoints
app.post("/api/auth/login", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required in request body"
      });
    }
    
    setUserId(userId);
    const cfg = loadConfig();
    
    // Set a dummy site URL for authentication
    const originalSiteUrl = process.env.GSC_SITE_URL;
    process.env.GSC_SITE_URL = "https://example.com/";
    
    const auth = await getOAuth2Client(cfg.sources.searchconsole);
    
    // Restore original site URL
    if (originalSiteUrl) {
      process.env.GSC_SITE_URL = originalSiteUrl;
    } else {
      delete process.env.GSC_SITE_URL;
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

app.post("/api/auth/logout", authenticateToken, async (req, res) => {
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

// User status endpoint
app.get("/api/status", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const cfg = loadConfig();
    const currentSite = getSelectedSite();
    const hasValidSite = hasValidSiteSelection();
    
    let authStatus = false;
    try {
      await ensureAuthentication(cfg);
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
app.get("/api/sites", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const cfg = loadConfig();
    await ensureAuthentication(cfg);
    const sites = await getAvailableSites(cfg);
    
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

app.get("/api/sites/verified", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const cfg = loadConfig();
    await ensureAuthentication(cfg);
    const verifiedSites = await getVerifiedSites(cfg);
    
    res.json({
      success: true,
      sites: verifiedSites,
      total: verifiedSites.length
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

app.post("/api/sites/select", authenticateToken, async (req, res) => {
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

app.get("/api/sites/current", authenticateToken, async (req, res) => {
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

app.delete("/api/sites/current", authenticateToken, async (req, res) => {
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
app.post("/api/query/adhoc", authenticateToken, async (req, res) => {
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

app.post("/api/query/preset", authenticateToken, async (req, res) => {
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
app.get("/api/presets", authenticateToken, async (req, res) => {
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

app.get("/api/schema", authenticateToken, async (req, res) => {
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

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    availableEndpoints: [
      "GET /health",
      "POST /api/auth/login",
      "POST /api/auth/logout",
      "GET /api/status",
      "GET /api/sites",
      "GET /api/sites/verified",
      "POST /api/sites/select",
      "GET /api/sites/current",
      "DELETE /api/sites/current",
      "POST /api/query/adhoc",
      "POST /api/query/preset",
      "GET /api/presets",
      "GET /api/schema"
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GSC API Server (JWT) running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Authentication: POST /api/auth/login`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/status`);
});

export default app;

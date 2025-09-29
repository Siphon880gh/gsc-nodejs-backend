import { searchconsole } from "@googleapis/searchconsole";
import chalk from "chalk";
import { OAuth2Client } from "google-auth-library";
import { readFileSync } from "fs";
import { join } from "path";
import open from "open";
import { getTokensForUser, storeTokensForUser } from '../utils/database.js';
import config from '../../config.js';

export default async function runGSC(query, cfg, auth = null) {
  const gscConfig = cfg.sources.searchconsole;
  const siteUrl = process.env.GSC_SITE_URL || gscConfig.siteUrl;
  
  if (!siteUrl) {
    throw new Error("GSC site URL is required. Set GSC_SITE_URL environment variable or configure in config.js");
  }

  // Use provided auth or initialize OAuth2 client
  if (!auth) {
    auth = await getOAuth2Client(gscConfig);
  }

  try {
    // Build the GSC request body
    const requestBody = {
      startDate: query.dateRange.start,
      endDate: query.dateRange.end,
      dimensions: query.dimensions || [],
      rowLimit: query.limit || gscConfig.pageSize || 1000,
      startRow: query.startRow || 0,
      dimensionFilterGroups: buildDimensionFilters(query.filters),
      searchType: query.searchType || 'web',
      dataState: query.dataState || 'final',
    };

    // Add orderBy if specified in the query
    if (query.orderBys && query.orderBys.length > 0) {
      requestBody.orderBy = query.orderBys.map(orderBy => {
        const fieldName = orderBy.metric || orderBy.dimension;
        return orderBy.desc ? `-${fieldName}` : fieldName;
      });
    }

    console.log(chalk.blue(`Querying GSC site ${siteUrl}...`));
    console.log(chalk.gray(`Request body:`, JSON.stringify(requestBody, null, 2)));
    
    // Use direct OAuth2 client request like the working functions
    const response = await auth.request({
      url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      method: 'POST',
      data: requestBody
    });
    
    // Transform response to array of objects
    let rows = (response.data.rows || []).map(row => {
      const result = {};
      
      // Add dimensions
      if (row.keys) {
        query.dimensions.forEach((dimension, index) => {
          result[dimension] = row.keys[index] || '';
        });
      }
      
      // Add metrics (clicks, impressions, ctr, position)
      if (row.clicks !== undefined) result.clicks = row.clicks;
      if (row.impressions !== undefined) result.impressions = row.impressions;
      if (row.ctr !== undefined) result.ctr = row.ctr;
      if (row.position !== undefined) result.position = row.position;
      
      return result;
    });

    console.log(chalk.gray(`GSC API returned ${rows.length} rows (requested limit: ${requestBody.rowLimit})`));

    // Apply client-side sorting if orderBys are specified
    if (query.orderBys && query.orderBys.length > 0) {
      rows = rows.sort((a, b) => {
        for (const orderBy of query.orderBys) {
          const fieldName = orderBy.metric || orderBy.dimension;
          const aVal = a[fieldName] || 0;
          const bVal = b[fieldName] || 0;
          
          if (aVal !== bVal) {
            return orderBy.desc ? bVal - aVal : aVal - bVal;
          }
        }
        return 0;
      });
    }

    return rows;
    
  } catch (error) {
    if (error.code === 403) {
      throw new Error(`GSC access denied. Check that your service account has access to site ${siteUrl} and has the "Search Console" role.`);
    } else if (error.code === 404) {
      throw new Error(`GSC site ${siteUrl} not found. Check your site URL.`);
    } else if (error.code === 400) {
      throw new Error(`Invalid GSC query: ${error.message}`);
    } else {
      throw new Error(`GSC API error: ${error.message}`);
    }
  }
}

function buildDimensionFilters(filters) {
  if (!filters || filters.length === 0) return undefined;
  
  const filterGroups = [];
  const dimensionFilters = filters
    .filter(f => f.type === "dimension")
    .map(f => {
      const filter = {
        dimension: f.field,
      };
      
      switch (f.op) {
        case "eq":
          filter.expression = f.value;
          break;
        case "neq":
          filter.expression = f.value;
          filter.operator = "notEquals";
          break;
        case "contains":
          filter.expression = f.value;
          filter.operator = "contains";
          break;
        case "regex":
          filter.expression = f.value;
          filter.operator = "regex";
          break;
        default:
          throw new Error(`Unsupported dimension filter operator: ${f.op}`);
      }
      
      return filter;
    });
  
  if (dimensionFilters.length > 0) {
    filterGroups.push({
      filters: dimensionFilters,
      groupType: "and"
    });
  }
  
  return filterGroups.length > 0 ? filterGroups : undefined;
}

// OAuth2 client setup and token management
export async function getOAuth2Client(gscConfig) {
  const credentialsPath = gscConfig.credentialsFile || process.env.GSC_CREDENTIALS_FILE;
  
  if (!credentialsPath) {
    throw new Error("OAuth2 credentials file is required. Set GSC_CREDENTIALS_FILE environment variable or configure in config.js");
  }

  let credentials;
  try {
    const credentialsContent = readFileSync(credentialsPath, 'utf8');
    credentials = JSON.parse(credentialsContent);
  } catch (error) {
    throw new Error(`Failed to read OAuth2 credentials from ${credentialsPath}: ${error.message}`);
  }

  const oauth2Client = new OAuth2Client(
    credentials.web.client_id,
    credentials.web.client_secret,
    credentials.web.redirect_uris[0]
  );

  // Check if we have stored tokens in database
  const userId = config.userId;
  let tokens;
  
  try {
    tokens = getTokensForUser(userId);
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
        console.log(chalk.yellow("Stored tokens expired, refreshing..."));
      }
    }
  } catch (error) {
    console.log(chalk.blue("No stored tokens found, starting OAuth2 flow..."));
  }

  // Start OAuth2 flow
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/webmasters.readonly'],
    prompt: 'consent'
  });

  console.log(chalk.blue("Opening browser for OAuth2 authentication..."));
  console.log(chalk.gray(`If browser doesn't open automatically, visit: ${authUrl}`));
  
  // Open browser
  await open(authUrl);
  
  // Wait for callback
  console.log(chalk.blue("Waiting for OAuth2 callback..."));
  const code = await waitForCallback();
  console.log(chalk.green("OAuth2 callback received!"));
  console.log("Authorization code:", code ? "Present" : "Missing");
  
  // Exchange code for tokens
  console.log("Exchanging authorization code for tokens...");
  const { tokens: newTokens } = await oauth2Client.getToken(code);
  console.log("Tokens received:", !!newTokens);
  console.log("Access token present:", !!newTokens.access_token);
  console.log("Refresh token present:", !!newTokens.refresh_token);
  console.log("Scope:", newTokens.scope);
  
  oauth2Client.setCredentials(newTokens);
  
  // Store tokens in database for future use
  storeTokensForUser(userId, newTokens);
  console.log(chalk.green("Authentication successful! Tokens saved to database."));
  
  return oauth2Client;
}

// Wait for OAuth2 callback using HTTP server
async function waitForCallback() {
  const { createServer } = await import('http');
  const { URL } = await import('url');
  const { readFileSync } = await import('fs');
  
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      console.log("Callback server received request:", req.url);
      const url = new URL(req.url, 'http://localhost:8888');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      
      console.log("URL parameters:", { code: !!code, error });
      
      if (error) {
        console.log("OAuth2 error received:", error);
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body>
              <h1>Authentication Error</h1>
              <p>Error: ${error}</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        reject(new Error(`OAuth2 error: ${error}`));
        return;
      }
      
      if (code) {
        console.log("Authorization code received:", code.substring(0, 20) + "...");
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body>
              <h1>Authentication Successful!</h1>
              <p>You can close this window and return to your terminal.</p>
              <script>setTimeout(() => window.close(), 2000);</script>
            </body>
          </html>
        `);
        resolve(code);
        server.close();
        return;
      }
      
      // Serve the callback.html file
      const callbackPath = join(process.cwd(), 'callback.html');
      try {
        const html = readFileSync(callbackPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      } catch (error) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>Callback page not found</h1>');
      }
    });
    
    server.listen(8888, 'localhost', () => {
      console.log(chalk.blue("Callback server started on http://localhost:8888"));
    });
    
    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("OAuth2 callback timeout. Please try again."));
    }, 300000);
    
    server.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

// Helper function to get available sites
export async function getAvailableSites(cfg) {
  const gscConfig = cfg.sources.searchconsole;
  
  const auth = await getOAuth2Client(gscConfig);
  
  // Ensure the auth client is properly authenticated
  await auth.getAccessToken();
  
  // Create the Search Console client with proper authentication
  const gsc = searchconsole({ 
    version: 'v1', 
    auth: auth
  });

  try {
    console.log("Making API call to list sites...");
    console.log("OAuth2 client credentials:", !!auth.credentials);
    console.log("Access token present:", !!auth.credentials?.access_token);
    console.log("Token type:", auth.credentials?.token_type);
    console.log("Scope:", auth.credentials?.scope);
    
    // Get fresh access token
    const accessToken = await auth.getAccessToken();
    console.log("Fresh access token obtained:", !!accessToken.token);
    
    // Use OAuth2 client's request method directly to bypass Google APIs client bug
    console.log("Making direct API call with OAuth2 client...");
    const response = await auth.request({
      url: 'https://searchconsole.googleapis.com/webmasters/v3/sites',
      method: 'GET'
    });
    
    console.log("API call successful!");
    return response.data.siteEntry || [];
  } catch (error) {
    console.error("API call failed:", error.message);
    console.error("Error code:", error.code);
    console.error("Error status:", error.status);
    
    if (error.code === 401) {
      throw new Error(`Authentication failed. Please re-authenticate by running the app and selecting "Authenticate with Google". Make sure you grant all requested permissions during the OAuth2 flow.`);
    } else if (error.code === 403) {
      throw new Error(`Access denied. Make sure your Google account has access to Google Search Console properties.`);
    } else {
      throw new Error(`Failed to fetch GSC sites: ${error.message}`);
    }
  }
}

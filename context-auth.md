# Authentication System - Technical Details

## Overview

Comprehensive OAuth2 authentication system with SQLite database storage for scalable user data management. Uses direct API requests that bypass Google APIs client library issues and provides user-isolated authentication with consistent patterns across all CLI functions.

## Authentication Helper (`src/utils/auth-helper.js` - 32 lines)

### Core Functions

```javascript
/**
 * Get a properly authenticated OAuth2 client
 * This ensures the authentication is fresh and working
 */
export async function getAuthenticatedClient(cfg) {
  const gscConfig = cfg.sources.searchconsole;
  
  // Get OAuth2 client
  const auth = await getOAuth2Client(gscConfig);
  
  // Ensure the auth client is properly authenticated by getting a fresh token
  await auth.getAccessToken();
  
  return auth;
}

/**
 * Ensure authentication is working before proceeding
 * Returns the authenticated client or throws an error
 */
export async function ensureAuthentication(cfg) {
  try {
    const auth = await getAuthenticatedClient(cfg);
    console.log(chalk.blue("Authentication verified"));
    return auth;
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}
```

## Direct OAuth2 Requests

### Why Direct Requests?

The Google APIs client library has authentication issues. All functions use direct OAuth2 client requests for reliability:

```javascript
// Site listing (working pattern)
const response = await auth.request({
  url: 'https://searchconsole.googleapis.com/webmasters/v3/sites',
  method: 'GET'
});

// Query execution (fixed to match working pattern)
const response = await auth.request({
  url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
  method: 'POST',
  data: requestBody
});
```

## CLI Integration

### Authentication Flow (`src/cli/index.js:162-171`)

```javascript
// Ensure authentication is available before running queries
let auth;
try {
  auth = await ensureAuthentication(cfg);
} catch (error) {
  console.log(chalk.yellow("Authentication required. Please authenticate first."));
  await handleAuthentication(cfg);
  await waitForEnter();
  continue;
}
```

### Handle Authentication Function (`src/cli/index.js:33-57`)

The `handleAuthentication` function manages the OAuth2 flow when authentication is required:

```javascript
async function handleAuthentication(cfg) {
  const spinner = ora("Authenticating with Google...").start();
  try {
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
    
    spinner.succeed("Authentication successful!");
    console.log(chalk.green("You are now authenticated with Google Search Console."));
    console.log(chalk.blue("You can now run queries without re-authenticating."));
  } catch (error) {
    spinner.fail("Authentication failed");
    console.error(chalk.red(error.message));
    process.exitCode = 1;
  }
}
```

**Key Features:**
- **Environment Management**: Temporarily sets a dummy site URL during authentication
- **User Feedback**: Provides clear success/failure messages with colored output
- **Error Handling**: Graceful failure with proper exit codes
- **Spinner UI**: Visual feedback during the authentication process

### Consistent Usage Across Handlers

All CLI handlers use the same authentication pattern:

```javascript
// Site listing handler
async function handleListSites(cfg) {
  await ensureAuthentication(cfg);
  const sites = await getAvailableSites(cfg);
  // ...
}

// Site selection handler  
async function handleSiteSelection(cfg) {
  await ensureAuthentication(cfg);
  const verifiedSites = await getVerifiedSites(cfg);
  // ...
}

// Query execution
const auth = await ensureAuthentication(cfg);
const rows = await runQuery(answers, cfg, auth);
```

## OAuth2 Client Setup

### Client Initialization (`src/datasources/searchconsole.js:135-140`)

```javascript
const oauth2Client = new OAuth2Client(
  credentials.web.client_id,
  credentials.web.client_secret,
  credentials.web.redirect_uris[0]
);
```

### Token Management

```javascript
// Check for stored tokens
const tokenPath = join(process.cwd(), '.oauth_tokens.json');
const tokens = JSON.parse(readFileSync(tokenPath, 'utf8'));
oauth2Client.setCredentials(tokens);

// Test token validity
await oauth2Client.getAccessToken();
```

### Browser Consent Flow

```javascript
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/webmasters.readonly'],
  prompt: 'consent'
});

await open(authUrl);
const code = await waitForCallback();
const { tokens: newTokens } = await oauth2Client.getToken(code);
```

## Database Storage (SQLite)

### User Configuration

**Location**: `config.js`  
**Purpose**: Configure user ID for database storage  
**Configuration**:

```javascript
// config.js
export default {
  // User configuration
  userId: 1, // Configure user ID for database storage
  
  sources: {
    searchconsole: {
      enabled: true,
      // ... other config
    }
  }
}
```

### Database Schema

**Database File**: `gsc_auth.db` (SQLite)  
**Purpose**: Store OAuth2 tokens and site selections per user  
**Tables**:

#### 1. OAuth2 Tokens Table (`oauth_tokens`)

```sql
CREATE TABLE oauth_tokens (
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
```

**Sample Data**:
```sql
INSERT INTO oauth_tokens (user_id, access_token, refresh_token, scope, expiry_date) 
VALUES (1, 'ya29.a0AQQ_BDQXhCzEe...', '1//065QYP8UqCUtHCgYIARAAGAYSNgF...', 
        'https://www.googleapis.com/auth/webmasters.readonly', 1759059731582);
```

#### 2. Site Selection Table (`selected_sites`)

```sql
CREATE TABLE selected_sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  site_url TEXT NOT NULL,
  selected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Sample Data**:
```sql
INSERT INTO selected_sites (user_id, site_url) 
VALUES (1, 'https://example.com/');
```

### Database Operations

**Token Storage**:
```javascript
// Store OAuth2 tokens in database
await db.run(`
  INSERT OR REPLACE INTO oauth_tokens 
  (user_id, access_token, refresh_token, scope, token_type, expiry_date)
  VALUES (?, ?, ?, ?, ?, ?)
`, [userId, tokens.access_token, tokens.refresh_token, 
     tokens.scope, tokens.token_type, tokens.expiry_date]);
```

**Site Selection Storage**:
```javascript
// Save selected site to database
await db.run(`
  INSERT OR REPLACE INTO selected_sites 
  (user_id, site_url, selected_at)
  VALUES (?, ?, ?)
`, [userId, siteUrl, new Date().toISOString()]);
```

**Token Retrieval**:
```javascript
// Get tokens for user
const tokenRow = await db.get(
  'SELECT * FROM oauth_tokens WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
  [userId]
);
```

**Site Retrieval**:
```javascript
// Get selected site for user
const siteRow = await db.get(
  'SELECT * FROM selected_sites WHERE user_id = ? ORDER BY selected_at DESC LIMIT 1',
  [userId]
);
```

### 3. OAuth2 Callback Server

**Temporary HTTP Server**: `localhost:8888`  
**Purpose**: Receives OAuth2 authorization code from Google  
**Process**:
1. Starts temporary HTTP server on port 8888
2. Opens browser to Google OAuth2 consent page
3. Google redirects to `http://localhost:8888/?code=AUTHORIZATION_CODE`
4. Server extracts authorization code
5. Server closes after receiving code

### 4. Callback HTML Page (`callback.html`)

**Location**: Project root directory  
**Purpose**: User-friendly OAuth2 callback page  
**Features**:
- Loading spinner during authentication
- Success/error message display
- Automatic window closing
- Fallback communication methods

## Database Management & Security

### Token Lifecycle

1. **Initial Auth**: Browser consent → authorization code → tokens → database storage
2. **Token Refresh**: Automatic refresh using refresh_token → database update
3. **Token Validation**: Check expiry before API calls → database query
4. **User Isolation**: Each user's tokens stored separately by user_id

### Database Security

- **SQLite Database**: `gsc_auth.db` in project root directory
- **User Isolation**: Tokens and sites stored per user_id
- **No Encryption**: Tokens stored in plain text (SQLite limitation)
- **File Permissions**: Database file uses default system permissions
- **Backup Considerations**: Database file should be included in backup strategies

### Database Initialization

```javascript
// Initialize SQLite database
import Database from 'better-sqlite3';

const db = new Database('gsc_auth.db');

// Create tables if they don't exist
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
  
  CREATE TABLE IF NOT EXISTS selected_sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    site_url TEXT NOT NULL,
    selected_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
```

### User-Based Operations

```javascript
// Get user ID from config
const userId = config.userId;

// Store tokens for specific user
await storeTokensForUser(userId, tokens);

// Retrieve tokens for specific user
const tokens = await getTokensForUser(userId);

// Store site selection for specific user
await storeSiteForUser(userId, siteUrl);

// Retrieve site selection for specific user
const siteUrl = await getSiteForUser(userId);
```

## Error Handling

### OAuth2 Errors

```javascript
if (error.code === 401) {
  throw new Error(`Authentication failed. Please re-authenticate...`);
} else if (error.code === 403) {
  throw new Error(`Access denied. Make sure your Google account has access...`);
}
```

### Authentication Verification

```javascript
try {
  const auth = await ensureAuthentication(cfg);
  // Proceed with authenticated operations
} catch (error) {
  // Handle authentication failure
  console.log(chalk.yellow("Authentication required. Please authenticate first."));
}
```

## Security Considerations

- **Token Storage**: Local file with restricted permissions
- **HTTPS Only**: All API calls use HTTPS
- **Scope Limitation**: Read-only access to Search Console
- **Token Expiry**: Automatic refresh prevents long-lived tokens
- **Direct Requests**: Bypasses Google APIs client library security issues

## Benefits

- **Consistent Authentication**: Same pattern used across all functions
- **Reliable Requests**: Direct OAuth2 requests bypass client library issues
- **Fresh Tokens**: Ensures authentication is always current
- **Error Handling**: Comprehensive error management and user guidance
- **Reusable Code**: Single source of truth for authentication logic
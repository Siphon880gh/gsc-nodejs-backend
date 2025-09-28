# Authentication System - Technical Details

## Overview

Comprehensive OAuth2 authentication system with direct API requests that bypasses Google APIs client library issues. Uses consistent authentication patterns across all CLI functions.

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

## Token Storage

### File: `.oauth_tokens.json`

```json
{
  "access_token": "ya29.a0AQQ_BDQXhCzEe...",
  "refresh_token": "1//065QYP8UqCUtHCgYIARAAGAYSNgF...",
  "scope": "https://www.googleapis.com/auth/webmasters.readonly",
  "token_type": "Bearer",
  "expiry_date": 1759059731582
}
```

### Token Lifecycle

1. **Initial Auth**: Browser consent → authorization code → tokens
2. **Token Refresh**: Automatic refresh using refresh_token
3. **Token Validation**: Check expiry before API calls
4. **Token Storage**: Persistent storage in `.oauth_tokens.json`

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
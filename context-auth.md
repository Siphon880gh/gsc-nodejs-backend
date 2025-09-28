# OAuth2 Authentication - Technical Details

## Overview

The app uses OAuth2 with browser-based consent for Google Search Console API access. Implements direct OAuth2 client requests to bypass Google APIs client library authentication issues.

## OAuth2 Flow Implementation

### 1. Client Setup (`src/datasources/searchconsole.js:135-140`)

```javascript
const oauth2Client = new OAuth2Client(
  credentials.web.client_id,
  credentials.web.client_secret,
  credentials.web.redirect_uris[0]
);
```

### 2. Token Management (`src/datasources/searchconsole.js:145-166`)

```javascript
// Check for stored tokens
const tokenPath = join(process.cwd(), '.oauth_tokens.json');
const tokens = JSON.parse(readFileSync(tokenPath, 'utf8'));
oauth2Client.setCredentials(tokens);

// Test token validity
await oauth2Client.getAccessToken();
```

### 3. Browser Consent Flow (`src/datasources/searchconsole.js:168-195`)

```javascript
// Generate consent URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/webmasters.readonly'],
  prompt: 'consent'
});

// Open browser and wait for callback
await open(authUrl);
const code = await waitForCallback();

// Exchange code for tokens
const { tokens: newTokens } = await oauth2Client.getToken(code);
```

### 4. Callback Server (`src/datasources/searchconsole.js:198-258`)

HTTP server on `localhost:8888` handles OAuth2 redirects:

```javascript
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:8888');
  const code = url.searchParams.get('code');
  
  if (code) {
    resolve(code);
    server.close();
  }
});
```

## Direct API Implementation

### Problem Solved

Google APIs client library had authentication issues. Solution uses OAuth2 client's request method directly:

```javascript
// Direct API call bypassing Google APIs client library
const response = await auth.request({
  url: 'https://searchconsole.googleapis.com/webmasters/v3/sites',
  method: 'GET'
});
```

### Authentication Headers

OAuth2 client automatically handles:
- `Authorization: Bearer <access_token>`
- Token refresh on expiration
- Request retry logic

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

## CLI Integration

### Authentication Menu (`src/cli/index.js:21-45`)

```javascript
async function handleAuthentication(cfg) {
  const spinner = ora("Authenticating with Google...").start();
  try {
    // Set dummy site URL for auth
    process.env.GSC_SITE_URL = "https://example.com/";
    
    const auth = await getOAuth2Client(cfg.sources.searchconsole);
    spinner.succeed("Authentication successful!");
  } catch (error) {
    spinner.fail("Authentication failed");
  }
}
```

### Site Listing (`src/cli/index.js:47-62`)

```javascript
async function handleListSites(cfg) {
  const sites = await getAvailableSites(cfg);
  sites.forEach((site, index) => {
    console.log(`${index + 1}. ${site.siteUrl}`);
  });
}
```

## Error Handling

### OAuth2 Errors

- **401 Unauthorized**: Token expired or invalid
- **403 Forbidden**: Insufficient permissions
- **Network Errors**: Connection issues

### User Guidance

```javascript
if (error.code === 401) {
  throw new Error(`Authentication failed. Please re-authenticate...`);
} else if (error.code === 403) {
  throw new Error(`Access denied. Make sure your Google account has access...`);
}
```

## Security Considerations

- **Token Storage**: Local file with restricted permissions
- **HTTPS Only**: All API calls use HTTPS
- **Scope Limitation**: Read-only access to Search Console
- **Token Expiry**: Automatic refresh prevents long-lived tokens

## Configuration

### Environment Variables

```bash
GSC_SITE_URL=https://yourdomain.com/
GSC_CREDENTIALS_FILE=./env/client_secret_*.json
```

### OAuth2 Credentials File

```json
{
  "web": {
    "client_id": "13637964853-*.apps.googleusercontent.com",
    "client_secret": "GOCSPX-*",
    "redirect_uris": ["http://localhost:8888/callback.html"]
  }
}
```

## Debugging

### OAuth2 Flow Debug

```javascript
console.log("OAuth2 callback received!");
console.log("Authorization code:", code ? "Present" : "Missing");
console.log("Tokens received:", !!newTokens);
console.log("Access token present:", !!newTokens.access_token);
```

### API Call Debug

```javascript
console.log("OAuth2 client credentials:", !!auth.credentials);
console.log("Access token present:", !!auth.credentials?.access_token);
console.log("Token type:", auth.credentials?.token_type);
console.log("Scope:", auth.credentials?.scope);
```

# Google Search Console CLI - Technical Context

## Overview

A Node.js CLI tool for querying Google Search Console data with OAuth2 authentication and optional BigQuery integration. Provides interactive querying with preset and ad-hoc modes.

## Tech Stack

- **Runtime**: Node.js 18+ with ES modules
- **Authentication**: OAuth2 with Google APIs client library
- **CLI Interface**: Inquirer.js for interactive prompts
- **Data Sources**: Google Search Console API, BigQuery API
- **Output**: Table (console), JSON, CSV formats

## Architecture

```
src/
├── cli/           # CLI interface and prompts
├── core/          # Query execution and presets
├── datasources/   # API integrations (GSC, BigQuery)
└── utils/         # Configuration and utilities
```

## Key Files

- **`src/cli/index.js`** (210 lines) - Main CLI entry point with continuous loop and site selection
- **`src/datasources/searchconsole.js`** (325 lines) - GSC API with direct OAuth2 requests
- **`src/cli/prompts.js`** (263 lines) - Interactive prompts and menu system
- **`src/utils/site-manager.js`** (83 lines) - Site selection and storage utilities
- **`src/utils/auth-helper.js`** (32 lines) - Reusable authentication utilities
- **`config.js`** (122 lines) - Configuration and presets
- **`callback.html`** (142 lines) - OAuth2 callback page

## OAuth2 Authentication Flow

The app uses OAuth2 with browser-based consent for Google Search Console access:

```javascript
// OAuth2 client setup with credentials
const oauth2Client = new OAuth2Client(
  credentials.web.client_id,
  credentials.web.client_secret,
  credentials.web.redirect_uris[0]
);

// Browser consent flow
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/webmasters.readonly'],
  prompt: 'consent'
});
```

**Key Implementation**: Direct OAuth2 client request method bypasses Google APIs client library authentication issues:

```javascript
// Direct API call using OAuth2 client (for site listing)
const response = await auth.request({
  url: 'https://searchconsole.googleapis.com/webmasters/v3/sites',
  method: 'GET'
});

// Direct API call for queries (bypasses Google APIs client library)
const response = await auth.request({
  url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
  method: 'POST',
  data: requestBody
});
```

## CLI Interface

Interactive menu system with five main options and continuous loop:

1. **Run a query** - Execute preset or ad-hoc queries
2. **Authenticate with Google** - OAuth2 flow setup
3. **List available sites** - Show GSC properties
4. **Select/Change site** - Interactive site selection with memory
5. **Exit** - Properly terminate the CLI

```javascript
// Menu structure in src/cli/prompts.js
const base = [
  {
    type: "list",
    name: "action",
    message: "What would you like to do?",
    choices: [
      { name: "Run a query", value: "query" },
      { name: "Authenticate with Google", value: "auth" },
      { name: "List available sites", value: "sites" },
      { name: "Select/Change site", value: "select_site" },
      { name: "Exit", value: "exit" },
    ],
  }
];
```

### Continuous CLI Loop

The CLI now runs in a continuous loop, returning to the main menu after each action:

```javascript
// Main CLI loop in src/cli/index.js
while (true) {
  const initialAnswers = await inquirer.prompt(await buildPrompts(cfg));
  
  if (initialAnswers.action === "auth") {
    await handleAuthentication(cfg);
    await waitForEnter();
    continue;
  } else if (initialAnswers.action === "exit") {
    console.log(chalk.blue("Goodbye! 👋"));
    break;
  }
  // ... other actions
}
```

## Data Sources

### Google Search Console
- **Authentication**: OAuth2 with browser consent
- **Scope**: `https://www.googleapis.com/auth/webmasters.readonly`
- **API**: Search Console API v1
- **Token Storage**: `.oauth_tokens.json` (auto-generated)

### BigQuery (Optional)
- **Authentication**: Service account or OAuth2
- **Configuration**: Via environment variables
- **Integration**: GSC data export to BigQuery

## Query System

### Preset Queries
Built-in SEO analytics queries in `config.js`:

```javascript
presets: [
  {
    id: "top-queries",
    label: "Top Queries by Clicks",
    source: "searchconsole",
    metrics: ["clicks", "impressions", "ctr", "position"],
    dimensions: ["query"],
    orderBys: [{ metric: "clicks", desc: true }],
    limit: 50
  }
]
```

### Ad-hoc Queries
Custom query builder with:
- **Metrics**: clicks, impressions, ctr, position
- **Dimensions**: query, page, country, device, searchAppearance, date
- **Filters**: Dimension-based filtering
- **Date Ranges**: Last 7/28/90 days or custom

## Site Selection

The CLI now includes intelligent site selection that remembers your choice:

### Site Selection Features
- **Interactive Selection**: Choose from verified GSC properties using arrow keys
- **Persistent Memory**: Your selection is saved in `.selected_site.json`
- **Verified Properties Only**: Only shows properties you have full access to
- **Automatic Usage**: Selected site is automatically used for all queries
- **Easy Changes**: Change your selection anytime from the main menu

**Detailed Implementation**: See [context-site-selection.md](./context-site-selection.md) for complete technical details.

## Authentication Helper

Reusable authentication utilities ensure consistent authentication across all CLI functions:

```javascript
// src/utils/auth-helper.js
export async function getAuthenticatedClient(cfg) {
  const auth = await getOAuth2Client(gscConfig);
  await auth.getAccessToken(); // Ensure fresh token
  return auth;
}

export async function ensureAuthentication(cfg) {
  const auth = await getAuthenticatedClient(cfg);
  console.log(chalk.blue("Authentication verified"));
  return auth;
}
```

**Benefits**: Consistent authentication pattern used by all CLI handlers (queries, site listing, site selection).

**Detailed Implementation**: See [context-auth.md](./context-auth.md) for complete authentication system details.

## Configuration

Environment variables in `.env` (now optional with site selection):
```bash
GSC_SITE_URL=https://yourdomain.com/  # Optional - CLI will prompt if not set
GSC_CREDENTIALS_FILE=./env/client_secret_*.json
```

OAuth2 credentials file structure:
```json
{
  "web": {
    "client_id": "...",
    "client_secret": "...",
    "redirect_uris": ["http://localhost:8888/callback.html"]
  }
}
```

## Output Formats

- **Table**: Console-formatted tables with chalk styling
- **JSON**: Structured data export
- **CSV**: Spreadsheet-compatible format
- **File Export**: Optional file saving with timestamps

## Recent Updates

- ✅ **OAuth2 Authentication** - Browser-based consent flow
- ✅ **Token Management** - Automatic token refresh and storage
- ✅ **Direct API Calls** - Bypassed Google APIs client library issues
- ✅ **Interactive Menu** - Enhanced CLI with authentication options
- ✅ **Error Handling** - Comprehensive OAuth2 error management
- ✅ **Smart Site Selection** - Interactive site selection with persistent memory
- ✅ **Continuous CLI Loop** - Returns to main menu after each action
- ✅ **Exit Option** - Proper CLI termination with user-friendly goodbye
- ✅ **Authentication Helper** - Reusable authentication utilities for consistency
- ✅ **Direct OAuth2 Queries** - Query execution uses direct requests like working functions

## Development

```bash
npm run dev          # Watch mode
npm test            # Run tests
npm run lint        # ESLint
npm run format      # Prettier
```

## Dependencies

- `@googleapis/searchconsole` - Google Search Console API
- `google-auth-library` - OAuth2 authentication
- `inquirer` - CLI prompts
- `chalk` - Console styling
- `ora` - Loading spinners
- `open` - Browser opening

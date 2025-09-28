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

- **`src/cli/index.js`** (121 lines) - Main CLI entry point with OAuth2 flow
- **`src/datasources/searchconsole.js`** (323 lines) - GSC API with OAuth2 authentication
- **`src/cli/prompts.js`** (246 lines) - Interactive prompts and menu system
- **`config.js`** (123 lines) - Configuration and presets
- **`callback.html`** (143 lines) - OAuth2 callback page

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
// Direct API call using OAuth2 client
const response = await auth.request({
  url: 'https://searchconsole.googleapis.com/webmasters/v3/sites',
  method: 'GET'
});
```

## CLI Interface

Interactive menu system with three main options:

1. **Run a query** - Execute preset or ad-hoc queries
2. **Authenticate with Google** - OAuth2 flow setup
3. **List available sites** - Show GSC properties

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
    ],
  }
];
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

## Configuration

Environment variables in `.env`:
```bash
GSC_SITE_URL=https://yourdomain.com/
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

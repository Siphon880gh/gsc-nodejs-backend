# Google Search Console CLI - Technical Context

## Overview

A Node.js application for querying Google Search Console data with OAuth2 authentication and optional BigQuery integration. Provides both interactive CLI and REST API interfaces with multi-user support and JWT authentication.

## Tech Stack

- **Runtime**: Node.js 18+ with ES modules
- **Authentication**: OAuth2 with Google APIs client library + JWT for API
- **Database**: SQLite with better-sqlite3 for user data storage
- **CLI Interface**: Inquirer.js for interactive prompts
- **API Server**: Express.js with JWT authentication middleware
- **Data Sources**: Google Search Console API, BigQuery API
- **Output**: Table (console), JSON, CSV formats with smart sorting
- **Security**: JWT tokens with configurable expiration and session management

## Architecture

```
src/
├── api/           # REST API server and JWT authentication
├── cli/           # CLI interface and prompts
├── core/          # Query execution and presets
├── datasources/   # API integrations (GSC, BigQuery)
└── utils/         # Configuration and utilities
```

### Dual Interface Support

The application now supports both CLI and REST API interfaces:

- **CLI Interface**: Interactive command-line tool for direct usage
- **REST API**: HTTP endpoints for integration with other applications
- **JWT Authentication**: Secure token-based authentication for production use
- **Multi-User Support**: User isolation with separate authentication and data storage

## Key Files

### CLI Interface
- **`src/cli/index.js`** (248 lines) - Main CLI entry point with pagination and enhanced UX
- **`src/cli/prompts.js`** (354 lines) - Interactive prompts with advanced sorting and column selection
- **`src/cli/renderers.js`** (212 lines) - Output rendering with pagination, smart sorting and number formatting

### API Server
- **`src/api/server.js`** (60 lines) - Main API server with user-based routing
- **`src/api/server-jwt.js`** (60 lines) - JWT-based API server for secure authentication
- **`src/api/jwt-routes.js`** (710 lines) - JWT authentication routes and middleware
- **`src/api/auth-middleware.js`** (162 lines) - JWT authentication middleware

### Data Sources & Core
- **`src/datasources/searchconsole.js`** (361 lines) - GSC API with client-side sorting and OAuth2 requests
- **`src/core/query-runner.js`** (96 lines) - Query execution with preset/ad-hoc handling
- **`src/core/presets.js`** - Preset query definitions
- **`src/core/schema.js`** - Data schema definitions

### Utilities
- **`src/utils/site-manager.js`** (111 lines) - Site selection and SQLite storage utilities
- **`src/utils/auth-helper.js`** (33 lines) - Reusable authentication utilities
- **`src/utils/database.js`** (114 lines) - SQLite database operations for user data
- **`src/utils/config.js`** - Configuration utilities
- **`src/utils/logger.js`** - Logging utilities

### Configuration & Database
- **`config.js`** (146 lines) - Configuration with impressions-based presets
- **`callback.html`** (143 lines) - OAuth2 callback page
- **`gsc_auth.db`** - SQLite database for user authentication and site data

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

Interactive menu system with separate query options and continuous loop:

1. **GSC Query: Ad-hoc** - Execute custom queries with metric/dimension selection
2. **GSC Query: Report** - Execute predefined preset queries (no sorting prompts)
3. **GSC List sites** - Show GSC properties
4. **GSC Select site** - Interactive site selection with memory
5. **Sign in with Google** - OAuth2 flow setup
6. **Sign out** - Clear authentication data
7. **Exit** - Properly terminate the CLI

```javascript
// Menu structure in src/cli/prompts.js
const base = [
  {
    type: "list",
    name: "action",
    message: "What would you like to do?",
    choices: [
      { name: "GSC Query: Ad-hoc", value: "adhoc" },
      { name: "GSC Query: Report", value: "preset" },
      { name: "GSC List sites", value: "sites" },
      { name: "GSC Select site", value: "select_site" },
      { name: "Sign in with Google Account that has verified access to GSC", value: "auth" },
      { name: "Sign out", value: "signout" },
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

### Preset Queries (Report Queries)
Built-in SEO analytics queries in `config.js` with client-side sorting:

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
  },
  {
    id: "top-queries-impressions",
    label: "Top Queries by Impressions",
    source: "searchconsole",
    metrics: ["impressions", "clicks", "ctr", "position"],
    dimensions: ["query"],
    orderBys: [{ metric: "impressions", desc: true }],
    limit: 50
  },
  {
    id: "top-pages-impressions",
    label: "Top Pages by Impressions",
    source: "searchconsole",
    metrics: ["impressions", "clicks", "ctr", "position"],
    dimensions: ["page"],
    orderBys: [{ metric: "impressions", desc: true }],
    limit: 50
  }
]
```

**Key Features:**
- **No Sorting Prompts**: Report queries skip user sorting prompts (use preset `orderBys`)
- **Client-Side Sorting**: Reliable sorting applied after API response
- **Impressions-Based Reports**: New presets for impression-focused analysis

### Ad-hoc Queries
Custom query builder with:
- **Metrics**: clicks, impressions, ctr, position
- **Dimensions**: query, page, country, device, searchAppearance, date
- **Filters**: Dimension-based filtering
- **Date Ranges**: Last 7/28/90 days or custom
- **Interactive Sorting**: User can customize sorting after query execution

## Client-Side Sorting Implementation

For reliable sorting of preset queries, the system uses client-side sorting after API response:

```javascript
// src/datasources/searchconsole.js - Client-side sorting
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
```

**Benefits:**
- **Reliable Sorting**: Guarantees correct sorting regardless of API behavior
- **Multi-Level Sorting**: Supports primary/secondary sorting levels
- **Preset Integrity**: Maintains intended sorting for all preset queries

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

**Smart Sorting System**: See [context-sorting.md](./context-sorting.md) for complete sorting system details.

**API Endpoints**: See [context-api.md](./context-api.md) for complete API documentation and JWT authentication details.

**Site Selection**: See [context-site-selection.md](./context-site-selection.md) for complete site selection system details.

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

## Smart Sorting System

Interactive sorting selection with real-time feedback and organized UX:

### Sorting Interface
```javascript
// Single-screen multiselect with organized options
Select columns to sort by (order of selection = primary sorting, secondary sorting):
❯ ◯ No Sorting
  ◯  
  ◯ ASC: name
  ◯ ASC: age  
  ◯ ASC: score
  ◯  
  ◯ DSC: name
  ◯ DSC: age
  ◯ DSC: score
```

### Real-Time Feedback
```javascript
// Shows current sorting with visual indicators
📊 Sorting applied: Primary: age ↓ (descending), Secondary: score ↑ (ascending)
```

### Key Features
- **Selection Order Tracking**: First selected = primary, second = secondary, etc.
- **Visual Indicators**: Arrows (↑↓) and emojis (📊) for clear feedback
- **Duplicate Prevention**: Cannot select both ASC and DSC versions of same column
- **Organized Layout**: Clean separators between ASC and DSC sections
- **Smart Validation**: Prevents invalid combinations

## Output Formats

- **Table**: Console-formatted tables with pagination, chalk styling and 3-decimal formatting
- **JSON**: Structured data export with sorting applied
- **CSV**: Spreadsheet-compatible format with sorting applied
- **File Export**: Optional file saving with timestamps

## Pagination System

The CLI now includes intelligent pagination for large result sets:

### Pagination Features
- **50 Rows Per Page**: Optimal balance between readability and information density
- **Interactive Navigation**: Press Enter to continue or 'q' to return to main menu
- **Progress Tracking**: Shows current page, total pages, and row ranges
- **Screen Clearing**: Clean transitions between pages for better readability
- **Flexible Exit**: Users can quit pagination at any time

```javascript
// Pagination implementation in src/cli/renderers.js
async function displayTableWithPagination(rows) {
  const rowsPerPage = 50;
  let currentPage = 0;
  const totalPages = Math.ceil(rows.length / rowsPerPage);
  
  console.log(chalk.blue(`\nTotal rows: ${rows.length} (${totalPages} pages)\n`));
  
  while (currentPage < totalPages) {
    const startIndex = currentPage * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, rows.length);
    const pageRows = rows.slice(startIndex, endIndex);
    
    console.log(chalk.gray(`Page ${currentPage + 1} of ${totalPages} (rows ${startIndex + 1}-${endIndex}):\n`));
    
    // Format numbers to 3 decimal places for better readability
    const formattedRows = pageRows.map(row => {
      const formattedRow = {};
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'number' && !Number.isInteger(value)) {
          formattedRow[key] = Math.round(value * 1000) / 1000;
        } else {
          formattedRow[key] = value;
        }
      }
      return formattedRow;
    });
    
    console.table(formattedRows);
    
    currentPage++;
    
    if (currentPage < totalPages) {
      console.log(chalk.yellow(`\nPress Enter to continue to page ${currentPage + 1} of ${totalPages}, or 'q' to return to menu...`));
      const shouldContinue = await waitForEnterOrQuit();
      if (!shouldContinue) {
        console.log(chalk.blue('\nReturning to main menu...'));
        return false; // Return to menu
      }
      console.clear(); // Clear screen for next page
    }
  }
  
  console.log(chalk.green(`\n✅ Displayed all ${rows.length} rows across ${totalPages} pages`));
  return true; // Completed successfully
}
```

**Benefits:**
- **Better UX**: Large datasets are manageable and readable
- **User Control**: Users can exit pagination at any time
- **Performance**: No memory issues with large result sets
- **Clean Interface**: Screen clearing prevents visual clutter

## API Endpoints

### REST API Server (`src/api/server.js` - 60 lines)

The application now includes a full REST API that provides all CLI functionality as HTTP endpoints:

```javascript
// Main API server with user-based routing
const express = require('express');
const app = express();

// User-based routing: /api/{userId}/endpoint
app.get('/api/:userId/status', getUserStatus);
app.post('/api/:userId/auth', authenticateUser);
app.get('/api/:userId/sites', listUserSites);
app.post('/api/:userId/query/adhoc', runAdhocQuery);
app.post('/api/:userId/query/preset', runPresetQuery);
```

**Key Features:**
- **Multi-User Support**: Each user identified by `userId` parameter
- **Complete CLI Parity**: All CLI functions available as REST endpoints
- **User Isolation**: Separate authentication and site data per user
- **Flexible Output**: JSON, CSV, and table formats

### JWT Authentication System (`src/api/server-jwt.js` - 60 lines)

Secure JWT-based authentication system for production use:

```javascript
// JWT authentication flow
app.post('/api/auth/login', loginUser);        // Returns JWT token
app.get('/api/status', authenticateJWT, getUserStatus);
app.post('/api/query/adhoc', authenticateJWT, runAdhocQuery);
```

**Security Features:**
- **JWT Tokens**: Secure token-based authentication
- **Token Expiry**: Configurable token expiration (default: 24h)
- **Session Management**: Automatic cleanup of expired sessions
- **User Isolation**: Each user's data completely isolated

### API Documentation

- **Standard API**: [API-DOCUMENTATION.md](./API-DOCUMENTATION.md) - User-based routing
- **JWT API**: [API-DOCUMENTATION-JWT.md](./API-DOCUMENTATION-JWT.md) - JWT authentication

## Recent Updates

### API Endpoints (v3.0)
- ✅ **REST API Server** - Complete REST API with all CLI functionality
- ✅ **JWT Authentication** - Secure token-based authentication system
- ✅ **Multi-User Support** - User isolation with separate authentication and data
- ✅ **API Documentation** - Comprehensive documentation for both API versions
- ✅ **Production Ready** - JWT-based authentication for production deployment

### Enhanced UX and Pagination (v2.4)
- ✅ **Smart Pagination** - Table output now supports pagination with 50 rows per page
- ✅ **Interactive Navigation** - Press Enter to continue or 'q' to return to menu
- ✅ **Screen Clearing** - Clean page transitions for better readability
- ✅ **Progress Tracking** - Shows current page and total pages with row counts
- ✅ **Flexible Exit** - Users can quit pagination at any time to return to main menu

### Advanced Sorting System (v2.3)
- ✅ **Multi-Level Sorting** - Primary and secondary sorting with selection order tracking
- ✅ **No Default Selection** - Sorting prompts start with nothing selected for cleaner UX
- ✅ **Column Selection** - Ad-hoc queries now support interactive column selection
- ✅ **Real-Time Feedback** - Visual indicators show current sorting configuration
- ✅ **Smart Validation** - Prevents duplicate column selections and invalid combinations

### Query System Redesign (v2.2)
- ✅ **Separate Query Options** - Ad-hoc and Report queries are now distinct root menu items
- ✅ **Report Query Optimization** - No sorting prompts for preset queries (use built-in sorting)
- ✅ **Impressions-Based Presets** - Added "Top Queries by Impressions" and "Top Pages by Impressions"
- ✅ **Client-Side Sorting** - Reliable sorting implementation for preset queries
- ✅ **Streamlined UX** - Direct access to query types without intermediate menu steps

### Database Migration (v2.0)
- ✅ **SQLite Database** - Migrated from JSON files to SQLite for scalable user data storage
- ✅ **User Isolation** - Each user's authentication and site data stored separately by userId
- ✅ **Database Operations** - OAuth2 tokens and site selections stored in `gsc_auth.db`
- ✅ **Scalable Architecture** - Ready for multi-user applications

### Enhanced Sorting System (v2.1)
- ✅ **Smart Sorting UX** - Single-screen multiselect with organized ASC/DSC options
- ✅ **Selection Order Tracking** - First selected = primary, second = secondary, etc.
- ✅ **Real-Time Feedback** - Shows current sorting with visual indicators (↑↓)
- ✅ **Duplicate Prevention** - Cannot select both ASC and DSC versions of same column
- ✅ **Number Formatting** - Table values formatted to 3 decimal places for readability

### Core Features
- ✅ **OAuth2 Authentication** - Browser-based consent flow with SQLite token storage
- ✅ **Interactive Menu** - Enhanced CLI with separate query options
- ✅ **Smart Site Selection** - Interactive site selection with SQLite memory
- ✅ **Continuous CLI Loop** - Returns to main menu after each action
- ✅ **Direct API Calls** - Bypassed Google APIs client library issues
- ✅ **Flexible Output** - Table, JSON, CSV with smart sorting and formatting

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
- `better-sqlite3` - SQLite database for user data storage
- `inquirer` - CLI prompts and interactive interfaces
- `chalk` - Console styling and colors
- `ora` - Loading spinners
- `open` - Browser opening
- `csv-stringify` - CSV output formatting

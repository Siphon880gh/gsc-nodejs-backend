# Google Search Console CLI

A Node.js CLI tool for querying Google Search Console data with optional BigQuery integration.

## Quick Summary

• **Dual Interface Support** with both interactive CLI and REST API endpoints for maximum flexibility
• **JWT Authentication** with secure token-based authentication for production API deployment
• **Multi-User Support** with complete user isolation and separate authentication per user
• **OAuth2 Authentication** with SQLite database storage for scalable user data management
• **Smart Pagination** with 50 rows per page, interactive navigation, and flexible exit options
• **Advanced Sorting System** with multi-level sorting, column selection, and real-time feedback
• **Multiple Data Sources** supporting Google Search Console and BigQuery
• **Flexible Output** with table, JSON, and CSV formats with intelligent number formatting
• **Built-in Presets** including impressions-based reports (Top Queries/Pages by Impressions)
• **Reliable Sorting** with client-side implementation ensuring accurate preset query results

## API Test Flow

Test with `npm run test:api` or `node test-api.js`

**User Signup**: Creates a record in our local database only

**User Login**: 
- Uses your existing Google account to get permission to access GSC data
- Stores OAuth tokens in our local database
- Generates our own JWT token

**API Calls**: Uses the stored OAuth tokens to read GSC data

**User Delete**: Only removes the user from our local database

## Getting Started

```bash
npm install
npm start
```

## Documentation

- **Setup Guide**: [README-SETUP.md](./README-SETUP.md) - Complete OAuth2 and GSC setup
- **Developer Guide**: [README-developers.md](./README-developers.md) - Architecture and development
- **Quick Start**: [QUICKSTART.md](./QUICKSTART.md) - Fast setup for immediate use
- **API Documentation**: [API-DOCUMENTATION.md](./API-DOCUMENTATION.md) - REST API endpoints
- **JWT API Documentation**: [API-DOCUMENTATION-JWT.md](./API-DOCUMENTATION-JWT.md) - JWT authentication API
- **Context Files**: [context.md](./context.md) - Technical implementation details
- **API Context**: [context-api.md](./context-api.md) - API endpoints and JWT authentication
- **Site Selection**: [context-site-selection.md](./context-site-selection.md) - Interactive site selection system
- **Authentication**: [context-auth.md](./context-auth.md) - OAuth2 and JWT authentication systems
- **Sorting System**: [context-sorting.md](./context-sorting.md) - Smart sorting with real-time feedback

## Features

- 🔐 **Dual Authentication** - OAuth2 for CLI and JWT for API with secure token management
- 🌐 **REST API** - Complete REST API with all CLI functionality as HTTP endpoints
- 👥 **Multi-User Support** - Complete user isolation with separate authentication and data storage
- 📊 **Interactive Queries** - Preset and custom query modes with smart sorting
- 📄 **Smart Pagination** - 50 rows per page with interactive navigation and flexible exit
- 🏢 **Multi-Source** - Google Search Console and BigQuery support
- 📈 **SEO Analytics** - Built-in presets for common SEO metrics
- 💾 **Flexible Export** - Table, JSON, and CSV output formats with number formatting
- ⚡ **Fast Setup** - Automated OAuth2 flow with database token management
- 🎯 **Smart Site Selection** - Interactive site selection with SQLite memory
- 🔄 **Advanced Sorting** - Multi-level sorting with column selection and real-time feedback
- 🔒 **Production Ready** - JWT authentication for secure production deployment

Refer to README for high-level context; details are in context files.

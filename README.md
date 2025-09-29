# Google Search Console CLI

A Node.js CLI tool for querying Google Search Console data with optional BigQuery integration.

## Quick Summary

• **Interactive CLI** with separate Ad-hoc and Report query options, pagination, and enhanced UX
• **OAuth2 Authentication** with SQLite database storage for scalable user data management
• **Smart Pagination** with 50 rows per page, interactive navigation, and flexible exit options
• **Advanced Sorting System** with multi-level sorting, column selection, and real-time feedback
• **Multiple Data Sources** supporting Google Search Console and BigQuery
• **Flexible Output** with table, JSON, and CSV formats with intelligent number formatting
• **Built-in Presets** including impressions-based reports (Top Queries/Pages by Impressions)
• **Reliable Sorting** with client-side implementation ensuring accurate preset query results

## Getting Started

```bash
npm install
npm start
```

## Documentation

- **Setup Guide**: [README-SETUP.md](./README-SETUP.md) - Complete OAuth2 and GSC setup
- **Developer Guide**: [README-developers.md](./README-developers.md) - Architecture and development
- **Quick Start**: [QUICKSTART.md](./QUICKSTART.md) - Fast setup for immediate use
- **Context Files**: [context.md](./context.md) - Technical implementation details
- **Site Selection**: [context-site-selection.md](./context-site-selection.md) - Interactive site selection system
- **Authentication**: [context-auth.md](./context-auth.md) - OAuth2 authentication system
- **Sorting System**: [context-sorting.md](./context-sorting.md) - Smart sorting with real-time feedback

## Features

- 🔐 **OAuth2 Authentication** - Secure Google API access with SQLite database storage
- 📊 **Interactive Queries** - Preset and custom query modes with smart sorting
- 📄 **Smart Pagination** - 50 rows per page with interactive navigation and flexible exit
- 🏢 **Multi-Source** - Google Search Console and BigQuery support
- 📈 **SEO Analytics** - Built-in presets for common SEO metrics
- 💾 **Flexible Export** - Table, JSON, and CSV output formats with number formatting
- ⚡ **Fast Setup** - Automated OAuth2 flow with database token management
- 🎯 **Smart Site Selection** - Interactive site selection with SQLite memory
- 🔄 **Advanced Sorting** - Multi-level sorting with column selection and real-time feedback
- 👥 **User Isolation** - Scalable architecture ready for multi-user applications

Refer to README for high-level context; details are in context files.

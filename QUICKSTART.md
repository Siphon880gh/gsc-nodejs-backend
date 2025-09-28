# Analytics CLI - Quick Start Guide

## 🚀 Get Started in 5 Minutes

> **⚠️ Prerequisites**: You need Google Search Console and Google Cloud Platform access. See [README-SETUP.md](./README-SETUP.md) for complete setup instructions.

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment
```bash
# Copy the example environment file
cp env.example .env

# Edit .env with your credentials
# You'll need:
# - GSC_SITE_URL (your GSC property URL)
# - GSC_CREDENTIALS_FILE (path to service account JSON)
# - BQ_PROJECT_ID (your BigQuery project ID) - Optional
# - BQ_DATASET (your BigQuery dataset name) - Optional
```

### 3. Add Service Account Credentials
```bash
# Create secrets directory
mkdir -p secrets

# Add your Google Cloud service account JSON file
# Place it in secrets/ and update .env accordingly
```

### 4. Test Your Setup
```bash
npm run test:setup
```

### 5. Run the CLI
```bash
npm start
```

## 🎯 What You Can Do

### Preset Queries
- **Top Queries by Clicks** - Most popular search queries
- **Top Pages by Clicks** - Most clicked pages from search
- **Queries by Country** - Geographic search breakdown
- **Performance by Device** - Mobile vs desktop search performance
- **Search Appearance Types** - Rich results and special features

### Ad-hoc Queries
- Select custom metrics and dimensions
- Apply filters and sorting
- Choose date ranges
- Export to JSON, CSV, or view as table

### Data Sources
- **Google Search Console** - Search performance data
- **BigQuery** - Historical data and custom analysis (optional)

## 📊 Example Workflow

1. **Select Data Source**: Choose Google Search Console or BigQuery
2. **Choose Mode**: Pick a preset or create custom query
3. **Configure Query**: Set date range, metrics, dimensions
4. **Run Query**: Execute and view results
5. **Export Results**: Save to file or view in console

## 🔧 Configuration

Edit `config.js` to:
- Add custom presets
- Modify default settings
- Adjust safety limits
- Configure output options

## 🆘 Need Help?

- Check `README-developers.md` for detailed documentation
- Run `npm run test:setup` to verify configuration
- Review error messages for troubleshooting tips

## 🎉 You're Ready!

Your analytics CLI is now ready to use. Start with a preset query to get familiar with the interface, then explore custom queries for deeper analysis.

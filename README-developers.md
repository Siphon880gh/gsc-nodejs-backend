# Google Search Console CLI

A Google Search Console CLI that provides consistent prompts and outputs for querying GSC data with optional BigQuery support. Built with Node.js and Inquirer for an interactive command-line experience.

## Overview

This CLI tool allows you to:
- Query Google Search Console data using the Search Console API
- Query BigQuery datasets with GSC data exports (optional)
- Use preset queries for common SEO analytics needs
- Create ad-hoc queries with custom metrics, dimensions, and filters
- Output results in table, JSON, or CSV formats
- Save results to files for further analysis

## Prerequisites

- Node.js >= 18
- Google Cloud account with appropriate permissions
- Google Search Console site access
- BigQuery dataset access (optional, for BigQuery queries)

> **📋 Setup Required**: Before using this CLI, you need to configure GSC access. BigQuery is optional. See [README-SETUP.md](./README-SETUP.md) for detailed setup instructions.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Set up service account credentials:**
   - Create a service account in Google Cloud Console
   - Download the JSON key file
   - Place it in `./secrets/` directory
   - Update `.env` with the path to your credentials file

4. **Configure data sources:**
   - Edit `config.js` to match your setup
   - Set GSC site URL and credentials
   - Set BigQuery project/dataset (optional)
   - Customize presets and limits as needed

### 🧪 Testing with Sample Data

**Quick Test Setup (BigQuery Optional):**
```bash
# Use Google's free sample dataset for testing (optional)
BQ_PROJECT_ID=your-test-project-id
BQ_DATASET=gsc_sample_data
BQ_LOCATION=US
```

This uses Google's public sample dataset, allowing you to test the CLI without setting up your own BigQuery dataset.

## Running

### Basic Usage
```bash
npm start
```

### Development Mode
```bash
npm run dev
```

### Available Scripts
- `npm start` - Run the CLI
- `npm run dev` - Run in watch mode for development
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# GSC Configuration
GSC_SITE_URL=https://example.com/
GSC_CREDENTIALS_FILE=./secrets/gsc-sa.json

# BigQuery Configuration (Optional)
BQ_PROJECT_ID=your-project-id
BQ_DATASET=gsc_export_data
BQ_LOCATION=US

# Alternative: Use Application Default Credentials
# GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-sa.json
```

### Config.js Schema

The `config.js` file contains:

- **Sources**: Configuration for GSC and BigQuery (optional)
- **Presets**: Pre-defined queries for common SEO analytics needs
- **Output**: Default output format and file settings
- **Limits**: Safety limits for queries and runtime

### Adding Custom Presets

Edit `config.js` to add new presets:

```javascript
presets: [
  {
    id: "custom-query",
    label: "My Custom Query",
    source: "ga4",
    metrics: ["totalUsers", "sessions"],
    dimensions: ["pagePath", "country"],
    orderBys: [{ metric: "totalUsers", desc: true }],
    limit: 100,
    filters: [
      { type: "dimension", field: "country", op: "eq", value: "United States" }
    ],
  },
]
```

## Data Sources

### Google Search Console API

**Required Environment Variables:**
- `GSC_SITE_URL` - Your GSC site URL (e.g., https://example.com/)
- `GSC_CREDENTIALS_FILE` - Path to service account JSON file

**Common Metrics:**
- `clicks` - Number of clicks
- `impressions` - Number of impressions
- `ctr` - Click-through rate
- `position` - Average position

**Common Dimensions:**
- `query` - Search query
- `page` - Page URL
- `country` - Country
- `device` - Device type
- `searchAppearance` - Search appearance type
- `date` - Date

### BigQuery (Optional)

**Required Environment Variables (Optional):**
- `BQ_PROJECT_ID` - Your BigQuery project ID
- `BQ_DATASET` - Dataset name (e.g., `gsc_export_data`)
- `BQ_LOCATION` - Location (default: "US")

**Common Fields (GSC Export):**
- `date` - Date
- `query` - Search query
- `page` - Page URL
- `clicks` - Number of clicks
- `impressions` - Number of impressions
- `ctr` - Click-through rate
- `position` - Average position
- `country` - Country
- `device` - Device type

## Presets

### GSC Presets

1. **Top Queries by Clicks** - Most popular search queries by clicks
2. **Top Pages by Clicks** - Most popular pages by clicks
3. **Queries by Country** - Search queries broken down by country
4. **Performance by Device** - Search performance by device type
5. **Search Appearance Types** - Performance by search appearance type

### BigQuery Presets (Optional)

1. **BigQuery GSC Data Sample** - Sample of GSC data from BigQuery export

## Ad-hoc Queries

### Metrics and Dimensions

When creating ad-hoc queries, you can select from available metrics and dimensions for each data source. The CLI will show you the available options based on your configuration.

### Filters

Supported filter operators:
- `eq` - Equals
- `neq` - Not equals
- `gt` - Greater than
- `lt` - Less than
- `contains` - Contains (for text fields)
- `regex` - Regular expression match

### Date Ranges

Choose from:
- Last 7 days
- Last 28 days
- Last 90 days
- Custom range (specify start and end dates)

## Outputs

### Table Format
Results are displayed in a formatted table in the console (limited to 50 rows for readability).

### JSON Format
Results are output as pretty-printed JSON, optionally saved to a file.

### CSV Format
Results are output as CSV format, optionally saved to a file.

### File Saving
When saving to files, results are stored in the `.out/` directory with timestamps in the filename.

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
Integration tests are gated by environment variables and will be skipped if credentials are not available:

```bash
# Set up test environment
export GSC_SITE_URL=https://example.com/
export BQ_PROJECT_ID=your-test-project
export BQ_DATASET=your-test-dataset

# Run tests
npm test
```

### Test Files
- `tests/gsc.test.js` - GSC data source tests
- `tests/bigquery.test.js` - BigQuery data source tests (optional)
- `tests/query-runner.test.js` - Query runner tests

## Troubleshooting

### Common Issues

**GSC Access Denied (403)**
- Check that your service account has access to the GSC site
- Ensure the service account has "Search Console" role
- Verify the site URL is correct

**BigQuery Access Denied (403)**
- Check that your service account has "Job User" and "Data Viewer" roles
- Verify the project ID and dataset name
- Ensure the dataset exists and is accessible

**Site/Dataset Not Found (404)**
- Double-check your site URL or project ID
- Verify the dataset name matches exactly
- Ensure the site/dataset is in the correct Google Cloud project

**Invalid Query (400)**
- Check that your metrics and dimensions are valid for the data source
- Verify date ranges are in YYYY-MM-DD format
- Ensure filters use supported operators

### Debugging

Enable debug logging:
```bash
export ANALYTICS_CLI_LOG=true
export ANALYTICS_CLI_LOG_LEVEL=debug
npm start
```

Logs will be written to `./.out/analytics-cli.log`.

### Performance

- Large queries may take time to complete
- Use appropriate date ranges to limit data volume
- Consider using filters to reduce result sets
- Monitor BigQuery costs for large datasets

## Extensibility

### Adding New Data Sources

1. Create a new file in `src/datasources/`
2. Implement the data source interface
3. Add configuration to `config.js`
4. Update the query runner to handle the new source

### Adding Custom Output Formats

1. Add new renderer functions in `src/cli/renderers.js`
2. Update the output format choices in prompts
3. Add the new format to the renderer switch statement

### Adding New Presets

Simply add new preset objects to the `presets` array in `config.js`. Presets can be source-specific or work with any source by setting `source: "any"`.

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the configuration examples
3. Check the logs for detailed error messages
4. Open an issue with detailed information about your setup

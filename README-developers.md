# Analytics CLI (Inquirer)

A cross-source analytics CLI that provides consistent prompts and outputs for querying GA4 Data API and BigQuery. Built with Node.js and Inquirer for an interactive command-line experience.

## Overview

This CLI tool allows you to:
- Query GA4 properties using the Data API
- Query BigQuery datasets (including GA4 exports)
- Use preset queries for common analytics needs
- Create ad-hoc queries with custom metrics, dimensions, and filters
- Output results in table, JSON, or CSV formats
- Save results to files for further analysis

## Prerequisites

- Node.js >= 18
- Google Cloud account with appropriate permissions
- GA4 property access (for GA4 queries)
- BigQuery dataset access (for BigQuery queries)

> **📋 Setup Required**: Before using this CLI, you need to configure GA4 and BigQuery access. See [README-SETUP.md](./README-SETUP.md) for detailed setup instructions.

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
   - Set property IDs, project IDs, and dataset names
   - Customize presets and limits as needed

### 🧪 Testing with Sample Data

**Quick Test Setup (No GA4 Required):**
```bash
# Use Google's free sample dataset for testing
BQ_PROJECT_ID=your-test-project-id
BQ_DATASET=ga4_obfuscated_sample_ecommerce
BQ_LOCATION=US
```

This uses Google's public GA4 sample dataset from the Google Merchandise Store, allowing you to test the CLI without setting up your own GA4 property.

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
# GA4 Configuration
GA4_PROPERTY_ID=123456789
GA4_CREDENTIALS_FILE=./secrets/ga4-sa.json

# BigQuery Configuration
BQ_PROJECT_ID=your-project-id
BQ_DATASET=analytics_123456789
BQ_LOCATION=US

# Alternative: Use Application Default Credentials
# GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-sa.json
```

### Config.js Schema

The `config.js` file contains:

- **Sources**: Configuration for GA4 and BigQuery
- **Presets**: Pre-defined queries for common analytics needs
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

### GA4 Data API

**Required Environment Variables:**
- `GA4_PROPERTY_ID` - Your GA4 property ID
- `GA4_CREDENTIALS_FILE` - Path to service account JSON file

**Common Metrics:**
- `sessions` - Number of sessions
- `totalUsers` - Total users
- `newUsers` - New users
- `activeUsers` - Active users
- `averageSessionDuration` - Average session duration
- `eventCount` - Number of events
- `bounceRate` - Bounce rate
- `conversionRate` - Conversion rate

**Common Dimensions:**
- `date` - Date
- `pagePath` - Page path
- `pageTitle` - Page title
- `firstUserSource` - Traffic source
- `firstUserMedium` - Traffic medium
- `country` - Country
- `deviceCategory` - Device category
- `operatingSystem` - Operating system
- `browser` - Browser

### BigQuery

**Required Environment Variables:**
- `BQ_PROJECT_ID` - Your BigQuery project ID
- `BQ_DATASET` - Dataset name (e.g., `analytics_123456789`)
- `BQ_LOCATION` - Location (default: "US")

**Common Fields (GA4 Export):**
- `event_date` - Event date
- `event_name` - Event name
- `page_location` - Page location
- `page_title` - Page title
- `user_pseudo_id` - User ID
- `session_id` - Session ID
- `country` - Country
- `device_category` - Device category
- `source` - Traffic source
- `medium` - Traffic medium

## Presets

### GA4 Presets

1. **Top Pages by Users** - Most popular pages by total users
2. **Users by Country** - User distribution by country
3. **Event Count by Date** - Daily event counts over time
4. **Sessions by Traffic Source** - Sessions by source and medium
5. **Engagement Metrics** - Key engagement metrics by page

### BigQuery Presets

1. **BigQuery Events Sample** - Sample of events from BigQuery export
2. **Page Views by Date** - Daily page views from BigQuery

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
export GA4_PROPERTY_ID=your-test-property
export BQ_PROJECT_ID=your-test-project
export BQ_DATASET=your-test-dataset

# Run tests
npm test
```

### Test Files
- `tests/ga4.test.js` - GA4 data source tests
- `tests/bigquery.test.js` - BigQuery data source tests
- `tests/query-runner.test.js` - Query runner tests

## Troubleshooting

### Common Issues

**GA4 Access Denied (403)**
- Check that your service account has access to the GA4 property
- Ensure the service account has "Viewer" or "Analyst" role
- Verify the property ID is correct

**BigQuery Access Denied (403)**
- Check that your service account has "Job User" and "Data Viewer" roles
- Verify the project ID and dataset name
- Ensure the dataset exists and is accessible

**Property/Dataset Not Found (404)**
- Double-check your property ID or project ID
- Verify the dataset name matches exactly
- Ensure the property/dataset is in the correct Google Cloud project

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

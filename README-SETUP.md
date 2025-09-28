# Analytics CLI Setup Guide

This guide will walk you through setting up Google Search Console, Google Analytics 4 (GA4), and BigQuery access for the Analytics CLI.

## 📋 Prerequisites

### Required
- **Google Search Console Property**: Your website must be verified in Google Search Console
- **GA4 Property**: Your website must have Google Analytics 4 set up and tracking page visits
- **Google Cloud Platform Account**: With billing enabled (required for BigQuery)
- **Administrative Access**: To GSC property, GA4 property, and Google Cloud Platform

### Optional
- **BigQuery Project**: Not required initially - we'll create one during setup
- **BigQuery API**: Will be enabled during the setup process

## 🎯 Google Search Console Setup Verification

First, verify that your website is properly set up in Google Search Console:

1. **Check GSC Dashboard**: Go to your Google Search Console property dashboard
2. **Verify Site Ownership**: Ensure your site is verified and you have access
3. **Check Data Availability**: Look for search performance data in the last 90 days
4. **Confirm API Access**: Ensure you can access the Search Console API

### GSC Property Types

The CLI works with different GSC property types:
- **Domain Properties**: `https://example.com/` (recommended for full domain coverage)
- **URL Prefix Properties**: `https://www.example.com/` (specific protocol/subdomain)

> **Note**: Use the exact URL format as shown in your GSC property settings.

## 🎯 GA4 Setup Verification

First, verify that your GA4 is properly tracking:

1. **Check GA4 Dashboard**: Go to your GA4 property dashboard
2. **Verify Real-time Data**: Look for recent page views in the last 24 hours
3. **Confirm Tracking**: Ensure you see data in Reports > Realtime

### GA4 Tracking Methods

The CLI works with GA4 regardless of how tracking is implemented:

#### ✅ With Google Tag Manager (GTM)
- **Most Common**: If you're using GTM, you're all set
- **No Additional Setup**: The CLI will work with your existing GTM implementation
- **Data Source**: Uses the same GA4 data that GTM sends

#### ✅ Without GTM (Direct Implementation)
- **Direct GA4 Code**: If you have GA4 code directly on your website
- **No Additional Setup**: The CLI works with direct implementations too
- **Data Source**: Uses the same GA4 data from your direct implementation

> **Note**: The CLI doesn't care how GA4 tracking is implemented - it only needs access to the GA4 Data API, which works the same regardless of implementation method.

## 🔧 Google Cloud Platform Setup

### Step 1: Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Ensure billing is enabled (required for BigQuery)

### Step 2: Create a New Project (Optional)

If you don't have a project yet:

1. Click the project dropdown at the top
2. Click "New Project"
3. Enter a project name (e.g., "Analytics CLI")
4. Click "Create"

### Step 3: Enable Required APIs

1. Go to "APIs & Services" > "Library"
2. Search for and enable these APIs:
   - **Google Search Console API**
   - **Google Analytics Reporting API**
   - **BigQuery API**
   - **Google Analytics Data API**

### Step 4: Create Service Account

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Fill in details:
   - **Name**: `analytics-cli-service`
   - **Description**: `Service account for Analytics CLI`
4. Click "Create and Continue"
5. **Skip roles for now** (we'll add them next)
6. Click "Done"

### Step 5: Create Service Account Key

1. Find your new service account in the list
2. Click on the service account name
3. Go to "Keys" tab
4. Click "Add Key" > "Create new key"
5. Choose "JSON" format
6. Click "Create"
7. **Save the downloaded JSON file** - you'll need this for configuration

## 🔐 Permissions Setup

### Google Search Console Permissions

1. Go to your Google Search Console property
2. Click "Settings" (gear icon) in the left sidebar
3. Click "Users and permissions"
4. Click "Add user"
5. Add your service account email (from the JSON file)
6. Assign role: **"Full"** or **"Restricted"** (Full recommended for API access)
7. Click "Add"

### GA4 Permissions

1. Go to your GA4 property
2. Click "Admin" (gear icon)
3. Under "Property", click "Property access management"
4. Click the "+" button
5. Add your service account email (from the JSON file)
6. Assign role: **"Viewer"** or **"Analyst"**
7. Click "Add"

### BigQuery Permissions

1. Go back to Google Cloud Console
2. Go to "IAM & Admin" > "IAM"
3. Find your service account
4. Click the pencil icon to edit
5. Add these roles:
   - **BigQuery Job User**
   - **BigQuery Data Viewer**
6. Click "Save"

## 📊 BigQuery Setup (Optional but Recommended)

### Step 1: Create BigQuery Dataset

1. Go to BigQuery in Google Cloud Console
2. Click on your project name
3. Click "Create dataset"
4. Fill in details:
   - **Dataset ID**: `analytics_XXXX` (replace XXXX with your GA4 property ID)
   - **Location**: Choose your preferred region
5. Click "Create dataset"

### Step 2: Link GA4 to BigQuery (Optional)

For historical data analysis:

1. Go to your GA4 property
2. Click "Admin" > "Data Export"
3. Click "Link to BigQuery"
4. Select your project and dataset
5. Choose export frequency (daily recommended)
6. Click "Submit"

> **Note**: This step is optional. The CLI can work with GA4 Data API alone, but BigQuery provides more historical data and advanced querying capabilities.

## ⚙️ CLI Configuration

### Step 1: Create Environment File

```bash
cp env.example .env
```

### Step 2: Configure Environment Variables

Edit your `.env` file with the following values:

```bash
# Google Search Console Configuration
GSC_SITE_URL=https://example.com/  # Your GSC property URL (exact format from GSC)
GSC_CREDENTIALS_FILE=./secrets/gsc-sa.json  # Path to your service account JSON

# GA4 Configuration
GA4_PROPERTY_ID=123456789  # Your GA4 property ID
GA4_CREDENTIALS_FILE=./secrets/ga4-sa.json  # Path to your service account JSON

# BigQuery Configuration (if using BigQuery)
BQ_PROJECT_ID=your-project-id  # Your Google Cloud project ID
BQ_DATASET=analytics_123456789  # Your BigQuery dataset name
BQ_LOCATION=US  # Your BigQuery location

# Alternative: Use single service account for all
# GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-sa.json
```

### Step 3: Store Service Account Credentials

```bash
# Create secrets directory
mkdir -p secrets

# Move your downloaded JSON file here
mv ~/Downloads/your-service-account-key.json ./secrets/ga4-sa.json
```

### Step 4: Update Configuration File

Edit `config.js` if needed:

```javascript
export default {
  sources: {
    searchconsole: {
      enabled: true,
      siteUrl: process.env.GSC_SITE_URL || "https://example.com/",
      credentialsFile: process.env.GSC_CREDENTIALS_FILE || "./secrets/gsc-sa.json",
      // ... rest of config
    },
    ga4: {
      enabled: true,
      propertyId: process.env.GA4_PROPERTY_ID || "123456789",
      credentialsFile: process.env.GA4_CREDENTIALS_FILE || "./secrets/ga4-sa.json",
      // ... rest of config
    },
    bigquery: {
      enabled: true,  // Set to false if not using BigQuery
      projectId: process.env.BQ_PROJECT_ID || "your-project-id",
      dataset: process.env.BQ_DATASET || "analytics_123456789",
      // ... rest of config
    },
  },
  // ... rest of config
};
```

## 🧪 Testing with Sample Data

### Option 1: Use GA4 Sample Dataset (Recommended for Testing)

Google provides a free sample dataset that you can use to test the CLI without setting up your own GA4 property:

**Sample Dataset Details:**
- **Source**: Google Merchandise Store (e-commerce site)
- **Data Period**: November 1, 2020 - January 31, 2021
- **Location**: BigQuery Public Datasets
- **Dataset ID**: `ga4_obfuscated_sample_ecommerce`

**Setup for Testing:**

1. **Create a Google Cloud Project** (if you don't have one)
2. **Enable BigQuery API** in your project
3. **Access the Sample Dataset**:
   - Go to [BigQuery Console](https://console.cloud.google.com/bigquery)
   - In Explorer, click "Add Data" > "Public Datasets"
   - Search for "GA4" and add the `ga4_obfuscated_sample_ecommerce` dataset

**Configure CLI for Testing:**

```bash
# Option 1: Use the test configuration file
cp env.test .env
# Then update BQ_PROJECT_ID with your actual project ID

# Option 2: Manually update your .env file
GA4_PROPERTY_ID=123456789  # Use any placeholder - won't be used for BigQuery
BQ_PROJECT_ID=your-test-project-id
BQ_DATASET=ga4_obfuscated_sample_ecommerce  # Use the sample dataset
BQ_LOCATION=US
```

**Test with Sample Data:**

```bash
# Test the setup
npm run test:setup

# Run the CLI and try BigQuery presets
npm start
# Select: BigQuery > Preset > "BigQuery Events Sample"
```

### Option 2: Use Your Own GA4 Property

If you have a GA4 property with data:

```bash
# Use your actual GA4 property ID
GA4_PROPERTY_ID=your-actual-property-id
GA4_CREDENTIALS_FILE=./secrets/ga4-sa.json
BQ_PROJECT_ID=your-project-id
BQ_DATASET=your-dataset-name
```

## ✅ Verification

### Test Your Setup

```bash
# Test configuration
npm run test:setup
```

You should see:
- ✅ Configuration loaded successfully
- ✅ Enabled sources: ga4, bigquery
- ✅ Environment variables detected

### Run the CLI

```bash
npm start
```

You should see the interactive menu without errors.

## 🔍 Troubleshooting

### Common Issues

**"GA4 access denied"**
- Check that your service account has access to the GA4 property
- Verify the property ID is correct
- Ensure the service account has "Viewer" or "Analyst" role

**"BigQuery access denied"**
- Check that your service account has "BigQuery Job User" and "BigQuery Data Viewer" roles
- Verify the project ID and dataset name
- Ensure BigQuery API is enabled

**"Property not found"**
- Double-check your GA4 property ID
- Ensure the property exists and is accessible
- Verify you're using the correct Google account

**"Invalid credentials"**
- Check that the JSON file path is correct
- Verify the JSON file is valid and not corrupted
- Ensure the service account has the required permissions

### Getting Your GA4 Property ID

1. Go to your GA4 property
2. Click "Admin" (gear icon)
3. Under "Property", you'll see "Property details"
4. The Property ID is displayed there (format: 123456789)

### Getting Your Google Cloud Project ID

1. Go to Google Cloud Console
2. The project ID is shown in the project dropdown at the top
3. Or go to "IAM & Admin" > "Settings" to see project details

## 🚀 Next Steps

Once setup is complete:

1. **Start with Presets**: Try the "Top Pages by Users" preset
2. **Explore Ad-hoc Queries**: Create custom queries with your metrics
3. **Export Data**: Use JSON/CSV output for further analysis
4. **Add Custom Presets**: Edit `config.js` to add your own query presets

## 📚 Additional Resources

- [GA4 Data API Documentation](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [BigQuery Documentation](https://cloud.google.com/bigquery/docs)
- [Google Cloud IAM Documentation](https://cloud.google.com/iam/docs)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-for-service-accounts)

## 🆘 Need Help?

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Ensure your service account has the required permissions
4. Test with `npm run test:setup` to verify configuration
5. Check the logs for detailed error messages

The CLI is designed to work with any GA4 implementation, whether through GTM or direct implementation, as long as you have access to the GA4 Data API.

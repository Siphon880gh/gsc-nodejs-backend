# Analytics CLI Setup Guide

This guide will walk you through setting up Google Search Console and BigQuery access for the Analytics CLI.

## 📋 Prerequisites

### Required
- **Google Search Console Property**: Your website must be verified in Google Search Console
- **Google Cloud Platform Account**: With billing enabled (required for BigQuery)
- **Administrative Access**: To GSC property and Google Cloud Platform

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


## 🔧 Google Cloud Platform Setup

### Step 1: Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Ensure billing is enabled XX(required for BigQuery)XX

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
   - **BigQuery API**

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
   - **Dataset ID**: `gsc_data` (or your preferred name)
   - **Location**: Choose your preferred region
5. Click "Create dataset"

> **Note**: BigQuery is optional for the CLI. The CLI can work with GSC API alone, but BigQuery provides more advanced querying capabilities for historical data analysis.

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

# BigQuery Configuration (if using BigQuery)
BQ_PROJECT_ID=your-project-id  # Your Google Cloud project ID
BQ_DATASET=gsc_data  # Your BigQuery dataset name
BQ_LOCATION=US  # Your BigQuery location

# Alternative: Use single service account for all
# GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-sa.json
```

### Step 3: Store Service Account Credentials

```bash
# Create secrets directory
mkdir -p secrets

# Move your downloaded JSON file here
mv ~/Downloads/your-service-account-key.json ./secrets/gsc-sa.json
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
    bigquery: {
      enabled: true,  // Set to false if not using BigQuery
      projectId: process.env.BQ_PROJECT_ID || "your-project-id",
      dataset: process.env.BQ_DATASET || "gsc_data",
      // ... rest of config
    },
  },
  // ... rest of config
};
```

## 🧪 Testing Your Setup

### Test with Your GSC Property

The CLI works directly with your Google Search Console data:

```bash
# Test the setup
npm run test:setup

# Run the CLI
npm start
# Select: Google Search Console > Preset > "Top Pages by Clicks"
```

### Optional: Test with BigQuery

If you want to test BigQuery functionality:

```bash
# Configure BigQuery in your .env file
BQ_PROJECT_ID=your-project-id
BQ_DATASET=gsc_data
BQ_LOCATION=US
```

## ✅ Verification

### Test Your Setup

```bash
# Test configuration
npm run test:setup
```

You should see:
- ✅ Configuration loaded successfully
- ✅ Enabled sources: searchconsole, bigquery
- ✅ Environment variables detected

### Run the CLI

```bash
npm start
```

You should see the interactive menu without errors.

## 🔍 Troubleshooting

### Common Issues

**"GSC access denied"**
- Check that your service account has access to the GSC property
- Verify the site URL is correct and matches your GSC property exactly
- Ensure the service account has "Full" or "Restricted" role in GSC

**"BigQuery access denied"**
- Check that your service account has "BigQuery Job User" and "BigQuery Data Viewer" roles
- Verify the project ID and dataset name
- Ensure BigQuery API is enabled

**"Site not found"**
- Double-check your GSC site URL
- Ensure the site is verified in Google Search Console
- Verify you're using the correct Google account

**"Invalid credentials"**
- Check that the JSON file path is correct
- Verify the JSON file is valid and not corrupted
- Ensure the service account has the required permissions


### Getting Your Google Cloud Project ID

1. Go to Google Cloud Console
2. The project ID is shown in the project dropdown at the top
3. Or go to "IAM & Admin" > "Settings" to see project details

## 🚀 Next Steps

Once setup is complete:

1. **Start with Presets**: Try the "Top Pages by Clicks" preset
2. **Explore Ad-hoc Queries**: Create custom queries with your GSC metrics
3. **Export Data**: Use JSON/CSV output for further analysis
4. **Add Custom Presets**: Edit `config.js` to add your own query presets

## 📚 Additional Resources

- [Google Search Console API Documentation](https://developers.google.com/webmaster-tools/v1/overview)
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

The CLI is designed to work with Google Search Console data through the Search Console API.

// config.js
export default {
  // User configuration for database storage
  userId: 1,
  
  // Which data sources are enabled
  sources: {
    searchconsole: {
      enabled: true,
      // OAuth2 credentials file path
      credentialsFile: process.env.GSC_CREDENTIALS_FILE || "./env/client_secret_13637964853-bqgo2khek52dtvgb6gg01kg3ste21qto.apps.googleusercontent.com.json",
      siteUrl: process.env.GSC_SITE_URL || "",
      // Default date range if user skips input
      defaultDateRange: { start: "2025-01-01", end: "2025-12-31" },
      // GSC metrics (always available)
      metrics: {
        clicks: "clicks",
        impressions: "impressions",
        ctr: "ctr",
        position: "position",
      },
      // GSC dimensions
      dimensions: {
        query: "query",
        page: "page",
        country: "country",
        device: "device",
        searchAppearance: "searchAppearance",
        date: "date",
      },
      // GSC API page size default
      pageSize: 1000,
    },
    bigquery: {
      enabled: false, // Optional - set to true if you want to use BigQuery with GSC data
      // Service account via env GOOGLE_APPLICATION_CREDENTIALS or inline
      projectId: process.env.BQ_PROJECT_ID || "",
      dataset: process.env.BQ_DATASET || "",
      // Optional table mapping helpers
      tables: {
        gscData: "gsc_data_*", // wildcards allowed
        pages: "pages",        // example custom table
      },
      location: process.env.BQ_LOCATION || "US",
      defaultDateRange: { start: "2025-01-01", end: "2025-12-31" },
    },
  },

  // Query presets (available to both sources where possible)
  presets: [
    {
      id: "top-queries",
      label: "Top Queries by Clicks",
      source: "searchconsole",
      metrics: ["clicks", "impressions", "ctr", "position"],
      dimensions: ["query"],
      orderBys: [{ metric: "clicks", desc: true }],
      limit: 50,
      filters: [],
    },
    {
      id: "top-pages-gsc",
      label: "Top Pages by Clicks",
      source: "searchconsole",
      metrics: ["clicks", "impressions", "ctr", "position"],
      dimensions: ["page"],
      orderBys: [{ metric: "clicks", desc: true }],
      limit: 50,
      filters: [],
    },
    {
      id: "queries-by-country",
      label: "Queries by Country",
      source: "searchconsole",
      metrics: ["clicks", "impressions", "ctr", "position"],
      dimensions: ["query", "country"],
      orderBys: [{ metric: "clicks", desc: true }],
      limit: 100,
      filters: [],
    },
    {
      id: "device-breakdown",
      label: "Performance by Device",
      source: "searchconsole",
      metrics: ["clicks", "impressions", "ctr", "position"],
      dimensions: ["device"],
      orderBys: [{ metric: "clicks", desc: true }],
      limit: 10,
      filters: [],
    },
    {
      id: "search-appearance",
      label: "Search Appearance Types",
      source: "searchconsole",
      metrics: ["clicks", "impressions", "ctr", "position"],
      dimensions: ["searchAppearance"],
      orderBys: [{ metric: "clicks", desc: true }],
      limit: 20,
      filters: [],
    },
    {
      id: "bq-gsc-sample",
      label: "BigQuery GSC Data Sample (Optional)",
      source: "bigquery",
      metrics: ["clicks", "impressions"],
      dimensions: ["query", "page"],
      orderBys: [{ metric: "clicks", desc: true }],
      limit: 100,
      filters: [],
    },
  ],

  // Output settings
  output: {
    defaultFormat: "table", // "table" | "json" | "csv"
    saveToFileByDefault: false,
    outDir: "./.out",
  },

  // Safety limits
  limits: {
    maxRows: 100000,
    maxRuntimeMs: 120000,
  },
};

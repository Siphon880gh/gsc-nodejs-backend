// config.js
export default {
  // Which data sources are enabled
  sources: {
    searchconsole: {
      enabled: true,
      // GSC JSON key file path (or use GOOGLE_APPLICATION_CREDENTIALS env)
      credentialsFile: process.env.GSC_CREDENTIALS_FILE || "",
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
    ga4: {
      enabled: true,
      // GA4 JSON key file path (or use GOOGLE_APPLICATION_CREDENTIALS env)
      credentialsFile: process.env.GA4_CREDENTIALS_FILE || "",
      propertyId: process.env.GA4_PROPERTY_ID || "",
      // Default date range if user skips input
      defaultDateRange: { start: "2025-01-01", end: "2025-12-31" },
      // Common metrics/dimensions friendly names
      metrics: {
        sessions: "sessions",
        totalUsers: "totalUsers",
        newUsers: "newUsers",
        activeUsers: "activeUsers",
        engagementTime: "averageSessionDuration",
        eventCount: "eventCount",
      },
      dimensions: {
        date: "date",
        pagePath: "pagePath",
        pageTitle: "pageTitle",
        source: "firstUserSource",
        medium: "firstUserMedium",
        country: "country",
      },
      // GA4 API page size default
      pageSize: 10000,
    },
    bigquery: {
      enabled: true,
      // Service account via env GOOGLE_APPLICATION_CREDENTIALS or inline
      projectId: process.env.BQ_PROJECT_ID || "",
      dataset: process.env.BQ_DATASET || "",
      // Optional table mapping helpers
      tables: {
        ga4Events: "events_*", // wildcards allowed
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
      id: "top-pages",
      label: "Top Pages by Users",
      source: "ga4", // "ga4" | "bigquery" | "any"
      metrics: ["totalUsers"],
      dimensions: ["pagePath", "pageTitle"],
      orderBys: [{ metric: "totalUsers", desc: true }],
      limit: 50,
      filters: [], // e.g., { dimension: "pagePath", op: "regex", value: "^/blog/" }
    },
    {
      id: "country-breakdown",
      label: "Users by Country",
      source: "ga4",
      metrics: ["totalUsers"],
      dimensions: ["country"],
      orderBys: [{ metric: "totalUsers", desc: true }],
      limit: 100,
      filters: [],
    },
    {
      id: "events-by-day",
      label: "Event Count by Date",
      source: "ga4",
      metrics: ["eventCount"],
      dimensions: ["date"],
      orderBys: [{ dimension: "date", desc: false }],
      limit: 365,
      filters: [],
    },
    {
      id: "sessions-by-source",
      label: "Sessions by Traffic Source",
      source: "ga4",
      metrics: ["sessions"],
      dimensions: ["source", "medium"],
      orderBys: [{ metric: "sessions", desc: true }],
      limit: 100,
      filters: [],
    },
    {
      id: "bq-events-sample",
      label: "BigQuery Events Sample",
      source: "bigquery",
      metrics: ["event_count"],
      dimensions: ["event_name", "page_location"],
      orderBys: [{ metric: "event_count", desc: true }],
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

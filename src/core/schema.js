/**
 * Shared types and schemas for analytics queries
 */

/**
 * @typedef {Object} DateRange
 * @property {string} start - Start date in YYYY-MM-DD format
 * @property {string} end - End date in YYYY-MM-DD format
 */

/**
 * @typedef {Object} OrderBy
 * @property {string} [metric] - Metric name to order by
 * @property {string} [dimension] - Dimension name to order by
 * @property {boolean} [desc] - Whether to sort descending (default: false)
 */

/**
 * @typedef {Object} Filter
 * @property {string} type - "metric" | "dimension"
 * @property {string} field - Field name
 * @property {string} op - Operator: "eq" | "neq" | "gt" | "lt" | "regex" | "contains"
 * @property {string|number} value - Filter value
 */

/**
 * @typedef {Object} NormalizedQuery
 * @property {string} source - "ga4" | "bigquery"
 * @property {DateRange} dateRange - Date range for the query
 * @property {string[]} metrics - Array of metric names
 * @property {string[]} dimensions - Array of dimension names
 * @property {OrderBy[]} [orderBys] - Array of ordering specifications
 * @property {number} [limit] - Maximum number of rows to return
 * @property {Filter[]} [filters] - Array of filter specifications
 */

/**
 * @typedef {Object} QueryResult
 * @property {Object[]} rows - Array of result rows
 * @property {number} totalRows - Total number of rows returned
 * @property {Object} metadata - Additional metadata about the query
 */

// Common GA4 metrics
export const GA4_METRICS = {
  sessions: "sessions",
  totalUsers: "totalUsers",
  newUsers: "newUsers",
  activeUsers: "activeUsers",
  averageSessionDuration: "averageSessionDuration",
  eventCount: "eventCount",
  bounceRate: "bounceRate",
  conversionRate: "conversionRate",
  revenue: "totalRevenue",
};

// Common GA4 dimensions
export const GA4_DIMENSIONS = {
  date: "date",
  pagePath: "pagePath",
  pageTitle: "pageTitle",
  firstUserSource: "firstUserSource",
  firstUserMedium: "firstUserMedium",
  country: "country",
  city: "city",
  deviceCategory: "deviceCategory",
  operatingSystem: "operatingSystem",
  browser: "browser",
  eventName: "eventName",
  customEventParameter: "customEventParameter",
};

// Common BigQuery fields (for GA4 export)
export const BQ_FIELDS = {
  event_date: "event_date",
  event_name: "event_name",
  page_location: "page_location",
  page_title: "page_title",
  user_pseudo_id: "user_pseudo_id",
  session_id: "session_id",
  country: "country",
  city: "city",
  device_category: "device_category",
  operating_system: "operating_system",
  browser: "browser",
  source: "source",
  medium: "medium",
  campaign: "campaign",
  event_count: "event_count",
};

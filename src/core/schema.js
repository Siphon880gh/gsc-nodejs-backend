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
 * @property {string} source - "searchconsole" | "bigquery"
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

// Common GSC metrics
export const GSC_METRICS = {
  clicks: "clicks",
  impressions: "impressions",
  ctr: "ctr",
  position: "position",
};

// Common GSC dimensions
export const GSC_DIMENSIONS = {
  query: "query",
  page: "page",
  country: "country",
  device: "device",
  searchAppearance: "searchAppearance",
  date: "date",
};

// Common BigQuery fields (for GSC data)
export const BQ_FIELDS = {
  date: "date",
  query: "query",
  page: "page",
  country: "country",
  device: "device",
  search_appearance: "search_appearance",
  clicks: "clicks",
  impressions: "impressions",
  ctr: "ctr",
  position: "position",
};

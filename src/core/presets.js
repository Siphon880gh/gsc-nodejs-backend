/**
 * Common query presets for analytics
 */

export const GSC_PRESETS = [
  {
    id: "top-queries",
    label: "Top Queries by Clicks",
    description: "Most popular search queries by clicks",
    metrics: ["clicks", "impressions", "ctr", "position"],
    dimensions: ["query"],
    orderBys: [{ metric: "clicks", desc: true }],
    limit: 50,
  },
  {
    id: "top-pages",
    label: "Top Pages by Clicks",
    description: "Most clicked pages from search",
    metrics: ["clicks", "impressions", "ctr", "position"],
    dimensions: ["page"],
    orderBys: [{ metric: "clicks", desc: true }],
    limit: 50,
  },
  {
    id: "queries-by-country",
    label: "Queries by Country",
    description: "Search queries broken down by country",
    metrics: ["clicks", "impressions", "ctr", "position"],
    dimensions: ["query", "country"],
    orderBys: [{ metric: "clicks", desc: true }],
    limit: 100,
  },
  {
    id: "device-breakdown",
    label: "Performance by Device",
    description: "Search performance by device type",
    metrics: ["clicks", "impressions", "ctr", "position"],
    dimensions: ["device"],
    orderBys: [{ metric: "clicks", desc: true }],
    limit: 10,
  },
  {
    id: "search-appearance",
    label: "Search Appearance Types",
    description: "Performance by search appearance type",
    metrics: ["clicks", "impressions", "ctr", "position"],
    dimensions: ["searchAppearance"],
    orderBys: [{ metric: "clicks", desc: true }],
    limit: 20,
  },
];

export const BIGQUERY_PRESETS = [
  {
    id: "bq-gsc-sample",
    label: "BigQuery GSC Data Sample",
    description: "Sample of GSC data from BigQuery export",
    metrics: ["clicks", "impressions"],
    dimensions: ["query", "page"],
    orderBys: [{ metric: "clicks", desc: true }],
    limit: 100,
  },
  {
    id: "bq-daily-performance",
    label: "Daily Performance by Date",
    description: "Daily search performance from BigQuery",
    metrics: ["clicks", "impressions"],
    dimensions: ["date"],
    orderBys: [{ dimension: "date", desc: false }],
    limit: 365,
  },
];

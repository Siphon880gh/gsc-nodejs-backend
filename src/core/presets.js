/**
 * Common query presets for analytics
 */

export const GA4_PRESETS = [
  {
    id: "top-pages",
    label: "Top Pages by Users",
    description: "Most popular pages by total users",
    metrics: ["totalUsers"],
    dimensions: ["pagePath", "pageTitle"],
    orderBys: [{ metric: "totalUsers", desc: true }],
    limit: 50,
  },
  {
    id: "country-breakdown",
    label: "Users by Country",
    description: "User distribution by country",
    metrics: ["totalUsers"],
    dimensions: ["country"],
    orderBys: [{ metric: "totalUsers", desc: true }],
    limit: 100,
  },
  {
    id: "events-by-day",
    label: "Event Count by Date",
    description: "Daily event counts over time",
    metrics: ["eventCount"],
    dimensions: ["date"],
    orderBys: [{ dimension: "date", desc: false }],
    limit: 365,
  },
  {
    id: "sessions-by-source",
    label: "Sessions by Traffic Source",
    description: "Sessions broken down by traffic source and medium",
    metrics: ["sessions"],
    dimensions: ["firstUserSource", "firstUserMedium"],
    orderBys: [{ metric: "sessions", desc: true }],
    limit: 100,
  },
  {
    id: "engagement-metrics",
    label: "Engagement Metrics",
    description: "Key engagement metrics by page",
    metrics: ["sessions", "totalUsers", "averageSessionDuration"],
    dimensions: ["pagePath"],
    orderBys: [{ metric: "sessions", desc: true }],
    limit: 50,
  },
];

export const BIGQUERY_PRESETS = [
  {
    id: "bq-events-sample",
    label: "BigQuery Events Sample",
    description: "Sample of events from BigQuery export",
    metrics: ["event_count"],
    dimensions: ["event_name", "page_location"],
    orderBys: [{ metric: "event_count", desc: true }],
    limit: 100,
  },
  {
    id: "bq-pageviews",
    label: "Page Views by Date",
    description: "Daily page views from BigQuery",
    metrics: ["event_count"],
    dimensions: ["event_date"],
    orderBys: [{ dimension: "event_date", desc: false }],
    limit: 365,
  },
];

import runBQ from "../datasources/bigquery.js";
import runGSC from "../datasources/searchconsole.js";
import { validateQuery } from "../cli/validators.js";

/**
 * @typedef NormalizedQuery
 * @property {string} source - "searchconsole" | "bigquery"
 * @property {Object} dateRange - {start: string, end: string}
 * @property {string[]} metrics - Array of metric names
 * @property {string[]} dimensions - Array of dimension names
 * @property {Array} orderBys - Array of {metric?: string, dimension?: string, desc?: boolean}
 * @property {number} limit - Maximum number of rows
 * @property {Array} filters - Array of filter objects
 */

export async function runQuery(answers, cfg, auth = null) {
  const normalized = normalize(answers, cfg);
  
  // Validate the normalized query
  const errors = validateQuery(normalized);
  if (errors.length > 0) {
    throw new Error(`Query validation failed: ${errors.join(", ")}`);
  }

  // Route to appropriate data source
  if (normalized.source === "searchconsole") {
    return runGSC(normalized, cfg, auth);
  } else if (normalized.source === "bigquery") {
    return runBQ(normalized, cfg);
  } else {
    throw new Error(`Unsupported source: ${normalized.source}`);
  }
}

function normalize(answers, cfg) {
  const source = answers.source;
  const sourceConfig = cfg.sources[source];
  
  // Handle preset queries
  if (answers.mode === "preset") {
    const preset = cfg.presets.find(p => p.id === answers.preset);
    if (!preset) {
      throw new Error(`Preset not found: ${answers.preset}`);
    }

    return {
      source,
      dateRange: getDateRange(answers),
      metrics: preset.metrics,
      dimensions: preset.dimensions,
      orderBys: preset.orderBys || [],
      limit: Math.min(preset.limit || 1000, cfg.limits.maxRows),
      filters: preset.filters || [],
    };
  }

  // Handle ad-hoc queries
  return {
    source,
    dateRange: getDateRange(answers),
    metrics: answers.metrics || [],
    dimensions: answers.dimensions || [],
    orderBys: answers.orderBys || [],
    limit: Math.min(answers.limit || 1000, cfg.limits.maxRows),
    filters: answers.filters || [],
  };
}

function getDateRange(answers) {
  const today = new Date();
  const formatDate = (date) => date.toISOString().split('T')[0];

  switch (answers.dateRangeType) {
    case "last7":
      const last7 = new Date(today);
      last7.setDate(today.getDate() - 7);
      return { start: formatDate(last7), end: formatDate(today) };
    
    case "last28":
      const last28 = new Date(today);
      last28.setDate(today.getDate() - 28);
      return { start: formatDate(last28), end: formatDate(today) };
    
    case "last90":
      const last90 = new Date(today);
      last90.setDate(today.getDate() - 90);
      return { start: formatDate(last90), end: formatDate(today) };
    
    case "custom":
      return { start: answers.customStartDate, end: answers.customEndDate };
    
    default:
      throw new Error(`Unknown date range type: ${answers.dateRangeType}`);
  }
}

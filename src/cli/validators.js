export function validateConfig(cfg) {
  const errors = [];

  // Check Search Console configuration
  if (cfg.sources.searchconsole?.enabled) {
    if (!cfg.sources.searchconsole.siteUrl && !process.env.GSC_SITE_URL) {
      errors.push("GSC site URL is required (set GSC_SITE_URL env var or in config)");
    }
  }

  // Check GA4 configuration
  if (cfg.sources.ga4?.enabled) {
    if (!cfg.sources.ga4.propertyId && !process.env.GA4_PROPERTY_ID) {
      errors.push("GA4 property ID is required (set GA4_PROPERTY_ID env var or in config)");
    }
  }

  // Check BigQuery configuration
  if (cfg.sources.bigquery?.enabled) {
    if (!cfg.sources.bigquery.projectId && !process.env.BQ_PROJECT_ID) {
      errors.push("BigQuery project ID is required (set BQ_PROJECT_ID env var or in config)");
    }
    if (!cfg.sources.bigquery.dataset && !process.env.BQ_DATASET) {
      errors.push("BigQuery dataset is required (set BQ_DATASET env var or in config)");
    }
  }

  // Check that at least one source is enabled
  const enabledSources = Object.entries(cfg.sources)
    .filter(([, v]) => v.enabled);
  
  if (enabledSources.length === 0) {
    errors.push("At least one data source must be enabled");
  }

  return errors;
}

export function validateDateRange(dateRange) {
  const { start, end } = dateRange;
  
  if (!start || !end) {
    return "Start and end dates are required";
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime())) {
    return "Invalid start date format";
  }

  if (isNaN(endDate.getTime())) {
    return "Invalid end date format";
  }

  if (startDate > endDate) {
    return "Start date must be before end date";
  }

  return null;
}

export function validateQuery(query) {
  const errors = [];

  if (!query.metrics || query.metrics.length === 0) {
    errors.push("At least one metric is required");
  }

  if (!query.dimensions || query.dimensions.length === 0) {
    errors.push("At least one dimension is required");
  }

  if (!query.dateRange) {
    errors.push("Date range is required");
  } else {
    const dateError = validateDateRange(query.dateRange);
    if (dateError) {
      errors.push(dateError);
    }
  }

  return errors;
}

import pkg from "@googleapis/searchconsole";
const { google } = pkg;
import chalk from "chalk";

export default async function runGSC(query, cfg) {
  const gscConfig = cfg.sources.searchconsole;
  const siteUrl = process.env.GSC_SITE_URL || gscConfig.siteUrl;
  
  if (!siteUrl) {
    throw new Error("GSC site URL is required. Set GSC_SITE_URL environment variable or configure in config.js");
  }

  // Initialize GSC client
  const auth = new google.auth.GoogleAuth({
    keyFilename: gscConfig.credentialsFile || undefined,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  const searchconsole = google.searchconsole({ version: 'v1', auth });

  try {
    // Build the GSC request
    const request = {
      siteUrl: siteUrl,
      requestBody: {
        startDate: query.dateRange.start,
        endDate: query.dateRange.end,
        dimensions: query.dimensions || [],
        rowLimit: query.limit || gscConfig.pageSize || 1000,
        startRow: query.startRow || 0,
        dimensionFilterGroups: buildDimensionFilters(query.filters),
        searchType: query.searchType || 'web',
        dataState: query.dataState || 'final',
      },
    };

    console.log(chalk.blue(`Querying GSC site ${siteUrl}...`));
    const response = await searchconsole.searchanalytics.query(request);
    
    // Transform response to array of objects
    const rows = (response.data.rows || []).map(row => {
      const result = {};
      
      // Add dimensions
      if (row.keys) {
        query.dimensions.forEach((dimension, index) => {
          result[dimension] = row.keys[index] || '';
        });
      }
      
      // Add metrics (clicks, impressions, ctr, position)
      if (row.clicks !== undefined) result.clicks = row.clicks;
      if (row.impressions !== undefined) result.impressions = row.impressions;
      if (row.ctr !== undefined) result.ctr = row.ctr;
      if (row.position !== undefined) result.position = row.position;
      
      return result;
    });

    return rows;
    
  } catch (error) {
    if (error.code === 403) {
      throw new Error(`GSC access denied. Check that your service account has access to site ${siteUrl} and has the "Search Console" role.`);
    } else if (error.code === 404) {
      throw new Error(`GSC site ${siteUrl} not found. Check your site URL.`);
    } else if (error.code === 400) {
      throw new Error(`Invalid GSC query: ${error.message}`);
    } else {
      throw new Error(`GSC API error: ${error.message}`);
    }
  }
}

function buildDimensionFilters(filters) {
  if (!filters || filters.length === 0) return undefined;
  
  const filterGroups = [];
  const dimensionFilters = filters
    .filter(f => f.type === "dimension")
    .map(f => {
      const filter = {
        dimension: f.field,
      };
      
      switch (f.op) {
        case "eq":
          filter.expression = f.value;
          break;
        case "neq":
          filter.expression = f.value;
          filter.operator = "notEquals";
          break;
        case "contains":
          filter.expression = f.value;
          filter.operator = "contains";
          break;
        case "regex":
          filter.expression = f.value;
          filter.operator = "regex";
          break;
        default:
          throw new Error(`Unsupported dimension filter operator: ${f.op}`);
      }
      
      return filter;
    });
  
  if (dimensionFilters.length > 0) {
    filterGroups.push({
      filters: dimensionFilters,
      groupType: "and"
    });
  }
  
  return filterGroups.length > 0 ? filterGroups : undefined;
}

// Helper function to get available sites
export async function getAvailableSites(cfg) {
  const gscConfig = cfg.sources.searchconsole;
  
  const auth = new google.auth.GoogleAuth({
    keyFilename: gscConfig.credentialsFile || undefined,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  const searchconsole = google.searchconsole({ version: 'v1', auth });

  try {
    const response = await searchconsole.sites.list();
    return response.data.siteEntry || [];
  } catch (error) {
    throw new Error(`Failed to fetch GSC sites: ${error.message}`);
  }
}

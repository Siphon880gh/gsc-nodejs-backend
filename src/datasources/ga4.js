import { BetaAnalyticsDataClient } from "@google-analytics/data";
import chalk from "chalk";

export default async function runGA4(query, cfg) {
  const ga4Config = cfg.sources.ga4;
  const propertyId = process.env.GA4_PROPERTY_ID || ga4Config.propertyId;
  
  if (!propertyId) {
    throw new Error("GA4 property ID is required. Set GA4_PROPERTY_ID environment variable or configure in config.js");
  }

  // Initialize GA4 client
  const client = new BetaAnalyticsDataClient({
    keyFilename: ga4Config.credentialsFile || undefined,
  });

  try {
    // Build the GA4 request
    const request = {
      property: `properties/${propertyId}`,
      dateRanges: [{
        startDate: query.dateRange.start,
        endDate: query.dateRange.end,
      }],
      metrics: query.metrics.map(metric => ({ name: metric })),
      dimensions: query.dimensions.map(dimension => ({ name: dimension })),
      limit: query.limit || ga4Config.pageSize,
      orderBys: (query.orderBys || []).map(orderBy => {
        if (orderBy.metric) {
          return {
            metric: { metricName: orderBy.metric },
            desc: !!orderBy.desc,
          };
        } else if (orderBy.dimension) {
          return {
            dimension: { dimensionName: orderBy.dimension },
            desc: !!orderBy.desc,
          };
        }
        throw new Error(`Invalid orderBy: ${JSON.stringify(orderBy)}`);
      }),
      dimensionFilter: buildDimensionFilters(query.filters),
      metricFilter: buildMetricFilters(query.filters),
    };

    console.log(chalk.blue(`Querying GA4 property ${propertyId}...`));
    const [response] = await client.runReport(request);
    
    // Transform response to array of objects
    const dimensionHeaders = response.dimensionHeaders?.map(h => h.name) || [];
    const metricHeaders = response.metricHeaders?.map(h => h.name) || [];
    
    const rows = (response.rows || []).map(row => {
      const result = {};
      
      // Add dimensions
      dimensionHeaders.forEach((header, index) => {
        result[header] = row.dimensionValues?.[index]?.value || '';
      });
      
      // Add metrics
      metricHeaders.forEach((header, index) => {
        const value = row.metricValues?.[index]?.value;
        result[header] = value ? Number(value) : 0;
      });
      
      return result;
    });

    return rows;
    
  } catch (error) {
    if (error.code === 403) {
      throw new Error(`GA4 access denied. Check that your service account has access to property ${propertyId} and has the "Viewer" or "Analyst" role.`);
    } else if (error.code === 404) {
      throw new Error(`GA4 property ${propertyId} not found. Check your property ID.`);
    } else if (error.code === 400) {
      throw new Error(`Invalid GA4 query: ${error.message}`);
    } else {
      throw new Error(`GA4 API error: ${error.message}`);
    }
  }
}

function buildDimensionFilters(filters) {
  if (!filters || filters.length === 0) return undefined;
  
  const dimensionFilters = filters
    .filter(f => f.type === "dimension")
    .map(f => {
      const filter = {
        dimensionName: f.field,
      };
      
      switch (f.op) {
        case "eq":
          filter.stringFilter = { matchType: "EXACT", value: f.value };
          break;
        case "neq":
          filter.stringFilter = { matchType: "NOT_EXACT", value: f.value };
          break;
        case "contains":
          filter.stringFilter = { matchType: "CONTAINS", value: f.value };
          break;
        case "regex":
          filter.stringFilter = { matchType: "FULL_REGEXP", value: f.value };
          break;
        default:
          throw new Error(`Unsupported dimension filter operator: ${f.op}`);
      }
      
      return filter;
    });
  
  return dimensionFilters.length > 0 ? { andGroup: { expressions: dimensionFilters } } : undefined;
}

function buildMetricFilters(filters) {
  if (!filters || filters.length === 0) return undefined;
  
  const metricFilters = filters
    .filter(f => f.type === "metric")
    .map(f => {
      const filter = {
        metricName: f.field,
      };
      
      switch (f.op) {
        case "eq":
          filter.numericFilter = { operation: "EQUAL", value: { int64Value: f.value } };
          break;
        case "neq":
          filter.numericFilter = { operation: "NOT_EQUAL", value: { int64Value: f.value } };
          break;
        case "gt":
          filter.numericFilter = { operation: "GREATER_THAN", value: { int64Value: f.value } };
          break;
        case "lt":
          filter.numericFilter = { operation: "LESS_THAN", value: { int64Value: f.value } };
          break;
        default:
          throw new Error(`Unsupported metric filter operator: ${f.op}`);
      }
      
      return filter;
    });
  
  return metricFilters.length > 0 ? { andGroup: { expressions: metricFilters } } : undefined;
}

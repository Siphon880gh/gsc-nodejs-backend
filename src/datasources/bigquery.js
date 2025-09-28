import { BigQuery } from "@google-cloud/bigquery";
import chalk from "chalk";

export default async function runBQ(query, cfg) {
  const bqConfig = cfg.sources.bigquery;
  const projectId = process.env.BQ_PROJECT_ID || bqConfig.projectId;
  const dataset = process.env.BQ_DATASET || bqConfig.dataset;
  
  if (!projectId) {
    throw new Error("BigQuery project ID is required. Set BQ_PROJECT_ID environment variable or configure in config.js");
  }
  
  if (!dataset) {
    throw new Error("BigQuery dataset is required. Set BQ_DATASET environment variable or configure in config.js");
  }

  // Initialize BigQuery client
  const client = new BigQuery({
    projectId: projectId,
    location: bqConfig.location || "US",
  });

  try {
    // Build SQL query
    const sql = buildSQL(query, projectId, dataset, bqConfig);
    
    console.log(chalk.blue(`Querying BigQuery project ${projectId}, dataset ${dataset}...`));
    
    // Execute query
    const options = {
      query: sql,
      params: {
        start_date: query.dateRange.start,
        end_date: query.dateRange.end,
        limit: query.limit || 1000,
      },
    };

    const [job] = await client.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
    
  } catch (error) {
    if (error.code === 403) {
      throw new Error(`BigQuery access denied. Check that your service account has access to project ${projectId} and has the "Job User" and "Data Viewer" roles.`);
    } else if (error.code === 404) {
      throw new Error(`BigQuery project ${projectId} or dataset ${dataset} not found. Check your configuration.`);
    } else if (error.code === 400) {
      throw new Error(`Invalid BigQuery query: ${error.message}`);
    } else {
      throw new Error(`BigQuery API error: ${error.message}`);
    }
  }
}

function buildSQL(query, projectId, dataset, bqConfig) {
  const fields = [...query.dimensions, ...query.metrics]
    .map(field => `\`${field}\``)
    .join(", ");
  
  const orderBy = (query.orderBys || [])
    .map(ob => {
      const field = ob.metric || ob.dimension;
      const direction = ob.desc ? "DESC" : "ASC";
      return `\`${field}\` ${direction}`;
    })
    .join(", ");
  
  const whereClause = buildWhereClause(query);
  
  // Use the configured table (default to events_* for GA4 export)
  const table = bqConfig.tables?.ga4Events || "events_*";
  
  const sql = `
    SELECT ${fields}
    FROM \`${projectId}.${dataset}.${table}\`
    WHERE _TABLE_SUFFIX BETWEEN REPLACE(@start_date, '-', '') AND REPLACE(@end_date, '-', '')
    ${whereClause}
    ${orderBy ? `ORDER BY ${orderBy}` : ""}
    LIMIT @limit
  `;
  
  return sql.trim();
}

function buildWhereClause(query) {
  if (!query.filters || query.filters.length === 0) {
    return "";
  }
  
  const conditions = query.filters.map(filter => {
    const field = `\`${filter.field}\``;
    
    switch (filter.op) {
      case "eq":
        return `${field} = @${getParamName(filter)}`;
      case "neq":
        return `${field} != @${getParamName(filter)}`;
      case "gt":
        return `${field} > @${getParamName(filter)}`;
      case "lt":
        return `${field} < @${getParamName(filter)}`;
      case "contains":
        return `${field} LIKE '%' || @${getParamName(filter)} || '%'`;
      case "regex":
        return `REGEXP_CONTAINS(${field}, @${getParamName(filter)})`;
      default:
        throw new Error(`Unsupported filter operator: ${filter.op}`);
    }
  });
  
  return conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";
}

function getParamName(filter) {
  return `p_${filter.field.replace(/\W+/g, '_')}`;
}

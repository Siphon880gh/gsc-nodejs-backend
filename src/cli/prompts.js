import chalk from "chalk";
import { getSelectedSite, getVerifiedSites, hasValidSiteSelection } from "../utils/site-manager.js";

export async function buildPrompts(cfg) {
  const enabledSources = Object.entries(cfg.sources)
    .filter(([, v]) => v.enabled)
    .map(([k, v]) => ({ 
      name: k === 'bigquery' ? `${k.toUpperCase()} (Optional)` : k.toUpperCase(), 
      value: k 
    }));

  if (enabledSources.length === 0) {
    throw new Error("No data sources are enabled. Check your configuration.");
  }

  const base = [
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "GSC Query: Ad-hoc", value: "adhoc" },
        { name: "GSC Query: Report", value: "preset" },
        { name: "GSC List sites", value: "sites" },
        { name: "GSC Select site", value: "select_site" },
        { name: "Sign in with Google Account that has verified access to GSC", value: "auth" },
        { name: "Sign out", value: "signout" },
        { name: "Exit", value: "exit" },
      ],
    },
  ];

  return base;
}

export function buildSiteSelectionPrompts(verifiedSites) {
  if (verifiedSites.length === 0) {
    throw new Error("No verified Google Search Console properties found. Make sure you have access to GSC properties.");
  }

  const currentSite = getSelectedSite();
  
  return [
    {
      type: "list",
      name: "selectedSite",
      message: "Select a Google Search Console property",
      choices: verifiedSites.map(site => ({
        name: `${site.siteUrl} (${site.permissionLevel})`,
        value: site.siteUrl,
        short: site.siteUrl
      })),
      default: currentSite ? verifiedSites.findIndex(site => site.siteUrl === currentSite) : 0,
    }
  ];
}

export async function buildPresetPrompts(cfg, source) {
  const presets = cfg.presets.filter(p => p.source === source || p.source === "any");
  
  if (presets.length === 0) {
    throw new Error(`No presets available for ${source}`);
  }

  return [
    {
      type: "list",
      name: "preset",
      message: "Select a preset",
      choices: presets.map(p => ({ name: p.label, value: p.id })),
    },
    {
      type: "list",
      name: "dateRangeType",
      message: "Date range",
      choices: [
        { name: "Last 7 days", value: "last7" },
        { name: "Last 28 days", value: "last28" },
        { name: "Last 90 days", value: "last90" },
        { name: "Custom range", value: "custom" },
      ],
    },
    {
      type: "input",
      name: "customStartDate",
      message: "Start date (YYYY-MM-DD)",
      when: (answers) => answers.dateRangeType === "custom",
      validate: (input) => {
        if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
          return "Please enter a valid date in YYYY-MM-DD format";
        }
        return true;
      },
    },
    {
      type: "input",
      name: "customEndDate",
      message: "End date (YYYY-MM-DD)",
      when: (answers) => answers.dateRangeType === "custom",
      validate: (input) => {
        if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
          return "Please enter a valid date in YYYY-MM-DD format";
        }
        return true;
      },
    },
    {
      type: "number",
      name: "limit",
      message: "Limit results (max 100,000)",
      default: 1000,
      validate: (input) => {
        if (input < 1 || input > 100000) {
          return "Limit must be between 1 and 100,000";
        }
        return true;
      },
    },
    {
      type: "list",
      name: "outputFormat",
      message: "Output format",
      choices: [
        { name: "Table (console)", value: "table" },
        { name: "JSON", value: "json" },
        { name: "CSV", value: "csv" },
      ],
    },
    {
      type: "confirm",
      name: "saveToFile",
      message: "Save to file?",
      default: false,
    },
  ];
}

export async function buildAdhocPrompts(cfg, source) {
  const sourceConfig = cfg.sources[source];
  if (!sourceConfig) {
    throw new Error(`Source ${source} not configured`);
  }

  const metrics = Object.entries(sourceConfig.metrics || {})
    .map(([key, value]) => ({ name: `${key} (${value})`, value: value }));
  
  const dimensions = Object.entries(sourceConfig.dimensions || {})
    .map(([key, value]) => ({ name: `${key} (${value})`, value: value }));

  return [
    {
      type: "checkbox",
      name: "metrics",
      message: "Select metrics",
      choices: metrics,
      default: ["clicks", "impressions", "ctr", "position"],
      validate: (input) => {
        if (input.length === 0) {
          return "Please select at least one metric";
        }
        return true;
      },
    },
    {
      type: "checkbox",
      name: "dimensions",
      message: "Select dimensions",
      choices: dimensions,
      validate: (input) => {
        if (input.length === 0) {
          return "Please select at least one dimension";
        }
        return true;
      },
    },
    {
      type: "list",
      name: "dateRangeType",
      message: "Date range",
      choices: [
        { name: "Last 7 days", value: "last7" },
        { name: "Last 28 days", value: "last28" },
        { name: "Last 90 days", value: "last90" },
        { name: "Custom range", value: "custom" },
      ],
    },
    {
      type: "input",
      name: "customStartDate",
      message: "Start date (YYYY-MM-DD)",
      when: (answers) => answers.dateRangeType === "custom",
      validate: (input) => {
        if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
          return "Please enter a valid date in YYYY-MM-DD format";
        }
        return true;
      },
    },
    {
      type: "input",
      name: "customEndDate",
      message: "End date (YYYY-MM-DD)",
      when: (answers) => answers.dateRangeType === "custom",
      validate: (input) => {
        if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
          return "Please enter a valid date in YYYY-MM-DD format";
        }
        return true;
      },
    },
    {
      type: "number",
      name: "limit",
      message: "Limit results (max 100,000)",
      default: 1000,
      validate: (input) => {
        if (input < 1 || input > 100000) {
          return "Limit must be between 1 and 100,000";
        }
        return true;
      },
    },
    {
      type: "list",
      name: "outputFormat",
      message: "Output format",
      choices: [
        { name: "Table (console)", value: "table" },
        { name: "JSON", value: "json" },
        { name: "CSV", value: "csv" },
      ],
    },
    {
      type: "confirm",
      name: "saveToFile",
      message: "Save to file?",
      default: false,
    },
  ];
}

export function getDateRange(type, customStart, customEnd) {
  const today = new Date();
  const formatDate = (date) => date.toISOString().split('T')[0];

  switch (type) {
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
      return { start: customStart, end: customEnd };
    
    default:
      throw new Error(`Unknown date range type: ${type}`);
  }
}

/**
 * Build sorting selection prompts
 */
export async function buildSortingPrompts(rows) {
  if (!rows || rows.length === 0) {
    return { sorting: { enabled: false } };
  }

  // Get available columns from the first row
  const availableColumns = Object.keys(rows[0]);
  
  // Create organized choices with separators
  const choices = [
    { name: 'No Sorting', value: 'none' },
    { name: '', value: '', disabled: true },
    ...availableColumns.map(column => ({
      name: `ASC: ${column}`,
      value: { column, direction: 'asc' }
    })),
    { name: '', value: '', disabled: true },
    ...availableColumns.map(column => ({
      name: `DSC: ${column}`,
      value: { column, direction: 'desc' }
    }))
  ];
  
  return [
    {
      type: 'checkbox',
      name: 'sorting.columns',
      message: 'Select columns to sort by (order of selection = primary sorting, secondary sorting):',
      choices,
      validate: (input) => {
        if (input.length === 0) {
          return 'Please select at least one option';
        }
        if (input.includes('none') && input.length > 1) {
          return 'Cannot select "No Sorting" with other options';
        }
        
        // Check for duplicate columns (both ASC and DSC versions)
        const selectedColumns = input
          .filter(item => typeof item === 'object' && item.column)
          .map(item => item.column);
        
        const uniqueColumns = new Set(selectedColumns);
        if (selectedColumns.length !== uniqueColumns.size) {
          return 'Cannot select both ascending and descending versions of the same column';
        }
        
        return true;
      },
      // default: ['none']
    }
  ];
}

/**
 * Display sorting feedback to show what sorting is currently selected
 */
export function displaySortingFeedback(sortingConfig) {
  if (!sortingConfig?.columns || sortingConfig.columns.includes('none')) {
    console.log(chalk.gray('📊 No sorting applied'));
    return;
  }
  
  const sortItems = sortingConfig.columns.filter(item => 
    typeof item === 'object' && item.column && item.direction
  );
  
  if (sortItems.length === 0) {
    console.log(chalk.gray('📊 No sorting applied'));
    return;
  }
  
  const sortDescription = sortItems.map((item, index) => {
    const priority = index === 0 ? 'Primary' : index === 1 ? 'Secondary' : `Level ${index + 1}`;
    const direction = item.direction === 'asc' ? 'ascending' : 'descending';
    const directionIcon = item.direction === 'asc' ? '↑' : '↓';
    return `${priority}: ${item.column} ${directionIcon} (${direction})`;
  }).join(', ');
  
  console.log(chalk.blue(`📊 Sorting applied: ${sortDescription}`));
}

import chalk from "chalk";

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
        { name: "Run a query", value: "query" },
        { name: "Authenticate with Google", value: "auth" },
        { name: "List available sites", value: "sites" },
      ],
    },
    {
      type: "list",
      name: "source",
      message: "Select data source",
      choices: enabledSources,
      when: (answers) => answers.action === "query",
    },
    {
      type: "list",
      name: "mode",
      message: "Choose query mode",
      choices: [
        { name: "Run a preset", value: "preset" },
        { name: "Ad-hoc query", value: "adhoc" },
      ],
      when: (answers) => answers.action === "query",
    },
  ];

  return base;
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

# CLI Interface - Technical Details

## Overview

Interactive command-line interface built with Inquirer.js providing menu-driven access to Google Search Console data with OAuth2 authentication.

## Menu System

### Main Menu (`src/cli/prompts.js:16-28`)

```javascript
const base = [
  {
    type: "list",
    name: "action",
    message: "What would you like to do?",
    choices: [
      { name: "Run a query", value: "query" },
      { name: "Authenticate with Google", value: "auth" },
      { name: "List available sites", value: "sites" },
      { name: "Select/Change site", value: "select_site" },
      { name: "Exit", value: "exit" },
    ],
  }
];
```

### Conditional Prompts

Query-specific prompts only show when `action === "query"`:

```javascript
{
  type: "list",
  name: "source",
  message: "Select data source",
  choices: enabledSources,
  when: (answers) => answers.action === "query",
}
```

## Query Modes

### 1. Preset Queries (`src/cli/prompts.js:36-102`)

Built-in SEO analytics queries with predefined parameters:

```javascript
export async function buildPresetPrompts(cfg, source) {
  const presets = cfg.presets.filter(p => p.source === source);
  
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
    }
  ];
}
```

### 2. Ad-hoc Queries (`src/cli/prompts.js:104-205`)

Custom query builder with dynamic field selection:

```javascript
export async function buildAdhocPrompts(cfg, source) {
  const metrics = Object.entries(sourceConfig.metrics || {})
    .map(([key, value]) => ({ name: `${key} (${value})`, value: value }));
  
  return [
    {
      type: "checkbox",
      name: "metrics",
      message: "Select metrics",
      choices: metrics,
      validate: (input) => input.length > 0 ? true : "Please select at least one metric",
    }
  ];
}
```

## Site Selection

### Site Selection Handler (`src/cli/index.js:81-103`)

```javascript
async function handleSiteSelection(cfg) {
  const spinner = ora("Fetching available sites...").start();
  try {
    // Fetch sites first
    const verifiedSites = await getVerifiedSites(cfg);
    spinner.succeed(`Found ${verifiedSites.length} verified sites`);
    
    // Build prompts with the fetched sites
    const answers = await inquirer.prompt(buildSiteSelectionPrompts(verifiedSites));
    
    const success = saveSelectedSite(answers.selectedSite);
    if (success) {
      console.log(chalk.green(`Selected site: ${answers.selectedSite}`));
      console.log(chalk.blue("This site will be used for all queries until you change it."));
    }
  } catch (error) {
    spinner.fail("Site selection failed");
    console.error(chalk.red(error.message));
  }
}
```

### Site Selection Prompts (`src/cli/prompts.js:50-72`)

```javascript
export function buildSiteSelectionPrompts(verifiedSites) {
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
```

## Action Handlers

### Authentication Handler (`src/cli/index.js:40-64`)

```javascript
async function handleAuthentication(cfg) {
  const spinner = ora("Authenticating with Google...").start();
  try {
    // Set dummy site URL for authentication
    process.env.GSC_SITE_URL = "https://example.com/";
    
    const auth = await getOAuth2Client(cfg.sources.searchconsole);
    spinner.succeed("Authentication successful!");
  } catch (error) {
    spinner.fail("Authentication failed");
  }
}
```

### Site Listing Handler (`src/cli/index.js:47-62`)

```javascript
async function handleListSites(cfg) {
  const spinner = ora("Fetching available sites...").start();
  try {
    const sites = await getAvailableSites(cfg);
    spinner.succeed(`Found ${sites.length} sites`);
    
    sites.forEach((site, index) => {
      console.log(`${index + 1}. ${chalk.cyan(site.siteUrl)}`);
      console.log(`   Permission Level: ${chalk.gray(site.permissionLevel)}`);
    });
  } catch (error) {
    spinner.fail("Failed to fetch sites");
  }
}
```

## Input Validation

### Date Validation (`src/cli/prompts.js:66-84`)

```javascript
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
}
```

### Metric/Dimension Validation

```javascript
validate: (input) => {
  if (input.length === 0) {
    return "Please select at least one metric";
  }
  return true;
}
```

## Date Range Processing

### Date Calculation (`src/cli/prompts.js:207-233`)

```javascript
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
    
    case "custom":
      return { start: customStart, end: customEnd };
  }
}
```

## Output Configuration

### Format Selection

```javascript
{
  type: "list",
  name: "outputFormat",
  message: "Output format",
  choices: [
    { name: "Table (console)", value: "table" },
    { name: "JSON", value: "json" },
    { name: "CSV", value: "csv" },
  ],
}
```

### File Export Options

```javascript
{
  type: "confirm",
  name: "saveToFile",
  message: "Save to file?",
  default: false,
}
```

## User Experience

### Loading States

```javascript
const spinner = ora("Running query...").start();
try {
  const rows = await runQuery(answers, cfg);
  spinner.succeed(`Fetched ${rows.length} rows`);
} catch (e) {
  spinner.fail("Query failed");
}
```

### Error Handling

```javascript
try {
  // Query execution
} catch (e) {
  console.error(chalk.red(e.message));
  process.exitCode = 1;
}
```

### Color Coding

- **Success**: Green (`chalk.green`)
- **Error**: Red (`chalk.red`)
- **Info**: Blue (`chalk.blue`)
- **Warning**: Yellow (`chalk.yellow`)
- **Highlight**: Cyan (`chalk.cyan`)

## Configuration Integration

### Source Validation (`src/cli/validators.js:1-34`)

```javascript
export function validateConfig(cfg) {
  const errors = [];

  if (cfg.sources.searchconsole?.enabled) {
    if (!cfg.sources.searchconsole.siteUrl && !process.env.GSC_SITE_URL) {
      errors.push("GSC site URL is required");
    }
    if (!cfg.sources.searchconsole.credentialsFile && !process.env.GSC_CREDENTIALS_FILE) {
      errors.push("GSC credentials are required");
    }
  }

  return errors;
}
```

### Dynamic Source Loading

```javascript
const enabledSources = Object.entries(cfg.sources)
  .filter(([, v]) => v.enabled)
  .map(([k, v]) => ({ 
    name: k === 'bigquery' ? `${k.toUpperCase()} (Optional)` : k.toUpperCase(), 
    value: k 
  }));
```

## CLI Entry Point

### Main Function (`src/cli/index.js:105-194`)

```javascript
async function main() {
  try {
    const cfg = loadConfig();
    
    // Main CLI loop
    while (true) {
      try {
        const initialAnswers = await inquirer.prompt(await buildPrompts(cfg));
        
        // Handle different actions
        if (initialAnswers.action === "auth") {
          await handleAuthentication(cfg);
          await waitForEnter();
          continue;
        } else if (initialAnswers.action === "sites") {
          await handleListSites(cfg);
          await waitForEnter();
          continue;
        } else if (initialAnswers.action === "select_site") {
          await handleSiteSelection(cfg);
          await waitForEnter();
          continue;
        } else if (initialAnswers.action === "exit") {
          console.log(chalk.blue("Goodbye! 👋"));
          break;
        }
        
        // Query execution flow
        // ... rest of query logic
        await waitForEnter();
      } catch (e) {
        console.error(chalk.red(`Error: ${e.message}`));
        await waitForEnter();
      }
    }
  } catch (e) {
    console.error(chalk.red(`Configuration error: ${e.message}`));
  }
}
```

### Wait for Enter Helper (`src/cli/index.js:22-30`)

```javascript
async function waitForEnter() {
  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: 'Press Enter to continue...',
    validate: () => true
  }]);
}
```

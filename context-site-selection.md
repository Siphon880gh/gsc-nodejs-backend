# Site Selection - Technical Details

## Overview

Interactive site selection system that allows users to choose Google Search Console properties and remembers their choice across CLI sessions. Eliminates the need for manual environment variable configuration.

## Site Manager (`src/utils/site-manager.js` - 83 lines)

### Core Functions

```javascript
// Get currently selected site
export function getSelectedSite() {
  if (!existsSync(SITE_CONFIG_PATH)) return null;
  const config = JSON.parse(readFileSync(SITE_CONFIG_PATH, 'utf8'));
  return config.siteUrl;
}

// Save selected site
export function saveSelectedSite(siteUrl) {
  const config = { siteUrl, selectedAt: new Date().toISOString() };
  writeFileSync(SITE_CONFIG_PATH, JSON.stringify(config, null, 2));
  return true;
}

// Get verified sites only
export async function getVerifiedSites(cfg) {
  const sites = await getAvailableSites(cfg);
  return sites.filter(site => 
    site.permissionLevel === 'siteOwner' || site.permissionLevel === 'siteFullUser'
  );
}
```

### Site Storage

**File**: `.selected_site.json`
```json
{
  "siteUrl": "https://example.com/",
  "selectedAt": "2025-01-27T10:30:00.000Z"
}
```

## CLI Integration

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
  if (verifiedSites.length === 0) {
    throw new Error("No verified Google Search Console properties found.");
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
```

## Query Integration

### Automatic Site Usage (`src/cli/index.js:152-160`)

```javascript
// Check if we need to select a site for GSC queries
if (initialAnswers.source === "searchconsole") {
  if (!hasValidSiteSelection()) {
    console.log(chalk.yellow("No Google Search Console site selected."));
    console.log(chalk.blue("Please select a site first."));
    await handleSiteSelection(cfg);
    await waitForEnter();
    continue;
  }
  
  // Set the selected site as environment variable for the query
  const selectedSite = getSelectedSite();
  process.env.GSC_SITE_URL = selectedSite;
  console.log(chalk.blue(`Using site: ${selectedSite}`));
}
```

## User Experience Flow

1. **First Time**: User runs GSC query → CLI prompts to select site
2. **Site Selection**: Interactive list shows verified properties with permission levels
3. **Memory**: Selection saved to `.selected_site.json`
4. **Automatic Usage**: Selected site used for all future queries
5. **Easy Changes**: "Select/Change site" menu option to switch sites

## Features

- **Verified Properties Only**: Filters to show only properties with full access
- **Persistent Memory**: Remembers selection across CLI sessions
- **Interactive Selection**: Arrow key navigation with inquirer
- **Permission Display**: Shows permission level for each property
- **Default Selection**: Highlights currently selected site
- **Error Handling**: Graceful handling of API failures

## Configuration

### Environment Variables (Now Optional)
```bash
GSC_SITE_URL=https://yourdomain.com/  # Optional - CLI will prompt if not set
GSC_CREDENTIALS_FILE=./env/client_secret_*.json
```

### Git Ignore
```gitignore
.selected_site.json  # User's site selection
```

## Error Handling

- **No Sites Found**: Clear error message with guidance
- **API Failures**: Graceful fallback with retry options
- **Invalid Selection**: Validation and re-prompting
- **File System Errors**: Proper error messages for storage issues

## Benefits

- **No Manual Configuration**: Eliminates need to edit `.env` files
- **User-Friendly**: Interactive selection with clear options
- **Persistent**: Remembers choice across sessions
- **Flexible**: Easy to change sites anytime
- **Verified Only**: Only shows properties with proper access

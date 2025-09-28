#!/usr/bin/env node
// Suppress punycode deprecation warnings
const originalEmit = process.emit;
process.emit = function (name, data, ...args) {
  if (name === 'warning' && data && data.name === 'DeprecationWarning' && data.message.includes('punycode')) {
    return false;
  }
  return originalEmit.apply(process, arguments);
};

import "dotenv/config";
import inquirer from "inquirer";
import ora from "ora";
import chalk from "chalk";
import { loadConfig } from "../utils/config.js";
import { buildPrompts, buildPresetPrompts, buildAdhocPrompts, buildSiteSelectionPrompts } from "./prompts.js";
import { runQuery } from "../core/query-runner.js";
import { renderOutput } from "./renderers.js";
import { getOAuth2Client, getAvailableSites } from "../datasources/searchconsole.js";
import { saveSelectedSite, getSelectedSite, hasValidSiteSelection, clearSelectedSite, getVerifiedSites, signOut } from "../utils/site-manager.js";
import { ensureAuthentication } from "../utils/auth-helper.js";

// Helper function to wait for user to continue
async function waitForEnter() {
  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: 'Press Enter to continue...',
    validate: () => true
  }]);
}

async function handleAuthentication(cfg) {
  const spinner = ora("Authenticating with Google...").start();
  try {
    // Set a dummy site URL for authentication
    const originalSiteUrl = process.env.GSC_SITE_URL;
    process.env.GSC_SITE_URL = "https://example.com/";
    
    const auth = await getOAuth2Client(cfg.sources.searchconsole);
    
    // Restore original site URL
    if (originalSiteUrl) {
      process.env.GSC_SITE_URL = originalSiteUrl;
    } else {
      delete process.env.GSC_SITE_URL;
    }
    
    spinner.succeed("Authentication successful!");
    console.log(chalk.green("You are now authenticated with Google Search Console."));
    console.log(chalk.blue("You can now run queries without re-authenticating."));
  } catch (error) {
    spinner.fail("Authentication failed");
    console.error(chalk.red(error.message));
    process.exitCode = 1;
  }
}

async function handleListSites(cfg) {
  const spinner = ora("Fetching available sites...").start();
  try {
    // Ensure authentication first
    await ensureAuthentication(cfg);
    const sites = await getAvailableSites(cfg);
    spinner.succeed(`Found ${sites.length} sites`);
    
    if (sites.length === 0) {
      console.log(chalk.yellow("No Google Search Console properties found."));
      console.log(chalk.blue("Make sure you have access to Google Search Console properties."));
    } else {
      console.log(chalk.blue("\nAvailable Google Search Console properties:"));
      console.log("==========================================");
      
      sites.forEach((site, index) => {
        console.log(`${index + 1}. ${chalk.cyan(site.siteUrl)}`);
        console.log(`   Permission Level: ${chalk.gray(site.permissionLevel)}`);
        console.log("");
      });
      
      const currentSite = getSelectedSite();
      if (currentSite) {
        console.log(chalk.green(`Currently selected: ${currentSite}`));
      } else {
        console.log(chalk.blue("No site selected. Use 'Select/Change site' to choose a property."));
      }
    }
  } catch (error) {
    spinner.fail("Failed to fetch sites");
    console.error(chalk.red(error.message));
    process.exitCode = 1;
  }
}

async function handleSiteSelection(cfg) {
  const spinner = ora("Fetching available sites...").start();
  try {
    // Ensure authentication first
    await ensureAuthentication(cfg);
    // Fetch sites first
    const verifiedSites = await getVerifiedSites(cfg);
    spinner.succeed(`Found ${verifiedSites.length} verified sites`);
    
    // Build prompts with the fetched sites
    const answers = await inquirer.prompt(buildSiteSelectionPrompts(verifiedSites));
    
    const success = saveSelectedSite(answers.selectedSite);
    if (success) {
      console.log(chalk.green(`Selected site: ${answers.selectedSite}`));
      console.log(chalk.blue("This site will be used for all queries until you change it."));
    } else {
      console.log(chalk.red("Failed to save site selection"));
    }
  } catch (error) {
    spinner.fail("Site selection failed");
    console.error(chalk.red(error.message));
    process.exitCode = 1;
  }
}

async function handleSignOut() {
  console.log(chalk.blue("Signing out..."));
  
  const cleared = await signOut();
  
  if (cleared.length > 0) {
    console.log(chalk.green(`Successfully cleared: ${cleared.join(', ')}`));
    console.log(chalk.blue("You will need to authenticate again to use the CLI."));
  } else {
    console.log(chalk.yellow("No stored data found to clear."));
  }
}

async function main() {
  try {
    // Load and validate configuration first
    const cfg = loadConfig();
    
    // Main CLI loop
    while (true) {
      try {
        // Build initial prompts
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
        } else if (initialAnswers.action === "signout") {
          await handleSignOut();
          await waitForEnter();
          continue;
        } else if (initialAnswers.action === "exit") {
          console.log(chalk.blue("Goodbye! 👋"));
          break;
        }
        
        // Hardcode source to searchconsole since we only support GSC
        const source = "searchconsole";
        
        // Check if we need to select a site for GSC queries
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
        
        // Ensure authentication is available before running queries
        let auth;
        try {
          auth = await ensureAuthentication(cfg);
        } catch (error) {
          console.log(chalk.yellow("Authentication required. Please authenticate first."));
          await handleAuthentication(cfg);
          await waitForEnter();
          continue;
        }
        
        // Build additional prompts based on mode
        let additionalAnswers = {};
        if (initialAnswers.mode === "preset") {
          additionalAnswers = await inquirer.prompt(await buildPresetPrompts(cfg, source));
        } else if (initialAnswers.mode === "adhoc") {
          additionalAnswers = await inquirer.prompt(await buildAdhocPrompts(cfg, source));
        }
        
        // Merge all answers and add source
        const answers = { ...initialAnswers, ...additionalAnswers, source };
        
        const spinner = ora("Running query...").start();
        try {
          const rows = await runQuery(answers, cfg, auth);
          spinner.succeed(`Fetched ${rows.length} rows`);
          await renderOutput(rows, answers, cfg);
        } catch (e) {
          spinner.fail("Query failed");
          console.error(chalk.red(e.message));
        }
        
        await waitForEnter();
      } catch (e) {
        console.error(chalk.red(`Error: ${e.message}`));
        await waitForEnter();
      }
    }
  } catch (e) {
    console.error(chalk.red(`Configuration error: ${e.message}`));
    process.exitCode = 1;
  }
}

main();

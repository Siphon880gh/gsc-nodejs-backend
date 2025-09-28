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
import { buildPrompts, buildPresetPrompts, buildAdhocPrompts } from "./prompts.js";
import { runQuery } from "../core/query-runner.js";
import { renderOutput } from "./renderers.js";
import { getOAuth2Client, getAvailableSites } from "../datasources/searchconsole.js";

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
      
      console.log(chalk.blue("To use a property, set the GSC_SITE_URL environment variable:"));
      console.log(chalk.green(`export GSC_SITE_URL="${sites[0].siteUrl}"`));
    }
  } catch (error) {
    spinner.fail("Failed to fetch sites");
    console.error(chalk.red(error.message));
    process.exitCode = 1;
  }
}

async function main() {
  try {
    // Load and validate configuration first
    const cfg = loadConfig();
    
    // Build initial prompts
    const initialAnswers = await inquirer.prompt(await buildPrompts(cfg));
    
    // Handle different actions
    if (initialAnswers.action === "auth") {
      await handleAuthentication(cfg);
      return;
    } else if (initialAnswers.action === "sites") {
      await handleListSites(cfg);
      return;
    }
    
    // Build additional prompts based on mode
    let additionalAnswers = {};
    if (initialAnswers.mode === "preset") {
      additionalAnswers = await inquirer.prompt(await buildPresetPrompts(cfg, initialAnswers.source));
    } else if (initialAnswers.mode === "adhoc") {
      additionalAnswers = await inquirer.prompt(await buildAdhocPrompts(cfg, initialAnswers.source));
    }
    
    // Merge all answers
    const answers = { ...initialAnswers, ...additionalAnswers };
    
    const spinner = ora("Running query...").start();
    try {
      const rows = await runQuery(answers, cfg);
      spinner.succeed(`Fetched ${rows.length} rows`);
      await renderOutput(rows, answers, cfg);
    } catch (e) {
      spinner.fail("Query failed");
      console.error(chalk.red(e.message));
      process.exitCode = 1;
    }
  } catch (e) {
    console.error(chalk.red(`Configuration error: ${e.message}`));
    process.exitCode = 1;
  }
}

main();

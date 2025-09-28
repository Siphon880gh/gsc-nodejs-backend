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

async function main() {
  try {
    const cfg = loadConfig();
    
    // Build initial prompts
    const initialAnswers = await inquirer.prompt(await buildPrompts(cfg));
    
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

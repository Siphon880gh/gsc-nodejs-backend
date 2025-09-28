#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import { loadConfig } from "./src/utils/config.js";

console.log(chalk.blue("🔍 Testing Analytics CLI Setup...\n"));

try {
  // Test config loading
  console.log("📋 Loading configuration...");
  const cfg = loadConfig();
  console.log(chalk.green("✅ Configuration loaded successfully"));
  
  // Check enabled sources
  const enabledSources = Object.entries(cfg.sources)
    .filter(([, v]) => v.enabled)
    .map(([k]) => k);
  
  console.log(`📊 Enabled sources: ${enabledSources.join(", ")}`);
  
  // Check presets
  console.log(`🎯 Available presets: ${cfg.presets.length}`);
  cfg.presets.forEach(preset => {
    console.log(`   - ${preset.label} (${preset.source})`);
  });
  
  // Check environment variables
  console.log("\n🔧 Environment check:");
  const envVars = [
    "GSC_SITE_URL",
    "GSC_CREDENTIALS_FILE",
    "GA4_PROPERTY_ID",
    "GA4_CREDENTIALS_FILE", 
    "BQ_PROJECT_ID",
    "BQ_DATASET"
  ];
  
  envVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value) {
      console.log(chalk.green(`   ✅ ${envVar}: ${value}`));
    } else {
      console.log(chalk.yellow(`   ⚠️  ${envVar}: Not set`));
    }
  });
  
  console.log(chalk.green("\n🎉 Setup test completed successfully!"));
  console.log(chalk.blue("Run 'npm start' to begin using the CLI"));
  
} catch (error) {
  console.error(chalk.red("❌ Setup test failed:"));
  console.error(chalk.red(error.message));
  process.exit(1);
}

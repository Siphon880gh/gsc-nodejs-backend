import fs from "node:fs";
import path from "node:path";
import { stringify } from "csv-stringify/sync";
import chalk from "chalk";

export async function renderOutput(rows, answers, cfg) {
  const fmt = answers.outputFormat || cfg.output.defaultFormat;
  const shouldSave = answers.saveToFile ?? cfg.output.saveToFileByDefault;

  if (fmt === "json") {
    const json = JSON.stringify(rows, null, 2);
    if (shouldSave) {
      return save(json, "json", cfg);
    } else {
      console.log(json);
    }
  } else if (fmt === "csv") {
    const csv = stringify(rows, { header: true });
    if (shouldSave) {
      return save(csv, "csv", cfg);
    } else {
      process.stdout.write(csv);
    }
  } else {
    // default: table
    console.log(chalk.blue(`\nShowing first 50 rows of ${rows.length} total:\n`));
    console.table(rows.slice(0, 50));
    
    if (rows.length > 50) {
      console.log(chalk.yellow(`\n... and ${rows.length - 50} more rows`));
    }
  }
}

function save(content, ext, cfg) {
  fs.mkdirSync(cfg.output.outDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(cfg.output.outDir, `${timestamp}.${ext}`);
  fs.writeFileSync(file, content);
  console.log(chalk.green(`\nSaved to ${file}`));
}

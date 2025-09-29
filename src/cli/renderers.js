import fs from "node:fs";
import path from "node:path";
import { stringify } from "csv-stringify/sync";
import chalk from "chalk";

export async function renderOutput(rows, answers, cfg) {
  const fmt = answers.outputFormat || cfg.output.defaultFormat;
  const shouldSave = answers.saveToFile ?? cfg.output.saveToFileByDefault;
  
  // Apply sorting if enabled
  let sortedRows = rows;
  if (answers.sorting?.columns && !answers.sorting.columns.includes('none')) {
    sortedRows = applySorting(rows, answers.sorting);
  }

  if (fmt === "json") {
    const json = JSON.stringify(sortedRows, null, 2);
    if (shouldSave) {
      return save(json, "json", cfg);
    } else {
      console.log(json);
    }
  } else if (fmt === "csv") {
    const csv = stringify(sortedRows, { header: true });
    if (shouldSave) {
      return save(csv, "csv", cfg);
    } else {
      process.stdout.write(csv);
    }
  } else {
    // default: table
    console.log(chalk.blue(`\nShowing first 50 rows of ${sortedRows.length} total:\n`));
    
    // Format numbers to 3 decimal places for better readability
    const formattedRows = sortedRows.slice(0, 50).map(row => {
      const formattedRow = {};
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'number' && !Number.isInteger(value)) {
          // Round to 3 decimal places
          formattedRow[key] = Math.round(value * 1000) / 1000;
        } else {
          formattedRow[key] = value;
        }
      }
      return formattedRow;
    });
    
    console.table(formattedRows);
    
    if (sortedRows.length > 50) {
      console.log(chalk.yellow(`\n... and ${sortedRows.length - 50} more rows`));
    }
  }
}

export function applySorting(rows, sortingConfig) {
  // Handle new format with columns array
  if (sortingConfig?.columns) {
    if (sortingConfig.columns.includes('none') || sortingConfig.columns.length === 0) {
      return rows;
    }
    
    // Filter out separators and 'none' values, keeping only actual sort items
    const sortItems = sortingConfig.columns.filter(item => 
      item !== 'none' && 
      item !== 'separator1' && 
      item !== 'separator2' &&
      typeof item === 'object' && 
      item.column && 
      item.direction
    );
    
    if (sortItems.length === 0) {
      return rows;
    }
    
    return rows.sort((a, b) => {
      // Apply sorting for each column in order of selection (priority)
      for (const sortItem of sortItems) {
        const column = sortItem.column;
        const direction = sortItem.direction;
        
        const valueA = a[column];
        const valueB = b[column];
        
        let result = 0;
        if (valueA < valueB) {
          result = -1;
        } else if (valueA > valueB) {
          result = 1;
        }
        
        // Apply direction
        if (direction === 'desc') {
          result *= -1;
        }
        
        // If values are not equal, return the result
        // If they are equal, continue to next sorting column
        if (result !== 0) {
          return result;
        }
      }
      
      return 0; // All values are equal
    });
  }
  
  // Handle legacy format (for backward compatibility)
  if (!sortingConfig?.enabled || !sortingConfig?.primaryColumn) {
    return rows;
  }

  return rows.sort((a, b) => {
    // Primary sorting
    const primaryA = a[sortingConfig.primaryColumn];
    const primaryB = b[sortingConfig.primaryColumn];
    
    let primaryResult = 0;
    if (primaryA < primaryB) {
      primaryResult = -1;
    } else if (primaryA > primaryB) {
      primaryResult = 1;
    }
    
    // Apply primary direction
    if (sortingConfig.primaryDirection === 'desc') {
      primaryResult *= -1;
    }
    
    // If primary values are equal and secondary sorting is enabled
    if (primaryResult === 0 && sortingConfig?.hasSecondary && sortingConfig?.secondaryColumn) {
      const secondaryA = a[sortingConfig.secondaryColumn];
      const secondaryB = b[sortingConfig.secondaryColumn];
      
      let secondaryResult = 0;
      if (secondaryA < secondaryB) {
        secondaryResult = -1;
      } else if (secondaryA > secondaryB) {
        secondaryResult = 1;
      }
      
      // Apply secondary direction
      if (sortingConfig.secondaryDirection === 'desc') {
        secondaryResult *= -1;
      }
      
      return secondaryResult;
    }
    
    return primaryResult;
  });
}

function save(content, ext, cfg) {
  fs.mkdirSync(cfg.output.outDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(cfg.output.outDir, `${timestamp}.${ext}`);
  fs.writeFileSync(file, content);
  console.log(chalk.green(`\nSaved to ${file}`));
}

import fs from "node:fs";
import path from "node:path";
import { stringify } from "csv-stringify/sync";
import chalk from "chalk";
import inquirer from "inquirer";

// Global filter state
let currentFilters = {
  queryFilters: [], // Array of {field, operator, value}
  compareFilters: [] // Array of {field, operator, value}
};

// Filter utility functions
function getAvailableFields(rows) {
  const allKeys = new Set();
  rows.forEach(row => {
    Object.keys(row).forEach(key => {
      allKeys.add(key);
    });
  });
  
  // Filter out fields that are always null/undefined
  return Array.from(allKeys).filter(field => {
    return rows.some(row => row[field] != null);
  });
}

function parseNumericValue(input) {
  // Extract first signed/decimal number from input string
  const match = input.match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

function applyQueryFilter(rows, field, operator, value) {
  return rows.filter(row => {
    const fieldValue = String(row[field] ?? '').trim();
    const searchValue = value.trim();
    
    switch (operator) {
      case '=':
        return fieldValue.toLowerCase() === searchValue.toLowerCase();
      case '*':
        return fieldValue.toLowerCase().includes(searchValue.toLowerCase());
      case '<>':
        return fieldValue.toLowerCase() !== searchValue.toLowerCase();
      case '<*>':
        return !fieldValue.toLowerCase().includes(searchValue.toLowerCase());
      default:
        return true;
    }
  });
}

function applyCompareFilter(rows, field, operator, value) {
  return rows.filter(row => {
    const fieldValue = row[field];
    const numericValue = parseNumericValue(String(fieldValue ?? ''));
    
    if (numericValue === null) {
      return false; // Exclude non-numeric values
    }
    
    switch (operator) {
      case '>=':
        return numericValue >= value;
      case '<=':
        return numericValue <= value;
      case '>':
        return numericValue > value;
      case '<':
        return numericValue < value;
      case '=':
        return numericValue === value;
      default:
        return true;
    }
  });
}

function applyAllFilters(rows) {
  let filteredRows = rows;
  
  // Apply query filters
  for (const filter of currentFilters.queryFilters) {
    filteredRows = applyQueryFilter(filteredRows, filter.field, filter.operator, filter.value);
  }
  
  // Apply compare filters
  for (const filter of currentFilters.compareFilters) {
    filteredRows = applyCompareFilter(filteredRows, filter.field, filter.operator, filter.value);
  }
  
  return filteredRows;
}

function getFiltersSummary() {
  const summaries = [];
  
  currentFilters.queryFilters.forEach(filter => {
    summaries.push(`${filter.field}${filter.operator}${filter.value}`);
  });
  
  currentFilters.compareFilters.forEach(filter => {
    summaries.push(`${filter.field}${filter.operator}${filter.value}`);
  });
  
  return summaries.length > 0 ? `Filters: ${summaries.join('; ')}` : '';
}

function clearAllFilters() {
  currentFilters.queryFilters = [];
  currentFilters.compareFilters = [];
}

// Export function to clear filters from other modules
export function clearFilters() {
  clearAllFilters();
}

export async function renderOutput(rows, answers, cfg) {
  const fmt = answers.outputFormat || cfg.output.defaultFormat;
  const shouldSave = answers.saveToFile ?? cfg.output.saveToFileByDefault;
  
  // Apply filters first
  let filteredRows = applyAllFilters(rows);
  
  // Apply sorting if enabled
  let sortedRows = filteredRows;
  if (answers.sorting?.columns && !answers.sorting.columns.includes('none')) {
    sortedRows = applySorting(filteredRows, answers.sorting);
  }

  if (fmt === "json") {
    const json = JSON.stringify(sortedRows, null, 2);
    if (shouldSave) {
      return save(json, "json", cfg);
    } else {
      console.log(json);
    }
    return true; // Continue to next prompt
  } else if (fmt === "csv") {
    const csv = stringify(sortedRows, { header: true });
    if (shouldSave) {
      return save(csv, "csv", cfg);
    } else {
      process.stdout.write(csv);
    }
    return true; // Continue to next prompt
  } else {
    // default: table with pagination
    return await displayTableWithPagination(rows, sortedRows);
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

async function displayTableWithPagination(originalRows, filteredRows) {
  const rowsPerPage = 50;
  let currentPage = 0;
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  
  // Show filter summary if any filters are active
  const filterSummary = getFiltersSummary();
  if (filterSummary) {
    console.log(chalk.cyan(`\n${filterSummary}\n`));
  }
  
  console.log(chalk.blue(`\nTotal rows: ${filteredRows.length} (${totalPages} pages)\n`));
  
  while (currentPage < totalPages) {
    const startIndex = currentPage * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, filteredRows.length);
    const pageRows = filteredRows.slice(startIndex, endIndex);
    
    console.log(chalk.gray(`Page ${currentPage + 1} of ${totalPages} (rows ${startIndex + 1}-${endIndex}):\n`));
    
    // Format numbers to 3 decimal places for better readability
    const formattedRows = pageRows.map(row => {
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
    
    currentPage++;
    
    if (currentPage < totalPages) {
      console.log(chalk.yellow(`\nPress Enter to continue, 'q' to quit, 'fq' for filter by query, 'fc' for filter by compare, 'fx' to clear filters...`));
      const result = await waitForEnterOrQuit(originalRows);
      if (result === 'quit') {
        console.log(chalk.blue('\nReturning to main menu...'));
        clearAllFilters(); // Clear filters when returning to menu
        return false; // Return to menu
      } else if (result === 'filter') {
        // Re-apply filters and restart pagination
        const newFilteredRows = applyAllFilters(originalRows);
        return await displayTableWithPagination(originalRows, newFilteredRows);
      }
      console.clear(); // Clear screen for next page
    }
  }
  
  console.log(chalk.green(`\n✅ Displayed all ${filteredRows.length} rows across ${totalPages} pages`));
  clearAllFilters(); // Clear filters when viewing is completed
  return true; // Completed successfully
}

async function waitForEnterOrQuit(originalRows) {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('', async (answer) => {
      rl.close();
      const input = answer.toLowerCase().trim();
      
      if (input === 'q') {
        resolve('quit');
      } else if (input === 'fq') {
        await handleQueryFilter(originalRows);
        resolve('filter');
      } else if (input === 'fc') {
        await handleCompareFilter(originalRows);
        resolve('filter');
      } else if (input === 'fx') {
        clearAllFilters();
        console.log(chalk.green('All filters cleared.'));
        resolve('filter');
      } else {
        // Any other input (including Enter with no text) continues to next page
        resolve('continue');
      }
    });
  });
}

async function handleQueryFilter(originalRows) {
  const availableFields = getAvailableFields(originalRows);
  
  if (availableFields.length === 0) {
    console.log(chalk.red('No fields available for filtering.'));
    return;
  }
  
  const fieldAnswer = await inquirer.prompt([{
    type: 'list',
    name: 'field',
    message: 'Which field?',
    choices: availableFields
  }]);
  
  console.log(`\nEnter expression:
  =value  → exact match (case-insensitive)
  *value  → wildcard match (contains anywhere)
  <>value → not equal exact
  <*>value → not equal wildcard
  
Examples: =Acme, *los angeles, <>Closed, <*>test
Enter 'q' to cancel:`);
  
  const expressionAnswer = await inquirer.prompt([{
    type: 'input',
    name: 'expression',
    message: '',
    validate: (input) => {
      if (input.toLowerCase().trim() === 'q') {
        return true; // Allow 'q' to cancel
      }
      if (!input.trim()) {
        return 'Expression cannot be empty';
      }
      // Check for valid operators: =, *, <>, <*>
      if (input.startsWith('=') || input.startsWith('*') || input.startsWith('<>') || input.startsWith('<*>')) {
        return true;
      }
      return 'Invalid expression format. Use =value, *value, <>value, or <*>value';
    }
  }]);
  
  // Check if user wants to cancel
  if (expressionAnswer.expression.toLowerCase().trim() === 'q') {
    console.log(chalk.blue('Filter cancelled.'));
    return;
  }
  
  const expression = expressionAnswer.expression;
  let operator, value;
  
  if (expression.startsWith('<*>')) {
    operator = '<*>';
    value = expression.substring(3);
  } else if (expression.startsWith('<>')) {
    operator = '<>';
    value = expression.substring(2);
  } else if (expression.startsWith('=')) {
    operator = '=';
    value = expression.substring(1);
  } else if (expression.startsWith('*')) {
    operator = '*';
    value = expression.substring(1);
  }
  
  if (operator && value !== undefined) {
    
    // Apply the filter to the original dataset to test
    const filteredRows = applyQueryFilter(originalRows, fieldAnswer.field, operator, value);
    
    if (filteredRows.length === 0) {
      console.log(chalk.yellow('Warning: Filter resulted in zero results, but filter will be kept.'));
    } else {
      console.log(chalk.green(`Filter applied: ${filteredRows.length} rows match.`));
    }
    
    // Add to current filters
    currentFilters.queryFilters.push({
      field: fieldAnswer.field,
      operator: operator,
      value: value
    });
  }
}

async function handleCompareFilter(originalRows) {
  const availableFields = getAvailableFields(originalRows);
  
  if (availableFields.length === 0) {
    console.log(chalk.red('No fields available for filtering.'));
    return;
  }
  
  const fieldAnswer = await inquirer.prompt([{
    type: 'list',
    name: 'field',
    message: 'Which field?',
    choices: availableFields
  }]);
  
  const operatorAnswer = await inquirer.prompt([{
    type: 'list',
    name: 'operator',
    message: 'Choose operator:',
    choices: ['>=', '<=', '>', '<', '=']
  }]);
  
  console.log(`\nEnter number to compare against:
Enter 'q' to cancel:`);
  
  const valueAnswer = await inquirer.prompt([{
    type: 'input',
    name: 'value',
    message: '',
    validate: (input) => {
      if (input.toLowerCase().trim() === 'q') {
        return true; // Allow 'q' to cancel
      }
      if (!input.trim()) {
        return 'Value cannot be empty';
      }
      const numericValue = parseNumericValue(input);
      if (numericValue === null) {
        return 'Invalid number format';
      }
      return true;
    }
  }]);
  
  // Check if user wants to cancel
  if (valueAnswer.value.toLowerCase().trim() === 'q') {
    console.log(chalk.blue('Filter cancelled.'));
    return;
  }
  
  const numericValue = parseNumericValue(valueAnswer.value);
  
  // Test if field has numeric data
  const testRows = originalRows.slice(0, 10); // Test first 10 rows
  const hasNumericData = testRows.some(row => {
    const fieldValue = row[fieldAnswer.field];
    return parseNumericValue(String(fieldValue ?? '')) !== null;
  });
  
  if (!hasNumericData) {
    console.log(chalk.yellow('Warning: Comparison failed: non-numeric data in field. Filter not applied.'));
    return;
  }
  
  // Apply the filter
  const filteredRows = applyCompareFilter(originalRows, fieldAnswer.field, operatorAnswer.operator, numericValue);
  
  if (filteredRows.length === 0) {
    console.log(chalk.yellow('Warning: Filter resulted in zero results, but filter will be kept.'));
  } else {
    console.log(chalk.green(`Filter applied: ${filteredRows.length} rows match.`));
  }
  
  // Add to current filters
  currentFilters.compareFilters.push({
    field: fieldAnswer.field,
    operator: operatorAnswer.operator,
    value: numericValue
  });
}

function save(content, ext, cfg) {
  fs.mkdirSync(cfg.output.outDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(cfg.output.outDir, `${timestamp}.${ext}`);
  fs.writeFileSync(file, content);
  console.log(chalk.green(`\nSaved to ${file}`));
}

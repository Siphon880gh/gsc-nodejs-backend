# Filter Implementation Configuration

## Overview
This document describes the filter system implementation for the CLI application, including architecture, patterns, and guidelines for adding new filter types.

## Architecture

### Core Components

#### 1. Filter State Management
```javascript
// Global filter state in renderers.js
let currentFilters = {
  queryFilters: [], // Array of {field, operator, value}
  compareFilters: [] // Array of {field, operator, value}
};
```

#### 2. Filter Types
- **Query Filters (`fq`)**: String-based matching with operators `=`, `*`, `<>`, `<*>`
- **Compare Filters (`fc`)**: Numeric comparison with operators `>=`, `<=`, `>`, `<`, `=`
- **Clear Filters (`fx`)**: Remove all active filters

#### 3. Filter Lifecycle
1. **Apply**: Filters are applied to original dataset
2. **Persist**: Filters remain active across pagination
3. **Clear**: Filters are cleared on completion or quit

## Implementation Patterns

### 1. Adding New Filter Types

#### Step 1: Update Filter State
```javascript
let currentFilters = {
  queryFilters: [],
  compareFilters: [],
  // Add new filter type here
  newFilterType: []
};
```

#### Step 2: Create Filter Application Function
```javascript
function applyNewFilter(rows, field, operator, value) {
  return rows.filter(row => {
    const fieldValue = row[field];
    // Implement filter logic here
    switch (operator) {
      case 'operator1':
        return /* condition */;
      case 'operator2':
        return /* condition */;
      default:
        return true;
    }
  });
}
```

#### Step 3: Update applyAllFilters Function
```javascript
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
  
  // Apply new filter type
  for (const filter of currentFilters.newFilterType) {
    filteredRows = applyNewFilter(filteredRows, filter.field, filter.operator, filter.value);
  }
  
  return filteredRows;
}
```

#### Step 4: Create Handler Function
```javascript
async function handleNewFilter(originalRows) {
  const availableFields = getAvailableFields(originalRows);
  
  if (availableFields.length === 0) {
    console.log(chalk.red('No fields available for filtering.'));
    return;
  }
  
  // Field selection
  const fieldAnswer = await inquirer.prompt([{
    type: 'list',
    name: 'field',
    message: 'Which field?',
    choices: availableFields
  }]);
  
  // Operator selection
  const operatorAnswer = await inquirer.prompt([{
    type: 'list',
    name: 'operator',
    message: 'Choose operator:',
    choices: ['operator1', 'operator2', 'operator3']
  }]);
  
  // Value input with cancel option
  console.log(`\nEnter value:
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
      // Add validation logic here
      return true;
    }
  }]);
  
  // Check if user wants to cancel
  if (valueAnswer.value.toLowerCase().trim() === 'q') {
    console.log(chalk.blue('Filter cancelled.'));
    return;
  }
  
  // Apply and test filter
  const filteredRows = applyNewFilter(originalRows, fieldAnswer.field, operatorAnswer.operator, valueAnswer.value);
  
  if (filteredRows.length === 0) {
    console.log(chalk.yellow('Warning: Filter resulted in zero results, but filter will be kept.'));
  } else {
    console.log(chalk.green(`Filter applied: ${filteredRows.length} rows match.`));
  }
  
  // Add to current filters
  currentFilters.newFilterType.push({
    field: fieldAnswer.field,
    operator: operatorAnswer.operator,
    value: valueAnswer.value
  });
}
```

#### Step 5: Update waitForEnterOrQuit Function
```javascript
async function waitForEnterOrQuit(originalRows) {
  // ... existing code ...
  
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
      } else if (input === 'fn') { // New filter command
        await handleNewFilter(originalRows);
        resolve('filter');
      } else if (input === 'fx') {
        clearAllFilters();
        console.log(chalk.green('All filters cleared.'));
        resolve('filter');
      } else {
        resolve('continue');
      }
    });
  });
}
```

#### Step 6: Update Prompt Message
```javascript
console.log(chalk.yellow(`\nPress Enter to continue, 'q' to quit, 'fq' for filter by query, 'fc' for filter by compare, 'fn' for new filter, 'fx' to clear filters...`));
```

#### Step 7: Update clearAllFilters Function
```javascript
function clearAllFilters() {
  currentFilters.queryFilters = [];
  currentFilters.compareFilters = [];
  currentFilters.newFilterType = []; // Add new filter type
}
```

#### Step 8: Update getFiltersSummary Function
```javascript
function getFiltersSummary() {
  const summaries = [];
  
  currentFilters.queryFilters.forEach(filter => {
    summaries.push(`${filter.field}${filter.operator}${filter.value}`);
  });
  
  currentFilters.compareFilters.forEach(filter => {
    summaries.push(`${filter.field}${filter.operator}${filter.value}`);
  });
  
  // Add new filter type
  currentFilters.newFilterType.forEach(filter => {
    summaries.push(`${filter.field}${filter.operator}${filter.value}`);
  });
  
  return summaries.length > 0 ? `Filters: ${summaries.join('; ')}` : '';
}
```

### 2. Filter Command Patterns

#### Command Naming Convention
- **`fq`**: Field-based Query filter (string matching)
- **`fc`**: Field-based Compare filter (numeric comparison)
- **`fn`**: Field-based New filter (custom type)
- **`fx`**: Field-based eXit (clear all filters)

#### Operator Patterns

##### String Operators
- **`=`**: Exact match (case-insensitive)
- **`*`**: Partial match (contains anywhere)
- **`<>`**: Not equal exact
- **`<*>`**: Not equal partial

##### Numeric Operators
- **`>=`**: Greater than or equal
- **`<=`**: Less than or equal
- **`>`**: Greater than
- **`<`**: Less than
- **`=`**: Equal to

##### Custom Operators
- Define based on filter type requirements
- Follow consistent naming patterns
- Include validation logic

### 3. UX Patterns

#### Input Validation
```javascript
validate: (input) => {
  if (input.toLowerCase().trim() === 'q') {
    return true; // Allow 'q' to cancel
  }
  if (!input.trim()) {
    return 'Value cannot be empty';
  }
  // Add specific validation here
  return true;
}
```

#### Cancel Functionality
- Always provide `q` to cancel option
- Show clear cancel message
- Return early from handler function

#### Error Handling
- Warn on zero results but keep filter
- Validate input format
- Provide helpful error messages

#### Filter Summary
- Show active filters at top of each view
- Format: `Filters: field1=value1; field2>=100`
- Clear when no filters active

### 4. Integration Points

#### renderOutput Function
```javascript
export async function renderOutput(rows, answers, cfg) {
  // Apply filters first
  let filteredRows = applyAllFilters(rows);
  
  // Apply sorting if enabled
  let sortedRows = filteredRows;
  if (answers.sorting?.columns && !answers.sorting.columns.includes('none')) {
    sortedRows = applySorting(filteredRows, answers.sorting);
  }
  
  // ... rest of function
}
```

#### displayTableWithPagination Function
```javascript
async function displayTableWithPagination(originalRows, filteredRows) {
  // Show filter summary
  const filterSummary = getFiltersSummary();
  if (filterSummary) {
    console.log(chalk.cyan(`\n${filterSummary}\n`));
  }
  
  // ... pagination logic
}
```

### 5. Testing Patterns

#### Test Data Structure
```javascript
const testData = [
  { name: 'Acme Corp', city: 'Los Angeles', status: 'Open', amount: 1000 },
  { name: 'Beta Inc', city: 'New York', status: 'Closed', amount: 2500 },
  // ... more test data
];
```

#### Test Scenarios
1. **Basic Filtering**: Apply filter and verify results
2. **Zero Results**: Test warning message
3. **Multiple Filters**: Test AND logic
4. **Filter Persistence**: Test across pagination
5. **Filter Clearing**: Test fx command and auto-clear

### 6. Common Pitfalls

#### Regex Issues
- Use string methods instead of complex regex for operator parsing
- Check operators in order of specificity (e.g., `<*>` before `<>`)

#### Filter Application
- Always apply filters to original dataset, not filtered results
- Re-apply filters when returning from filter operations

#### State Management
- Clear filters on completion and quit
- Maintain filter state across pagination
- Handle empty filter arrays gracefully

### 7. Future Enhancements

#### Potential New Filter Types
- **Date Filters**: Date range, before/after, specific dates
- **Boolean Filters**: True/false, null/not null
- **Array Filters**: Contains, not contains, length
- **Regex Filters**: Pattern matching with regex

#### Advanced Features
- **Filter Combinations**: OR logic between filter types
- **Filter Presets**: Save and load filter configurations
- **Filter Export**: Export filtered data with filter summary
- **Filter History**: Undo/redo filter operations

## Usage Examples

### Adding a Date Filter
```javascript
// 1. Add to currentFilters
currentFilters.dateFilters = [];

// 2. Create applyDateFilter function
function applyDateFilter(rows, field, operator, value) {
  return rows.filter(row => {
    const fieldValue = new Date(row[field]);
    const filterDate = new Date(value);
    // Implement date comparison logic
  });
}

// 3. Add handler function
async function handleDateFilter(originalRows) {
  // Implement date filter UI
}

// 4. Update command handling
// Add 'fd' command for date filtering
```

### Adding a Boolean Filter
```javascript
// 1. Add to currentFilters
currentFilters.booleanFilters = [];

// 2. Create applyBooleanFilter function
function applyBooleanFilter(rows, field, operator, value) {
  return rows.filter(row => {
    const fieldValue = Boolean(row[field]);
    const filterValue = Boolean(value);
    // Implement boolean comparison logic
  });
}
```

## Maintenance Notes

- **Filter Order**: Filters are applied in the order they appear in `applyAllFilters`
- **Performance**: Consider indexing for large datasets
- **Memory**: Clear filters regularly to prevent memory leaks
- **Testing**: Always test with edge cases (empty data, null values, etc.)

## File Locations

- **Main Implementation**: `src/cli/renderers.js`
- **Filter State**: Global variable in renderers.js
- **Filter Functions**: All in renderers.js
- **Integration**: Called from `renderOutput` function

This configuration provides a complete blueprint for implementing new filter types while maintaining consistency with the existing architecture.

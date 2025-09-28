import fs from "node:fs";
import path from "node:path";
import { stringify } from "csv-stringify/sync";

export function saveToFile(content, filename, options = {}) {
  const { outDir = "./.out", format = "json" } = options;
  
  // Ensure output directory exists
  fs.mkdirSync(outDir, { recursive: true });
  
  // Generate filename if not provided
  if (!filename) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    filename = `${timestamp}.${format}`;
  }
  
  const filepath = path.join(outDir, filename);
  
  // Write content to file
  fs.writeFileSync(filepath, content);
  
  return filepath;
}

export function saveJSON(data, filename, options = {}) {
  const content = JSON.stringify(data, null, 2);
  return saveToFile(content, filename, { ...options, format: "json" });
}

export function saveCSV(data, filename, options = {}) {
  const content = stringify(data, { header: true });
  return saveToFile(content, filename, { ...options, format: "csv" });
}

export function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

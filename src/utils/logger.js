import fs from "node:fs";
import path from "node:path";

class Logger {
  constructor(options = {}) {
    this.enabled = options.enabled || false;
    this.logFile = options.logFile || "./.out/analytics-cli.log";
    this.level = options.level || "info";
  }

  log(level, message, ...args) {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message} ${args.length > 0 ? JSON.stringify(args) : ''}\n`;
    
    try {
      // Ensure log directory exists
      const logDir = path.dirname(this.logFile);
      fs.mkdirSync(logDir, { recursive: true });
      
      // Append to log file
      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      // Silently fail if logging fails
      console.error(`Failed to write to log file: ${error.message}`);
    }
  }

  info(message, ...args) {
    this.log("info", message, ...args);
  }

  warn(message, ...args) {
    this.log("warn", message, ...args);
  }

  error(message, ...args) {
    this.log("error", message, ...args);
  }

  debug(message, ...args) {
    this.log("debug", message, ...args);
  }
}

// Create a default logger instance
export const logger = new Logger({
  enabled: process.env.ANALYTICS_CLI_LOG === "true",
  logFile: process.env.ANALYTICS_CLI_LOG_FILE || "./.out/analytics-cli.log",
  level: process.env.ANALYTICS_CLI_LOG_LEVEL || "info",
});

export default Logger;

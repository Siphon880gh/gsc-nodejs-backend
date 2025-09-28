import config from "../../config.js";
import { validateConfig } from "../cli/validators.js";

export function loadConfig() {
  // Validate configuration
  const errors = validateConfig(config);
  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.map(e => `- ${e}`).join('\n')}`);
  }
  
  return config;
}

export function getSourceConfig(source, cfg = config) {
  const sourceConfig = cfg.sources[source];
  if (!sourceConfig) {
    throw new Error(`Source ${source} is not configured`);
  }
  
  if (!sourceConfig.enabled) {
    throw new Error(`Source ${source} is not enabled`);
  }
  
  return sourceConfig;
}

export function getPresetsForSource(source, cfg = config) {
  return cfg.presets.filter(preset => 
    preset.source === source || preset.source === "any"
  );
}

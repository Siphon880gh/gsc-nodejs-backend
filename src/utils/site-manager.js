import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { getAvailableSites } from '../datasources/searchconsole.js';

const SITE_CONFIG_PATH = join(process.cwd(), '.selected_site.json');

/**
 * Get the currently selected site
 */
export function getSelectedSite() {
  if (!existsSync(SITE_CONFIG_PATH)) {
    return null;
  }
  
  try {
    const config = JSON.parse(readFileSync(SITE_CONFIG_PATH, 'utf8'));
    return config.siteUrl;
  } catch (error) {
    console.log(chalk.yellow('Warning: Could not read site configuration'));
    return null;
  }
}

/**
 * Save the selected site
 */
export function saveSelectedSite(siteUrl) {
  const config = {
    siteUrl,
    selectedAt: new Date().toISOString()
  };
  
  try {
    writeFileSync(SITE_CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to save site selection: ${error.message}`));
    return false;
  }
}

/**
 * Get available sites and filter for verified properties only
 */
export async function getVerifiedSites(cfg) {
  try {
    const sites = await getAvailableSites(cfg);
    
    // Filter for verified properties only (permissionLevel: 'siteOwner' or 'siteFullUser')
    const verifiedSites = sites.filter(site => 
      site.permissionLevel === 'siteOwner' || site.permissionLevel === 'siteFullUser'
    );
    
    return verifiedSites;
  } catch (error) {
    throw new Error(`Failed to fetch sites: ${error.message}`);
  }
}

/**
 * Clear the selected site
 */
export function clearSelectedSite() {
  try {
    if (existsSync(SITE_CONFIG_PATH)) {
      const { unlinkSync } = require('fs');
      unlinkSync(SITE_CONFIG_PATH);
    }
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to clear site selection: ${error.message}`));
    return false;
  }
}

/**
 * Check if a site is selected and valid
 */
export function hasValidSiteSelection() {
  const selectedSite = getSelectedSite();
  return selectedSite && selectedSite.trim() !== '';
}

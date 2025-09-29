import chalk from 'chalk';
import { getAvailableSites } from '../datasources/searchconsole.js';
import { getSiteForUser, storeSiteForUser } from './database.js';
import config from '../../config.js';

/**
 * Get the currently selected site
 */
export function getSelectedSite() {
  try {
    const userId = config.userId;
    return getSiteForUser(userId);
  } catch (error) {
    console.log(chalk.yellow('Warning: Could not read site configuration from database'));
    return null;
  }
}

/**
 * Save the selected site
 */
export function saveSelectedSite(siteUrl) {
  try {
    const userId = config.userId;
    storeSiteForUser(userId, siteUrl);
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to save site selection to database: ${error.message}`));
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
export async function clearSelectedSite() {
  try {
    const { getDatabase } = await import('./database.js');
    const db = getDatabase();
    const userId = config.userId;
    
    // Delete the site selection from database
    const deleteSite = db.prepare('DELETE FROM selected_sites WHERE user_id = ?');
    const result = deleteSite.run(userId);
    
    return result.changes > 0;
  } catch (error) {
    console.error(chalk.red(`Failed to clear site selection from database: ${error.message}`));
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

/**
 * Clear all stored authentication and site data
 */
export async function signOut() {
  const { getDatabase } = await import('./database.js');
  const db = getDatabase();
  
  let cleared = [];
  
  try {
    const userId = config.userId;
    
    // Clear OAuth tokens for user
    const deleteTokens = db.prepare('DELETE FROM oauth_tokens WHERE user_id = ?');
    const tokenResult = deleteTokens.run(userId);
    if (tokenResult.changes > 0) {
      cleared.push('OAuth tokens');
    }
    
    // Clear selected site for user
    const deleteSite = db.prepare('DELETE FROM selected_sites WHERE user_id = ?');
    const siteResult = deleteSite.run(userId);
    if (siteResult.changes > 0) {
      cleared.push('selected site');
    }
    
  } catch (error) {
    console.error('Failed to clear user data from database:', error.message);
  }
  
  return cleared;
}

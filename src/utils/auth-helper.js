import { getOAuth2Client } from "../datasources/searchconsole.js";
import chalk from "chalk";

/**
 * Get a properly authenticated OAuth2 client
 * This ensures the authentication is fresh and working
 */
export async function getAuthenticatedClient(cfg) {
  const gscConfig = cfg.sources.searchconsole;
  
  // Get OAuth2 client
  const auth = await getOAuth2Client(gscConfig);
  
  // Ensure the auth client is properly authenticated by getting a fresh token
  await auth.getAccessToken();
  
  return auth;
}

/**
 * Ensure authentication is working before proceeding
 * Returns the authenticated client or throws an error
 */
export async function ensureAuthentication(cfg) {
  try {
    const auth = await getAuthenticatedClient(cfg);
    console.log(chalk.blue("Authentication verified"));
    return auth;
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Shared constants for the SavvyReply extension
 */

// Development environment flag - set to false for production
// export const DEV_ENV = false;
export const DEV_ENV = true;

// API base URLs
const DEV_API_BASE = "http://localhost:3000/api/v1";
const PROD_API_BASE = "https://savvyreply.com/api/v1";

// API base URL - automatically switches based on environment
export const API_BASE_URL = DEV_ENV ? DEV_API_BASE : PROD_API_BASE;

// API path suffix
export const API_PATH = "/api/v1";

// Get the full API URL (for display purposes)
export function getApiUrl() {
  return DEV_ENV ? `${DEV_API_BASE} (${ENV_NAME})` : `${PROD_API_BASE}`;
}

// Environment name for display
export const ENV_NAME = DEV_ENV ? "Development" : "Production";

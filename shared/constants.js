/**
 * Shared constants for the SavvyReply extension
 */

// Development environment flag - set to false for production
export const DEV_ENV = false;

// API base URLs
const DEV_API_BASE = "http://localhost:3000";
const PROD_API_BASE = "https://savvyreply.com";

// API base URL - automatically switches based on environment
export const API_BASE_URL = DEV_ENV ? DEV_API_BASE : PROD_API_BASE + "/api/v1";

// API path suffix
export const API_PATH = "/api/v1";

// Get the full API URL (for display purposes)
export function getApiUrl() {
  const baseUrl = DEV_ENV ? DEV_API_BASE : PROD_API_BASE;
  return DEV_ENV
    ? `${baseUrl}${API_PATH} (${ENV_NAME})`
    : `${baseUrl}${API_PATH}`;
}

// Environment name for display
export const ENV_NAME = DEV_ENV ? "Development" : "Production";

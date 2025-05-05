// auth.js - Helper functions for authentication that can be used in content scripts

/**
 * Makes an authenticated API request to the Rails backend
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise} - Fetch response
 */
async function apiRequest(endpoint, options = {}) {
  try {
    // Get the authentication token
    const token = await getAuthToken();

    if (!token) {
      throw new Error("Not authenticated");
    }

    // Add authorization header
    const headers = {
      "Content-Type": "application/json",
      Authorization: token,
      ...(options.headers || {}),
    };

    // Make the request
    const API_BASE_URL = "http://localhost:3000/api/v1"; // Change to your Rails API URL
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Check for unauthorized response
    if (response.status === 401) {
      // Token might be invalid, clear it
      await chrome.storage.local.remove(["authToken", "user", "tokenExpiry"]);
      throw new Error("Authentication failed");
    }

    // Parse and return the response
    return response;
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
}

/**
 * Get the authentication token from storage
 * @returns {Promise<string|null>} - The auth token or null if not found
 */
async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getAuthToken" }, function (response) {
      resolve(response.token || null);
    });
  });
}

/**
 * Check if the user is authenticated
 * @returns {Promise<boolean>} - True if authenticated
 */
async function isAuthenticated() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "checkAuth" }, function (response) {
      resolve(response.authenticated || false);
    });
  });
}

// Export the functions for use in content scripts
export { apiRequest, getAuthToken, isAuthenticated };

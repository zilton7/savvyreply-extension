console.log("X Reply Generator: Background script loaded.");

// --- REPLY GENERATION VIA RAILS API ---

// Helper: Start reply generation job on Rails backend
function startReplyGeneration(replyToText, sendResponse) {
  fetch("http://localhost:3000/api/v1/trigger_reply_generation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reply_to_text: replyToText,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.job_id) {
        // Start polling for results
        pollForResults(data.job_id, sendResponse);
      } else {
        sendResponse({ error: "Failed to start reply generation job." });
      }
    })
    .catch((error) => {
      console.error("Error starting job:", error);
      sendResponse({ error: "Error starting reply generation job." });
    });
}

// Helper: Poll for job results with exponential backoff
function pollForResults(jobId, sendResponse) {
  let attempts = 0;
  const maxAttempts = 20;

  function checkStatus() {
    fetch(`http://localhost:3000/api/v1/job_status/${jobId}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          // Return the completed results
          sendResponse({ reply: data.data });
        } else if (attempts < maxAttempts) {
          attempts++;
          const delay = Math.min(1000 * Math.pow(1.5, attempts), 1500);
          setTimeout(checkStatus, delay);
        } else {
          sendResponse({ error: "Reply generation timed out." });
        }
      })
      .catch((error) => {
        console.error("Error checking job status:", error);
        sendResponse({ error: "Error checking reply job status." });
      });
  }

  setTimeout(checkStatus, 1000);
}

// --- MESSAGE HANDLER ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateReply") {
    // Use Rails backend for reply generation
    startReplyGeneration(request.prompt, sendResponse);
    return true; // Indicate async response
  }

  if (request.action === "login") {
    login(request.email, request.password)
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Required for async sendResponse
  }

  if (request.action === "logout") {
    logout()
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "checkAuth") {
    checkAuth()
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "getAuthToken") {
    getAuthToken()
      .then((token) => sendResponse({ token }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }
});

// AUTHENTICATION STUFF

// background.js - Service worker for handling background tasks

const API_BASE_URL = "http://localhost:3000/api/v1"; // Change this to your Rails API URL

// Login function to authenticate with Rails backend
async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/sign_in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user: { email, password },
      }),
    });

    const data = await response.json();
    if (data.success) {
      // Store the token in extension storage
      chrome.storage.local.set({
        auth_token: data.auth_token,
        user_id: data.user_id,
      });
      return { success: true, user: data.data };
    }
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

// Logout function
async function logout() {
  try {
    const token = await getAuthToken();

    if (!token) {
      throw new Error("Not logged in");
    }

    const response = await fetch(`${API_BASE_URL}/sign_out`, {
      method: "DELETE",
      headers: {
        Authorization: token,
      },
    });

    // Clear stored auth data regardless of server response
    await chrome.storage.local.remove(["auth_token", "user_id"]);

    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

// Check if user is authenticated
async function checkAuth() {
  try {
    const { auth_token, user_id } = await chrome.storage.local.get([
      "auth_token",
      "user_id",
    ]);

    if (!auth_token || !user_id) {
      return { authenticated: false };
    }

    return { authenticated: true };
  } catch (error) {
    console.error("Auth check error:", error);
    throw error;
  }
}

// Helper function to get auth token
async function getAuthToken() {
  const { auth_token } = await chrome.storage.local.get("auth_token");
  return auth_token;
}

// Optional: Add an auth token refresh mechanism
async function refreshToken() {
  // Implementation depends on your Rails JWT refresh mechanism
}

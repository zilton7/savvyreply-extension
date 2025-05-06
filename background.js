console.log("X Reply Generator: Background script loaded.");

// Store API key in memory (could be improved with chrome.storage)
let GEMINI_API_KEY = "";

function getGeminiApiUrl() {
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Allow setting the API key from another part of the extension
  if (request.action === "setGeminiApiKey") {
    GEMINI_API_KEY = request.apiKey;
    console.log("Background: Gemini API Key set.");
    sendResponse({ success: true });
    return; // Synchronous response
  }

  if (request.action === "generateReply") {
    console.log(
      "Background: Received generateReply request with prompt:",
      request.prompt
    );

    if (!GEMINI_API_KEY) {
      console.error("Background: API Key not set.");
      sendResponse({
        error:
          "API Key not configured. Please set it in the extension options.",
      });
      return true; // Indicate asynchronous response
    }

    const GEMINI_API_URL = getGeminiApiUrl();

    // Construct the request payload for Gemini API
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `You are a helpful assistant specializing in creating concise, relevant, and engaging responses to social media posts. When presented with a social media post, analyze the content and craft a thoughtful reply that:

                    1. Addresses the core message or question in the post
                    2. Maintains an appropriate tone (supportive, informative, humorous, etc.) based on the context
                    3. Adds value to the conversation without being overly verbose
                    4. Uses natural, conversational language appropriate for the platform
                    5. Avoids generic responses that could apply to any post
                    6. Includes relevant hashtags, emojis, or formatting when appropriate for the platform
                    7. Stays between 1-3 sentences unless a more detailed response is specifically requested
                    
                    Before generating your reply, briefly identify:
                    - The key topic or question in the post
                    - The apparent emotion or intent of the original poster
                    - The appropriate tone for your response
                    
                    Then craft a concise reply that would be appropriate and valuable in the context of the social media platform and conversation.
                    Don't use hastags, and limit to 280 characters.
                    If the post is a question, provide a direct answer or insight. If it's a statement, acknowledge it and add your perspective or related information.
                    If the post is a request for help, offer assistance or resources.
                    If the post is a personal story, respond with empathy or encouragement.

                    Generate a concise and relevant reply to the following social media post:
                    
                    "${request.prompt}"
                    `,
            },
          ],
        },
      ],
      // Optional: Add safety settings and generation config if needed
      // safetySettings: [...],
      // generationConfig: { temperature: 0.7, maxOutputTokens: 100 }
    };

    fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          // Try to get error details from the response body
          return response
            .json()
            .then((errData) => {
              console.error(
                "Background: API request failed with status:",
                response.status,
                errData
              );
              throw new Error(
                `API Error (${response.status}): ${
                  errData?.error?.message || "Unknown error"
                }`
              );
            })
            .catch(() => {
              // If parsing error body fails, throw a generic error
              console.error(
                "Background: API request failed with status:",
                response.status
              );
              throw new Error(
                `API request failed with status ${response.status}`
              );
            });
        }
        return response.json();
      })
      .then((data) => {
        console.log("Background: API Response Data:", data);
        // Extract the generated text - structure might vary slightly based on API version/response
        const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (replyText) {
          console.log("Background: Sending reply:", replyText);
          sendResponse({ reply: replyText.trim().replace(/^"(.*)"$/, "$1") });
        } else {
          console.error(
            "Background: Could not extract reply text from API response:",
            data
          );
          sendResponse({ error: "Failed to parse reply from API response." });
        }
      })
      .catch((error) => {
        console.error("Background: Error during fetch or processing:", error);
        sendResponse({ error: error.message || "An unknown error occurred." });
      });

    return true; // Indicate that the response will be sent asynchronously
  }
});

console.log("X Reply Generator: Background script ready and listener added.");

// AUTHENTICATION STUFF

// background.js - Service worker for handling background tasks

const API_BASE_URL = "http://localhost:3000/api/v1"; // Change this to your Rails API URL

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

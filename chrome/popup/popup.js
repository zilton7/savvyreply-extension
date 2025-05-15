// popup.js - Handles the popup UI and authentication
import { ENV_NAME, getApiUrl, DEV_ENV } from "../shared/constants.js";

document.addEventListener("DOMContentLoaded", function () {
  // Display environment info
  setupEnvironmentInfo();

  // Setup authentication handlers
  setupAuthHandlers();

  // Check current authentication status
  checkAuthStatus();
});

function setupEnvironmentInfo() {
  const envNameEl = document.getElementById("env-name");
  const apiUrlEl = document.getElementById("api-url");
  const envInfoEl = document.getElementById("env-info");

  if (envInfoEl) {
    if (DEV_ENV) {
      envNameEl.textContent = ENV_NAME;
      apiUrlEl.textContent = getApiUrl();
      envInfoEl.classList.add("env-dev");
      envInfoEl.style.display = "block";
    } else {
      envInfoEl.style.display = "none";
    }
  }
}

function setupAuthHandlers() {
  const loginForm = document.getElementById("login-form");
  const loginButton = document.getElementById("login-button");
  const logoutButton = document.getElementById("logout-button");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginError = document.getElementById("login-error");
  const statusMessage = document.getElementById("status-message");

  // Login button handler
  if (loginButton) {
    loginButton.addEventListener("click", function () {
      const email = emailInput.value;
      const password = passwordInput.value;

      if (!email || !password) {
        loginError.textContent = "Please enter email and password";
        return;
      }

      loginButton.disabled = true;
      loginButton.textContent = "Logging in...";

      chrome.runtime.sendMessage(
        { action: "login", email, password },
        function (response) {
          loginButton.disabled = false;
          loginButton.textContent = "Login";

          if (response && response.success) {
            showStatus("Logged in successfully!", "success");
            checkAuthStatus(); // Update UI based on new auth state
          } else {
            loginError.textContent = response.error || "Login failed";
          }
        }
      );
    });
  }

  // Logout button handler
  if (logoutButton) {
    logoutButton.addEventListener("click", function () {
      logoutButton.disabled = true;
      logoutButton.textContent = "Logging out...";

      chrome.runtime.sendMessage({ action: "logout" }, function (response) {
        logoutButton.disabled = false;
        logoutButton.textContent = "Logout";

        if (response && response.success) {
          showStatus("Logged out successfully!", "success");
          checkAuthStatus(); // Update UI based on new auth state
        } else {
          showStatus("Logout failed", "error");
        }
      });
    });
  }
}

function checkAuthStatus() {
  chrome.runtime.sendMessage({ action: "checkAuth" }, function (response) {
    const loginForm = document.getElementById("login-form");
    const userInfo = document.getElementById("user-info");

    if (response && response.authenticated) {
      // User is logged in
      loginForm.style.display = "none";
      userInfo.style.display = "block";

      // Get email directly from storage
      chrome.storage.local.get("email", function (result) {
        if (result.email) {
          document.getElementById("user-email").textContent = result.email;
        } else {
          // Fallback to API if email not in storage
          chrome.runtime.sendMessage(
            { action: "getUserInfo" },
            function (userResponse) {
              if (userResponse && userResponse.user) {
                document.getElementById("user-email").textContent =
                  userResponse.user.email;
              }
            }
          );
        }
      });
    } else {
      // User is not logged in
      loginForm.style.display = "block";
      userInfo.style.display = "none";
    }
  });
}

function showStatus(message, type) {
  const statusEl = document.getElementById("status-message");
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = type;
    statusEl.style.display = "block";

    setTimeout(() => {
      statusEl.style.display = "none";
    }, 3000);
  }
}

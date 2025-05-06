// popup.js - Handles the popup UI and authentication

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("login-form");
  const userInfo = document.getElementById("user-info");
  const userEmail = document.getElementById("user-email");
  const loginButton = document.getElementById("login-button");
  const logoutButton = document.getElementById("logout-button");
  const loginError = document.getElementById("login-error");
  const statusMessage = document.getElementById("status-message");

  // Check authentication status when popup opens
  checkAuthStatus();

  // Login button event listener
  loginButton.addEventListener("click", function () {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!email || !password) {
      showError("Please enter both email and password");
      return;
    }

    showStatus("Signing in...", "info");

    // Send login request to background script
    chrome.runtime.sendMessage(
      { action: "login", email, password },
      function (response) {
        debugger;
        if (response.success) {
          showLoginSuccess(response.user);
        } else {
          showError(response.error || "Login failed");
        }
      }
    );
  });

  // Logout button event listener
  logoutButton.addEventListener("click", function () {
    showStatus("Logging out...", "info");

    // Send logout request to background script
    chrome.runtime.sendMessage({ action: "logout" }, function (response) {
      if (response.success) {
        showLogoutSuccess();
      } else {
        showError(response.error || "Logout failed");
      }
    });
  });

  // Check if the user is logged in
  function checkAuthStatus() {
    chrome.runtime.sendMessage({ action: "checkAuth" }, function (response) {
      if (response.authenticated) {
        showLoginSuccess(response.user);
      } else {
        showLoginForm();
      }
    });
  }

  // Show the login form
  function showLoginForm() {
    loginForm.style.display = "block";
    userInfo.style.display = "none";
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    loginError.textContent = "";
    statusMessage.textContent = "";
    statusMessage.className = "";
  }

  // Show the user info when logged in
  function showLoginSuccess(user) {
    loginForm.style.display = "none";
    userInfo.style.display = "block";
    userEmail.textContent = user.email;
    showStatus("Successfully logged in!", "success");
  }

  // Show logout success
  function showLogoutSuccess() {
    showLoginForm();
    showStatus("Successfully logged out!", "success");
  }

  // Show error message
  function showError(message) {
    loginError.textContent = message;
    showStatus(message, "error");
  }

  // Show status message
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = type;
  }
});

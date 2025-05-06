console.log("X Reply Generator: Content script loaded.");

// --- Configuration ---
// Updated selectors for x.com (Twitter)
// The toolbar is often a div with role="group" inside the article
const POST_ARTICLE_SELECTOR = 'article[data-testid="tweet"]';
const POST_TEXT_SELECTOR = 'div[data-testid="tweetText"]';
const REPLY_TEXTAREA_SELECTOR =
  'div[role="textbox"][data-testid="tweetTextarea_0"]';
// Try to find a toolbar by role, as data-testid may not be present
const TOOLBAR_SELECTOR = 'div[role="group"]';

// --- Functions ---

// Custom message display function
function showCustomMessage(message, type = "info") {
  // Create container if it doesn't exist
  let messageContainer = document.querySelector(".x-reply-generator-message");
  if (!messageContainer) {
    messageContainer = document.createElement("div");
    messageContainer.className = "x-reply-generator-message";
    messageContainer.style.position = "fixed";
    messageContainer.style.top = "20px";
    messageContainer.style.right = "20px";
    messageContainer.style.padding = "12px 16px";
    messageContainer.style.borderRadius = "8px";
    messageContainer.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
    messageContainer.style.zIndex = "10000";
    messageContainer.style.maxWidth = "300px";
    messageContainer.style.fontFamily =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    messageContainer.style.fontSize = "14px";
    messageContainer.style.transition = "opacity 0.3s ease-in-out";
    document.body.appendChild(messageContainer);
  }

  // Set styles based on message type
  if (type === "error") {
    messageContainer.style.backgroundColor = "#ffebee";
    messageContainer.style.color = "#c62828";
    messageContainer.style.border = "1px solid #ef9a9a";
  } else if (type === "success") {
    messageContainer.style.backgroundColor = "#e8f5e9";
    messageContainer.style.color = "#2e7d32";
    messageContainer.style.border = "1px solid #a5d6a7";
  } else {
    messageContainer.style.backgroundColor = "#e3f2fd";
    messageContainer.style.color = "#1565c0";
    messageContainer.style.border = "1px solid #90caf9";
  }

  // Set message content
  messageContainer.textContent = message;
  messageContainer.style.opacity = "1";

  // Auto-hide after 5 seconds
  setTimeout(() => {
    messageContainer.style.opacity = "0";
    setTimeout(() => {
      if (messageContainer.parentNode) {
        messageContainer.parentNode.removeChild(messageContainer);
      }
    }, 300);
  }, 5000);
}

function addGenerateButton(postElement) {
  // Check if the button already exists
  if (postElement.querySelector(".generate-reply-button")) {
    return;
  }

  // Try to find the toolbar (actions area) inside the post
  let toolbar = null;
  const toolbars = postElement.querySelectorAll(TOOLBAR_SELECTOR);
  // Heuristic: pick the last toolbar, which is usually the action bar under the post
  if (toolbars.length > 0) {
    toolbar = toolbars[toolbars.length - 1];
  }

  const wrapper = document.createElement("div");
  wrapper.style.display = "inline-block";
  wrapper.style.height = "24px"; // Set a smaller height as needed
  wrapper.style.verticalAlign = "middle";

  const button = document.createElement("button");
  button.textContent = "Generate Reply";
  button.className = "generate-reply-button";
  button.style.marginLeft = "8px";
  button.style.padding = "2px 5px";
  button.style.cursor = "pointer";
  button.style.border = "1px solid #ccc";
  button.style.borderRadius = "4px";
  button.disabled = true; // Initially disable the button
  button.title = "Checking authentication..."; // Add a tooltip

  // Check authentication status
  chrome.runtime.sendMessage({ action: "checkAuth" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Auth check error:", chrome.runtime.lastError.message);
      button.title = "Error checking authentication.";
      // Keep button disabled if auth check fails
      return;
    }
    if (response && response.authenticated) {
      button.disabled = false; // Enable button if authenticated
      button.title = ""; // Clear tooltip
    } else {
      button.title =
        "Please log in via the extension popup to use this feature.";
      // Keep button disabled if not authenticated
    }
  });

  button.addEventListener("click", async (event) => {
    event.stopPropagation();
    event.preventDefault();

    // Double-check auth just before generating (optional but good practice)
    const authResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "checkAuth" }, resolve);
    });

    if (!authResponse || !authResponse.authenticated) {
      showCustomMessage(
        "Please log in via the extension popup first.",
        "error"
      );
      return;
    }

    console.log("X Reply Generator: Button clicked.");
    button.textContent = "Generating...";
    button.disabled = true;

    const postTextElement = postElement.querySelector(POST_TEXT_SELECTOR);
    const postText = postTextElement ? postTextElement.innerText : null;

    // Try to find the reply textarea that is visible
    const replyTextAreas = document.querySelectorAll(REPLY_TEXTAREA_SELECTOR);
    let replyTextArea = null;
    for (const area of replyTextAreas) {
      if (area.offsetParent !== null) {
        // visible
        replyTextArea = area;
        break;
      }
    }

    if (!postText) {
      console.error("X Reply Generator: Could not find post text.");
      showCustomMessage("Error: Could not find the post text.", "error");
      button.textContent = "Generate Reply";
      button.disabled = false;
      return;
    }

    if (!replyTextArea) {
      showCustomMessage(
        "Please click the reply button under this post before generating a reply.",
        "error"
      );
      button.textContent = "Generate Reply";
      button.disabled = false;
      return;
    }

    try {
      console.log(
        "X Reply Generator: Sending message to background script...",
        postText
      );
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: "generateReply",
            prompt: postText,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          }
        );
      });

      console.log(
        "X Reply Generator: Received response from background script:",
        response
      );

      if (!response) {
        showCustomMessage(
          "Error: No response from the extension background script. Is the extension running?",
          "error"
        );
      } else if (response.error) {
        showCustomMessage(`Error generating reply: ${response.error}`, "error");
      } else if (response.reply) {
        replyTextArea.focus();
        // First try to remove quotes if present, then insert the text
        const cleanedReply = response.reply.replace(/^"(.*)"$/, "$1");
        document.execCommand("insertText", false, cleanedReply);
        showCustomMessage("Reply generated successfully!", "success");
      } else {
        showCustomMessage(
          "Error: Received an invalid response from the extension.",
          "error"
        );
      }
    } catch (error) {
      console.error("X Reply Generator: Error during reply generation:", error);
      showCustomMessage(
        `Error: ${error.message || "An unexpected error occurred."}`,
        "error"
      );
    } finally {
      button.textContent = "Generate Reply";
      // Re-enable button only if still authenticated (or handle based on initial check)
      chrome.runtime.sendMessage({ action: "checkAuth" }, (response) => {
        if (response && response.authenticated) {
          button.disabled = false;
        }
      });
    }
  });

  if (toolbar) {
    toolbar.appendChild(button);
  } else {
    // Fallback: append at the end of the post
    postElement.appendChild(button);
  }
}

function processPosts() {
  const postElements = document.querySelectorAll(POST_ARTICLE_SELECTOR);
  postElements.forEach((postElement) => {
    if (postElement.querySelector(POST_TEXT_SELECTOR)) {
      addGenerateButton(postElement);
    }
  });
}

// --- Initialization and Observation ---

processPosts();

const observer = new MutationObserver((mutationsList) => {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.matches(POST_ARTICLE_SELECTOR)) {
            addGenerateButton(node);
          } else {
            node
              .querySelectorAll(POST_ARTICLE_SELECTOR)
              .forEach(addGenerateButton);
          }
        }
      });
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

console.log("X Reply Generator: Observer started.");

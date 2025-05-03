console.log("X Reply Generator: Content script loaded.");

// --- Configuration ---
// Updated selectors for x.com (Twitter)
// The toolbar is often a div with role="group" inside the article
const POST_ARTICLE_SELECTOR = 'article[data-testid="tweet"]';
const POST_TEXT_SELECTOR = 'div[data-testid="tweetText"]';
const REPLY_TEXTAREA_SELECTOR = 'div[role="textbox"][data-testid="tweetTextarea_0"]';
// Try to find a toolbar by role, as data-testid may not be present
const TOOLBAR_SELECTOR = 'div[role="group"]';

// --- Functions ---

function addGenerateButton(postElement) {
    // Check if the button already exists
    if (postElement.querySelector('.generate-reply-button')) {
        return;
    }

    // Try to find the toolbar (actions area) inside the post
    let toolbar = null;
    const toolbars = postElement.querySelectorAll(TOOLBAR_SELECTOR);
    // Heuristic: pick the last toolbar, which is usually the action bar under the post
    if (toolbars.length > 0) {
        toolbar = toolbars[toolbars.length - 1];
    }
    

    const wrapper = document.createElement('div');
    wrapper.style.display = 'inline-block';
    wrapper.style.height = '24px'; // Set a smaller height as needed
    wrapper.style.verticalAlign = 'middle';

    const button = document.createElement('button');
    button.textContent = 'Generate Reply';
    button.className = 'generate-reply-button';
    button.style.marginLeft = '8px';
    button.style.padding = '2px 5px';
    button.style.cursor = 'pointer';
    button.style.border = '1px solid #ccc';
    button.style.borderRadius = '4px';

    button.addEventListener('click', async (event) => {
        event.stopPropagation();
        event.preventDefault();

        console.log("X Reply Generator: Button clicked.");
        button.textContent = 'Generating...';
        button.disabled = true;

        const postTextElement = postElement.querySelector(POST_TEXT_SELECTOR);
        const postText = postTextElement ? postTextElement.innerText : null;

        // Try to find the reply textarea that is visible
        const replyTextAreas = document.querySelectorAll(REPLY_TEXTAREA_SELECTOR);
        let replyTextArea = null;
        for (const area of replyTextAreas) {
            if (area.offsetParent !== null) { // visible
                replyTextArea = area;
                break;
            }
        }

        if (!postText) {
            console.error("X Reply Generator: Could not find post text.");
            alert("Error: Could not find the post text.");
            button.textContent = 'Generate Reply';
            button.disabled = false;
            return;
        }

        if (!replyTextArea) {
            alert("Please click the reply button under this post before generating a reply.");
            button.textContent = 'Generate Reply';
            button.disabled = false;
            return;
        }

        try {
            console.log("X Reply Generator: Sending message to background script...", postText);
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    {
                        action: "generateReply",
                        prompt: postText
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

            console.log("X Reply Generator: Received response from background script:", response);

            if (!response) {
                alert("Error: No response from the extension background script. Is the extension running?");
            } else if (response.error) {
                alert(`Error generating reply: ${response.error}`);
            } else if (response.reply) {
                replyTextArea.focus();
                document.execCommand('insertText', false, response.reply.replace(/^"(.*)"$/, '$1'));
            } else {
                alert("Error: Received an invalid response from the extension.");
            }
        } catch (error) {
            console.error("X Reply Generator: Error during reply generation:", error);
            alert(`Error: ${error.message || "An unexpected error occurred."}`);
        } finally {
            button.textContent = 'Generate Reply';
            button.disabled = false;
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
    postElements.forEach(postElement => {
        if (postElement.querySelector(POST_TEXT_SELECTOR)) {
            addGenerateButton(postElement);
        }
    });
}

// --- Initialization and Observation ---

processPosts();

const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.matches(POST_ARTICLE_SELECTOR)) {
                        addGenerateButton(node);
                    } else {
                        node.querySelectorAll(POST_ARTICLE_SELECTOR).forEach(addGenerateButton);
                    }
                }
            });
        }
    }
});

observer.observe(document.body, { childList: true, subtree: true });

console.log("X Reply Generator: Observer started.");

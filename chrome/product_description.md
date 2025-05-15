- Chrome extension that adds a 'Generate Reply' button under each x.com post.

- When the button is clicked:
  1. Read the content of the post under which the button is located.
  2. Send the content to the Gemini API to generate a reply.
  3. Receive the reply from the API.
  4. Insert the reply into the comment text area under the post.

- The user only needs to click 'Submit' to post the generated comment.

- Technical steps for implementation:
  1. Use the Chrome Extensions API to inject the 'Generate Reply' button into the x.com post interface.
  2. Add an event listener to the button to capture the post content.
  3. Use `fetch` or a similar method to send the post content to the Gemini API and retrieve the reply.
  4. Programmatically insert the reply into the comment text area using DOM manipulation.
  5. Ensure proper error handling and user feedback for API failures or other issues.

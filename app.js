// app.js
require('dotenv').config();
const { App } = require('@slack/bolt');
const { Langbase } = require('langbase');

// Initialize Langbase client
const langbase = new Langbase();

// Initialize Slack app with environment variables
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false, // We'll use HTTP endpoints for Events API
});

// Listen for app_mention events
app.event('app_mention', async ({ event, context, say }) => {
  try {
    console.log('Received app_mention event:', event);
    
    // Extract the question from the message
    // Remove the app mention part (everything before the >)
    const messageText = event.text;
    const question = messageText.split('>').slice(1).join('>').trim();
    
    if (!question) {
      await say({
        text: "I didn't catch your question. Could you please try again?",
        thread_ts: event.ts
      });
      return;
    }
    
    console.log(`Processing question: ${question}`);
    
    // Call Langbase API with the extracted question
    const response = await processQuestionWithLangbase(question);
    
    // Send the response back to Slack
    await say({
      text: response,
      thread_ts: event.ts // Reply in thread
    });
    
  } catch (error) {
    console.error(`Error handling app_mention: ${error}`);
    await say({
      text: "Sorry, I encountered an error processing your request.",
      thread_ts: event.ts
    });
  }
});

/**
 * Process the question using Langbase RAG
 * @param {string} question - The question extracted from Slack message
 * @returns {Promise<string>} - The response from Langbase
 */
async function processQuestionWithLangbase(question) {
  try {
    // Call Langbase API with the question
    const langbaseResponse = await langbase.pipe.run({
      apiKey: process.env.LANGBASE_API_KEY,
      messages: [
        {
          role: 'user',
          content: question
        },
      ],
    });
    
    console.log('Langbase response:', langbaseResponse);
    
    // Extract and return the answer text from the response
    // Note: Adjust this based on the actual structure of Langbase response
    return langbaseResponse.choices?.[0]?.message?.content || 
           "I couldn't generate a proper response. Please try again.";
    
  } catch (error) {
    console.error(`Error calling Langbase API: ${error}`);
    throw error;
  }
}

// Start the app
(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`⚡️ Slack app is running on port ${port}`);
})();
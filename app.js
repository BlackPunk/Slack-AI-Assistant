// app.js
require('dotenv').config();
const { App } = require('@slack/bolt');
const https = require('https');

// Function to make HTTP requests to Langbase API
function callLangbaseAPI(question) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      messages: [
        {
          role: 'user',
          content: question
        }
      ]
    });

    const options = {
      hostname: 'api.langbase.com',
      path: '/v1/pipe/run', // Update with actual Langbase endpoint
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LANGBASE_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
});

// Listen for app_mention events
app.event('app_mention', async ({ event, say }) => {
  try {
    console.log('Received app_mention event:', event);
    
    // Extract the question
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
    
    // Call Langbase API
    const langbaseResponse = await callLangbaseAPI(question);
    console.log('Langbase response:', langbaseResponse);
    
    // Extract response content
    let responseText = "I couldn't generate a proper response. Please try again.";
    
    if (langbaseResponse && 
        langbaseResponse.choices && 
        langbaseResponse.choices[0] && 
        langbaseResponse.choices[0].message && 
        langbaseResponse.choices[0].message.content) {
      responseText = langbaseResponse.choices[0].message.content;
    }
    
    // Send response to Slack
    await say({
      text: responseText,
      thread_ts: event.ts
    });
    
  } catch (error) {
    console.error(`Error handling app_mention: ${error}`);
    await say({
      text: "Sorry, I encountered an error processing your request.",
      thread_ts: event.ts
    });
  }
});

// Start the app
(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`⚡️ Slack app is running on port ${port}`);
})();
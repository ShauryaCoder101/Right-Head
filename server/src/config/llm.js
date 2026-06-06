/**
 * @module config/llm
 * @description Google Gemini client singleton with helper functions for fast (gemini-2.5-flash)
 * and full (gemini-2.5-pro) model calls. Maintains the same interface as the services expect.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('./env');

/** @type {GoogleGenerativeAI} */
let genAI;

if (!global.__genAI) {
  global.__genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
}
genAI = global.__genAI;

/**
 * Delay helper for exponential backoff.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call the fast model (gemini-2.0-flash) for high-throughput, cost-efficient tasks
 * like resume parsing, JD parsing, scoring, etc.
 *
 * Accepts the same options shape the services already use:
 *   { messages: [{ role, content }], temperature, max_tokens }
 *
 * Returns a response shaped like:
 *   { choices: [{ message: { content: string } }] }
 *
 * @param {object} options
 * @returns {Promise<object>}
 */
async function callFastModel(options) {
  return callWithRetry('models/gemini-2.5-flash', options, 3);
}

/**
 * Call the full model (gemini-2.5-flash) for complex reasoning tasks
 * like explanation generation.
 *
 * @param {object} options
 * @returns {Promise<object>}
 */
async function callFullModel(options) {
  return callWithRetry('models/gemini-2.5-pro', options, 3);
}

/**
 * Convert OpenAI-style messages to Gemini format and call the model.
 *
 * @param {string} modelName - Gemini model name
 * @param {object} options - { messages, temperature, max_tokens }
 * @param {number} maxRetries
 * @returns {Promise<object>} OpenAI-compatible response shape
 */
async function callWithRetry(modelName, options, maxRetries) {
  let lastError;
  const { messages = [], temperature = 0.1, max_tokens = 4096 } = options;

  // Separate system prompt from conversation messages
  let systemInstruction = '';
  const chatMessages = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction += (systemInstruction ? '\n\n' : '') + msg.content;
    } else {
      chatMessages.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction || undefined,
        generationConfig: {
          temperature,
          maxOutputTokens: max_tokens,
          responseMimeType: 'application/json',
          // Disable thinking for structured output — thinking consumes output
          // tokens and causes JSON truncation. For parsing/scoring we just need
          // clean JSON, not reasoning.
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      let result;

      if (chatMessages.length === 1) {
        // Single user message — use generateContent
        result = await model.generateContent(chatMessages[0].parts[0].text);
      } else {
        // Multi-turn — use startChat
        const chat = model.startChat({
          history: chatMessages.slice(0, -1),
        });
        const lastMsg = chatMessages[chatMessages.length - 1];
        result = await chat.sendMessage(lastMsg.parts[0].text);
      }

      const content = result.response.text();

      if (!content) {
        throw new Error('Empty response from Gemini');
      }

      // Return in OpenAI-compatible shape so services don't need changes
      return {
        choices: [
          {
            message: {
              content,
              role: 'assistant',
            },
          },
        ],
      };
    } catch (error) {
      lastError = error;

      // Don't retry on auth errors
      if (error.message?.includes('API_KEY_INVALID') || error.status === 403) {
        throw new Error(`Gemini authentication error: ${error.message}`);
      }

      // Retry on rate limits and server errors
      if (attempt < maxRetries) {
        const isRateLimit = error.status === 429 || error.message?.includes('429');
        const delay = isRateLimit
          ? Math.min(Math.pow(2, attempt) * 2000, 30000)
          : Math.pow(2, attempt) * 1000;

        console.warn(
          `⚠️  Gemini call failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`,
          error.message
        );
        await sleep(delay);
      }
    }
  }

  throw new Error(`Gemini call failed after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Estimate the token count for a string (rough approximation: ~4 chars per token).
 * @param {string} text
 * @returns {number}
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

module.exports = {
  genAI,
  callFastModel,
  callFullModel,
  estimateTokens,
};

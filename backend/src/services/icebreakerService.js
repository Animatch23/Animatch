import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ChatSession from '../models/ChatSession.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load prompts from JSON file
let prompts = [];
try {
  const promptsPath = join(__dirname, '../data/prompts.json');
  const data = JSON.parse(readFileSync(promptsPath, 'utf-8'));
  prompts = data.icebreakers || [];
  console.log(`[ICEBREAKER] Loaded ${prompts.length} prompts`);
} catch (error) {
  console.error('[ICEBREAKER] Failed to load prompts:', error);
  // Fallback prompts
  prompts = [
    "What's your favorite spot on campus?",
    "If you could skip one subject forever, which one would it be?",
    "Coffee, milk tea, or energy drinks to survive classes?",
    "Are you a morning class or afternoon class person?",
    "What's your go-to study snack during finals week?"
  ];
}

/**
 * Get a random icebreaker prompt that hasn't been used in this session
 * @param {string} chatSessionId - The chat session ID
 * @returns {Promise<{prompt: string|null, dismissed: boolean}>}
 */
export const getIcebreaker = async (chatSessionId) => {
  try {
    const chatSession = await ChatSession.findById(chatSessionId);
    if (!chatSession) {
      return { prompt: null, dismissed: false };
    }

    // If icebreaker was dismissed, return null
    if (chatSession.icebreakerDismissed) {
      return { prompt: null, dismissed: true };
    }

    // If there's already a current icebreaker, return it
    if (chatSession.currentIcebreaker) {
      return { prompt: chatSession.currentIcebreaker, dismissed: false };
    }

    // Get a new random prompt
    const newPrompt = await generateNewIcebreaker(chatSession);
    return { prompt: newPrompt, dismissed: false };
  } catch (error) {
    console.error('[ICEBREAKER] Error getting icebreaker:', error);
    return { prompt: null, dismissed: false };
  }
};

/**
 * Generate a new icebreaker prompt for the session
 * @param {Object} chatSession - The chat session document
 * @returns {Promise<string|null>}
 */
const generateNewIcebreaker = async (chatSession) => {
  const usedPrompts = chatSession.usedIcebreakers || [];
  
  // Filter out already used prompts
  const availablePrompts = prompts.filter(p => !usedPrompts.includes(p));
  
  // If all prompts have been used, reset and start over
  if (availablePrompts.length === 0) {
    chatSession.usedIcebreakers = [];
    return prompts[Math.floor(Math.random() * prompts.length)];
  }
  
  // Pick a random prompt from available ones
  const newPrompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
  
  // Update the session
  chatSession.currentIcebreaker = newPrompt;
  chatSession.usedIcebreakers.push(newPrompt);
  await chatSession.save();
  
  return newPrompt;
};

/**
 * Refresh the icebreaker prompt for a session (both users see the same new prompt)
 * @param {string} chatSessionId - The chat session ID
 * @returns {Promise<{prompt: string|null, dismissed: boolean}>}
 */
export const refreshIcebreaker = async (chatSessionId) => {
  try {
    const chatSession = await ChatSession.findById(chatSessionId);
    if (!chatSession) {
      return { prompt: null, dismissed: false };
    }

    // If dismissed, un-dismiss and get a new prompt
    chatSession.icebreakerDismissed = false;
    
    // Generate a new prompt
    const newPrompt = await generateNewIcebreaker(chatSession);
    return { prompt: newPrompt, dismissed: false };
  } catch (error) {
    console.error('[ICEBREAKER] Error refreshing icebreaker:', error);
    return { prompt: null, dismissed: false };
  }
};

/**
 * Dismiss the icebreaker for a session
 * @param {string} chatSessionId - The chat session ID
 * @returns {Promise<boolean>}
 */
export const dismissIcebreaker = async (chatSessionId) => {
  try {
    const chatSession = await ChatSession.findById(chatSessionId);
    if (!chatSession) {
      return false;
    }

    chatSession.icebreakerDismissed = true;
    chatSession.currentIcebreaker = null;
    await chatSession.save();
    
    return true;
  } catch (error) {
    console.error('[ICEBREAKER] Error dismissing icebreaker:', error);
    return false;
  }
};

/**
 * Initialize icebreaker for a new chat session
 * @param {string} chatSessionId - The chat session ID
 * @returns {Promise<string|null>}
 */
export const initializeIcebreaker = async (chatSessionId) => {
  try {
    const chatSession = await ChatSession.findById(chatSessionId);
    if (!chatSession) {
      return null;
    }

    // Only initialize if no icebreaker has been set yet
    if (!chatSession.currentIcebreaker && !chatSession.icebreakerDismissed) {
      const prompt = prompts[Math.floor(Math.random() * prompts.length)];
      chatSession.currentIcebreaker = prompt;
      chatSession.usedIcebreakers = [prompt];
      await chatSession.save();
      return prompt;
    }

    return chatSession.currentIcebreaker;
  } catch (error) {
    console.error('[ICEBREAKER] Error initializing icebreaker:', error);
    return null;
  }
};

export default {
  getIcebreaker,
  refreshIcebreaker,
  dismissIcebreaker,
  initializeIcebreaker
};

/**
 * Icebreaker Service - US-14
 * Handles random prompt selection and tracking for chat sessions
 */

import ChatSession from '../models/ChatSession.js';
import prompts from '../data/prompts.json' with { type: 'json' };

/**
 * Get a random prompt excluding already used ones
 * @param {Array<number>} usedPromptIds - IDs of prompts already used in this session
 * @returns {Object} Selected prompt with id, text, and tags
 */
export const getRandomPrompt = (usedPromptIds = []) => {
  let availablePrompts = prompts.filter(p => !usedPromptIds.includes(p.id));
  
  // If all prompts have been used, reset and allow any
  if (availablePrompts.length === 0) {
    availablePrompts = prompts;
  }

  const randomIndex = Math.floor(Math.random() * availablePrompts.length);
  return availablePrompts[randomIndex];
};

/**
 * Get the next icebreaker prompt for a chat session
 * Tracks used prompts to avoid repetition
 * @param {string} sessionId - Chat session ID
 * @returns {Object} { prompt, isNew }
 */
export const getNextPromptForSession = async (sessionId) => {
  const session = await ChatSession.findById(sessionId);
  
  if (!session) {
    throw new Error('Chat session not found');
  }

  // If session already has a current prompt, return it
  if (session.currentPrompt && session.currentPrompt.text) {
    return {
      prompt: session.currentPrompt,
      isNew: false
    };
  }

  const usedIds = session.usedPromptIds || [];
  const selectedPrompt = getRandomPrompt(usedIds);

  // Update session with new prompt and track it
  const updatedSession = await ChatSession.findByIdAndUpdate(
    sessionId,
    {
      $addToSet: { usedPromptIds: selectedPrompt.id },
      currentPrompt: {
        id: selectedPrompt.id,
        text: selectedPrompt.text,
        assignedAt: new Date()
      }
    },
    { new: true }
  );

  return {
    prompt: {
      id: selectedPrompt.id,
      text: selectedPrompt.text,
      tags: selectedPrompt.tags
    },
    isNew: true
  };
};

/**
 * Request a new icebreaker prompt for an existing session
 * Used when users want a different conversation starter
 * @param {string} sessionId - Chat session ID
 * @returns {Object} { prompt, promptsRemaining }
 */
export const requestNewPrompt = async (sessionId) => {
  const session = await ChatSession.findById(sessionId);
  
  if (!session) {
    throw new Error('Chat session not found');
  }

  const usedIds = session.usedPromptIds || [];
  const selectedPrompt = getRandomPrompt(usedIds);

  // Check if all prompts have been used (will reset)
  const totalPrompts = prompts.length;
  const newUsedIds = [...new Set([...usedIds, selectedPrompt.id])];
  const promptsRemaining = totalPrompts - newUsedIds.length;

  await ChatSession.findByIdAndUpdate(
    sessionId,
    {
      $addToSet: { usedPromptIds: selectedPrompt.id },
      currentPrompt: {
        id: selectedPrompt.id,
        text: selectedPrompt.text,
        assignedAt: new Date()
      }
    }
  );

  return {
    prompt: {
      id: selectedPrompt.id,
      text: selectedPrompt.text,
      tags: selectedPrompt.tags
    },
    promptsRemaining: promptsRemaining >= 0 ? promptsRemaining : totalPrompts - 1
  };
};

/**
 * Get the current prompt for a session without changing it
 * @param {string} sessionId - Chat session ID
 * @returns {Object|null} Current prompt or null if none set
 */
export const getCurrentPrompt = async (sessionId) => {
  const session = await ChatSession.findById(sessionId);
  
  if (!session || !session.currentPrompt) {
    return null;
  }

  return session.currentPrompt;
};

/**
 * Get all available prompts (for admin/testing)
 * @returns {Array} All prompts
 */
export const getAllPrompts = () => {
  return prompts;
};

/**
 * Get prompt statistics for a session
 * @param {string} sessionId - Chat session ID
 * @returns {Object} { usedCount, totalCount, remainingCount }
 */
export const getPromptStats = async (sessionId) => {
  const session = await ChatSession.findById(sessionId);
  
  if (!session) {
    throw new Error('Chat session not found');
  }

  const usedCount = (session.usedPromptIds || []).length;
  const totalCount = prompts.length;

  return {
    usedCount,
    totalCount,
    remainingCount: Math.max(0, totalCount - usedCount)
  };
};

export default {
  getRandomPrompt,
  getNextPromptForSession,
  requestNewPrompt,
  getCurrentPrompt,
  getAllPrompts,
  getPromptStats
};

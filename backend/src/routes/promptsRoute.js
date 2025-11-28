import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/authMiddleware.js';
import icebreakerService from '../services/icebreakerService.js';

const router = express.Router();

// Resolve data file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, '../data/prompts.json');

// Load prompts once at startup
let prompts = [];
try {
  const raw = fs.readFileSync(dataPath, 'utf-8');
  prompts = JSON.parse(raw);
} catch (e) {
  prompts = [];
}

// Simple in-memory LRU per session and global
const sessionRecent = new Map(); // sessionId -> array of ids (bounded)
const GLOBAL_BOUND = 100;
let globalRecent = [];

function pickPrompt({ excludeIds = [], tags } = {}) {
  const pool = prompts.filter(p => !tags || tags.length === 0 || (p.tags || []).some(t => tags.includes(t)));
  const excluded = new Set(excludeIds);
  const candidates = pool.filter(p => !excluded.has(p.id) && !globalRecent.includes(p.id));
  const list = candidates.length ? candidates : pool.filter(p => !excluded.has(p.id));
  if (!list.length) return null;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

// Legacy endpoint - kept for backward compatibility
router.post('/next', (req, res) => {
  const { sessionId, excludeIds = [], tags = [] } = req.body || {};
  const recentForSession = sessionRecent.get(sessionId) || [];
  const exclude = Array.isArray(excludeIds) ? excludeIds.slice() : [];
  // avoid recent repeats per session
  exclude.push(...recentForSession);
  const prompt = pickPrompt({ excludeIds: exclude, tags });
  if (!prompt) return res.status(404).json({ error: 'No prompts available' });
  // update LRU structures
  const BOUND = 10;
  const updated = [prompt.id, ...recentForSession.filter(id => id !== prompt.id)].slice(0, BOUND);
  sessionRecent.set(sessionId, updated);
  globalRecent = [prompt.id, ...globalRecent.filter(id => id !== prompt.id)].slice(0, GLOBAL_BOUND);
  return res.json({ id: prompt.id, text: prompt.text });
});

// ============================================
// US-14: Enhanced Icebreaker Endpoints
// ============================================

/**
 * GET /api/prompts/session/:chatSessionId
 * Get the current icebreaker prompt for a chat session
 * Creates one if none exists
 */
router.get('/session/:chatSessionId', authenticateToken, async (req, res) => {
  try {
    const { chatSessionId } = req.params;
    
    const result = await icebreakerService.getNextPromptForSession(chatSessionId);
    
    res.json({
      success: true,
      prompt: result.prompt,
      isNew: result.isNew
    });
  } catch (error) {
    console.error('[PROMPTS] Error getting session prompt:', error);
    res.status(error.message === 'Chat session not found' ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to get prompt'
    });
  }
});

/**
 * POST /api/prompts/session/:chatSessionId/refresh
 * Request a new icebreaker prompt for the session
 */
router.post('/session/:chatSessionId/refresh', authenticateToken, async (req, res) => {
  try {
    const { chatSessionId } = req.params;
    
    const result = await icebreakerService.requestNewPrompt(chatSessionId);
    
    res.json({
      success: true,
      prompt: result.prompt,
      promptsRemaining: result.promptsRemaining
    });
  } catch (error) {
    console.error('[PROMPTS] Error refreshing prompt:', error);
    res.status(error.message === 'Chat session not found' ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to refresh prompt'
    });
  }
});

/**
 * GET /api/prompts/session/:chatSessionId/stats
 * Get prompt usage statistics for a session
 */
router.get('/session/:chatSessionId/stats', authenticateToken, async (req, res) => {
  try {
    const { chatSessionId } = req.params;
    
    const stats = await icebreakerService.getPromptStats(chatSessionId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[PROMPTS] Error getting prompt stats:', error);
    res.status(error.message === 'Chat session not found' ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to get prompt stats'
    });
  }
});

/**
 * GET /api/prompts/all
 * Get all available prompts (admin/testing)
 */
router.get('/all', authenticateToken, (req, res) => {
  try {
    const allPrompts = icebreakerService.getAllPrompts();
    
    res.json({
      success: true,
      prompts: allPrompts,
      count: allPrompts.length
    });
  } catch (error) {
    console.error('[PROMPTS] Error getting all prompts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get prompts'
    });
  }
});

export default router;


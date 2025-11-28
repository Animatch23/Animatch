import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

export default router;

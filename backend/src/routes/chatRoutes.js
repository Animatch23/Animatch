import express from "express";
import { protect, authenticate } from "../middleware/authMiddleware.js";
import {
  nextChat,
  getActiveChat,
  getChatHistory,
  endChatSession,
  saveChatSession
} from "../controllers/chatController.js";
import {
  joinQueue,
  getQueueStatus,
  leaveQueue,
  getActiveMatch
} from "../controllers/queueController.js";

const router = express.Router();

// --- Queue Routes (from sprint-2) ---
router.post('/queue/join', authenticate, joinQueue);
router.get('/queue/status', authenticate, getQueueStatus);
router.post('/queue/leave', authenticate, leaveQueue);
router.get('/match/active', authenticate, getActiveMatch);

// --- Chat Routes ---

// POST /api/chat/next - End current chat and return to queue (from us-6)
// Using protect to ensure compatibility with tests
router.post("/next", protect, nextChat);

// GET /api/chat/active - Get current active chat session (Shared)
// Using protect to ensure compatibility with tests
router.get("/active", protect, getActiveChat);

// Chat management routes (from sprint-2)
router.get('/:chatSessionId/history', authenticate, getChatHistory);
// filepath: c:\Bon_AllGit\Animatch\backend\src\routes\chatRoutes.js
import express from "express";
import { protect, authenticate } from "../middleware/authMiddleware.js";
import {
  nextChat,
  getActiveChat,
  getChatHistory,
  endChatSession,
  saveChatSession
} from "../controllers/chatController.js";
import {
  joinQueue,
  getQueueStatus,
  leaveQueue,
  getActiveMatch
} from "../controllers/queueController.js";

const router = express.Router();

// --- Queue Routes (from sprint-2) ---
router.post('/queue/join', authenticate, joinQueue);
router.get('/queue/status', authenticate, getQueueStatus);
router.post('/queue/leave', authenticate, leaveQueue);
router.get('/match/active', authenticate, getActiveMatch);

// --- Chat Routes ---

// POST /api/chat/next - End current chat and return to queue (from us-6)
// Using protect to ensure compatibility with tests
router.post("/next", protect, nextChat);

// GET /api/chat/active - Get current active chat session (Shared)
// Using protect to ensure compatibility with tests
router.get("/active", protect, getActiveChat);

// Chat management routes (from sprint-2)
router.get('/:chatSessionId/history', authenticate, getChatHistory);
router.post('/:chatSessionId/end', authenticate, endChatSession);
router.post('/:chatSessionId/save', authenticate, saveChatSession);

export default router;
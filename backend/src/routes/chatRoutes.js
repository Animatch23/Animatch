import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getActiveChat,
  getChatHistory,
  endChatSession,
  saveChatSession
} from '../controllers/chatController.js';
import {
  joinQueue,
  getQueueStatus,
  leaveQueue,
  getActiveMatch
} from '../controllers/queueController.js';

const router = express.Router();

router.post('/queue/join', authenticate, joinQueue);
router.get('/queue/status', authenticate, getQueueStatus);
router.post('/queue/leave', authenticate, leaveQueue);
router.get('/match/active', authenticate, getActiveMatch);

// All routes require authentication
router.get('/active', authenticate, getActiveChat);
router.get('/:chatSessionId/history', authenticate, getChatHistory);
router.post('/:chatSessionId/end', authenticate, endChatSession);
router.post('/:chatSessionId/save', authenticate, saveChatSession);

export default router;
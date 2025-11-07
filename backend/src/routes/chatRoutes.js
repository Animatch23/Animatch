import express from 'express';
import { saveMatch, getChatHistory, getChatSession } from '../controllers/chatController.js';

const router = express.Router();
router.get('/history', getChatHistory);
router.get('/:sessionId', getChatSession);
router.post('/:sessionId/save', saveMatch);

export default router;
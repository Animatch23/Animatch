import express from 'express';
import { saveMatch } from '../controllers/chatController.js';

const router = express.Router();
router.post('/:sessionId/save', saveMatch);

export default router;
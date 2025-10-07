import express from 'express';
import { joinQueue, leaveQueue, checkQueueStatus } from '../controllers/queueController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Authentication on all routes
router.use(protect);

router.post('/join', joinQueue);
router.post('/leave', leaveQueue);
router.get('/status', checkQueueStatus);

export default router;
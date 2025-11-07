import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { unmatchUser, getUnmatchHistory } from '../controllers/unmatchController.js';

const router = express.Router();

/**
 * POST /api/unmatch
 * Unmatch from current chat partner
 * Requires authentication
 */
router.post('/', authenticate, unmatchUser);

/**
 * GET /api/unmatch/history
 * Get unmatch history for current user
 * Requires authentication
 * Optional endpoint for debugging/admin purposes
 */
router.get('/history', authenticate, getUnmatchHistory);

export default router;

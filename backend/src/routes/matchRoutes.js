import express from 'express';
import Match from '../models/Match.js';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  joinQueue,
  getQueueStatus,
  leaveQueue
} from '../controllers/queueController.js';

const router = express.Router();

// Queue routes (rely on shared controllers)
router.post('/queue/join', authenticate, joinQueue);
router.get('/queue/status', authenticate, getQueueStatus);
router.post('/queue/leave', authenticate, leaveQueue);

// Get active match
router.get('/match/active', authenticate, async (req, res) => {
    try {
        const { email } = req.user;
        
        const match = await Match.findOne({
            $or: [
                { 'user1.userId': email },
                { 'user2.userId': email }
            ],
            status: 'active'
        });

        if (!match) {
            return res.status(404).json({ message: 'No active match' });
        }

        const partner = match.user1.userId === email ? match.user2 : match.user1;

        console.log(`[MATCH ACTIVE] User ${email} has active match with ${partner.username}`);

        res.json({
            matchId: match._id,
            partner: {
                username: partner.username
            },
            createdAt: match.createdAt
        });

    } catch (error) {
        console.error('[MATCH ACTIVE] Error:', error);
        res.status(500).json({ message: 'Failed to get match' });
    }
});

// End match
router.post('/match/end', authenticate, async (req, res) => {
    try {
        const { email } = req.user;
        
        const match = await Match.findOneAndUpdate(
            {
                $or: [
                    { 'user1.userId': email },
                    { 'user2.userId': email }
                ],
                status: 'active'
            },
            { status: 'ended' },
            { new: true }
        );

        if (!match) {
            return res.status(404).json({ message: 'No active match to end' });
        }

        console.log(`[MATCH END] User ${email} ended match ${match._id}`);

        res.json({ message: 'Match ended successfully' });

    } catch (error) {
        console.error('[MATCH END] Error:', error);
        res.status(500).json({ message: 'Failed to end match' });
    }
});

export default router;
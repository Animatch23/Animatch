import express from 'express';
import ChatSession from '../models/ChatSession.js';
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

// Get active match (now queries ChatSession)
router.get('/match/active', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const chatSession = await ChatSession.findOne({
            participants: userId,
            active: true,
            expiresAt: { $gt: new Date() }
        }).populate('participants', 'username');

        if (!chatSession) {
            return res.status(404).json({ message: 'No active match' });
        }

        const partner = chatSession.participants.find(
            p => p._id.toString() !== userId.toString()
        );

        console.log(`[MATCH ACTIVE] User ${userId} has active chat with ${partner?.username}`);

        res.json({
            chatSessionId: chatSession._id,
            partner: {
                username: partner?.username || 'Anonymous'
            },
            createdAt: chatSession.startedAt,
            expiresAt: chatSession.expiresAt,
            isSaved: chatSession.isSaved
        });

    } catch (error) {
        console.error('[MATCH ACTIVE] Error:', error);
        res.status(500).json({ message: 'Failed to get match' });
    }
});

// End match (now updates ChatSession)
router.post('/match/end', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const chatSession = await ChatSession.findOneAndUpdate(
            {
                participants: userId,
                active: true
            },
            { 
                active: false,
                endedAt: new Date()
            },
            { new: true }
        );

        if (!chatSession) {
            return res.status(404).json({ message: 'No active match to end' });
        }

        console.log(`[MATCH END] User ${userId} ended chat session ${chatSession._id}`);

        res.json({ message: 'Match ended successfully' });

    } catch (error) {
        console.error('[MATCH END] Error:', error);
        res.status(500).json({ message: 'Failed to end match' });
    }
});

export default router;
import express from 'express';
import Queue from '../models/Queue.js';
import Match from '../models/Match.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Join queue
router.post('/queue/join', authenticate, async (req, res) => {
    try {
        const { email, username } = req.user;

        // Check if user already has an active match
        const existingMatch = await Match.findOne({
            $or: [
                { 'user1.userId': email },
                { 'user2.userId': email }
            ],
            status: 'active'
        });

        if (existingMatch) {
            return res.status(400).json({ 
                message: 'You already have an active match',
                matchId: existingMatch._id 
            });
        }

        // Check if user is already in queue
        let queueEntry = await Queue.findOne({ userId: email });
        
        if (queueEntry) {
            return res.json({ 
                message: 'Already in queue',
                position: await Queue.countDocuments({ joinedAt: { $lt: queueEntry.joinedAt } }) + 1
            });
        }

        // Add to queue
        queueEntry = await Queue.create({
            userId: email,
            username: username,
            status: 'waiting'
        });

        // Try to find a match immediately
        const potentialMatch = await Queue.findOne({
            userId: { $ne: email },
            status: 'waiting'
        }).sort({ joinedAt: 1 });

        if (potentialMatch) {
            // Create match
            const match = await Match.create({
                user1: {
                    userId: email,
                    username: username
                },
                user2: {
                    userId: potentialMatch.userId,
                    username: potentialMatch.username
                },
                status: 'active'
            });

            // Remove both from queue
            await Queue.deleteMany({
                userId: { $in: [email, potentialMatch.userId] }
            });

            return res.json({
                matched: true,
                matchId: match._id,
                partner: {
                    username: potentialMatch.username
                }
            });
        }

        res.json({ 
            matched: false,
            message: 'Added to queue, waiting for match...',
            queueId: queueEntry._id
        });

    } catch (error) {
        console.error('Queue join error:', error);
        res.status(500).json({ message: 'Failed to join queue' });
    }
});

// Check match status (polling endpoint)
router.get('/queue/status', authenticate, async (req, res) => {
    try {
        const { email, username } = req.user;

        // Check if matched
        const match = await Match.findOne({
            $or: [
                { 'user1.userId': email },
                { 'user2.userId': email }
            ],
            status: 'active'
        });

        if (match) {
            const partner = match.user1.userId === email ? match.user2 : match.user1;
            
            // Remove from queue if still there
            await Queue.deleteOne({ userId: email });

            return res.json({
                matched: true,
                matchId: match._id,
                partner: {
                    username: partner.username
                }
            });
        }

        // Check queue status
        const queueEntry = await Queue.findOne({ userId: email });
        
        if (!queueEntry) {
            return res.json({
                matched: false,
                inQueue: false
            });
        }

        const position = await Queue.countDocuments({ 
            joinedAt: { $lt: queueEntry.joinedAt } 
        }) + 1;

        res.json({
            matched: false,
            inQueue: true,
            position: position
        });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ message: 'Failed to check status' });
    }
});

// Leave queue
router.post('/queue/leave', authenticate, async (req, res) => {
    try {
        await Queue.deleteOne({ userId: req.user.email });
        res.json({ message: 'Left queue successfully' });
    } catch (error) {
        console.error('Leave queue error:', error);
        res.status(500).json({ message: 'Failed to leave queue' });
    }
});

// Get active match
router.get('/match/active', authenticate, async (req, res) => {
    try {
        const match = await Match.findOne({
            $or: [
                { 'user1.userId': req.user.email },
                { 'user2.userId': req.user.email }
            ],
            status: 'active'
        });

        if (!match) {
            return res.status(404).json({ message: 'No active match' });
        }

        const partner = match.user1.userId === req.user.email ? match.user2 : match.user1;

        res.json({
            matchId: match._id,
            partner: {
                username: partner.username
            },
            createdAt: match.createdAt
        });

    } catch (error) {
        console.error('Get match error:', error);
        res.status(500).json({ message: 'Failed to get match' });
    }
});

// End match
router.post('/match/end', authenticate, async (req, res) => {
    try {
        const match = await Match.findOneAndUpdate(
            {
                $or: [
                    { 'user1.userId': req.user.email },
                    { 'user2.userId': req.user.email }
                ],
                status: 'active'
            },
            { status: 'ended' },
            { new: true }
        );

        if (!match) {
            return res.status(404).json({ message: 'No active match to end' });
        }

        res.json({ message: 'Match ended successfully' });

    } catch (error) {
        console.error('End match error:', error);
        res.status(500).json({ message: 'Failed to end match' });
    }
});

export default router;
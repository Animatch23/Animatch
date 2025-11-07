import express from 'express';
import Queue from '../models/Queue.js';
import Match from '../models/Match.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Join queue
router.post('/queue/join', authenticate, async (req, res) => {
    try {
        const { email, username } = req.user;

        console.log(`[QUEUE JOIN] User: ${email} (${username})`);

        // Check if user already has an active match
        const existingMatch = await Match.findOne({
            $or: [
                { 'user1.userId': email },
                { 'user2.userId': email }
            ],
            status: 'active'
        });

        if (existingMatch) {
            console.log(`[QUEUE JOIN] User ${email} already has active match`);
            return res.status(400).json({ 
                message: 'You already have an active match',
                matchId: existingMatch._id 
            });
        }

        // Check if user is already in queue
        let queueEntry = await Queue.findOne({ userId: email });
        
        if (queueEntry) {
            console.log(`[QUEUE JOIN] User ${email} already in queue`);
            const position = await Queue.countDocuments({ joinedAt: { $lt: queueEntry.joinedAt } }) + 1;
            return res.json({ 
                message: 'Already in queue',
                matched: false,
                position: position
            });
        }

        // Add to queue
        queueEntry = await Queue.create({
            userId: email,
            username: username,
            status: 'waiting',
            joinedAt: new Date()
        });

        console.log(`[QUEUE JOIN] Added ${email} to queue`);

        // Try to find a match immediately
        const potentialMatch = await Queue.findOne({
            userId: { $ne: email },
            status: 'waiting'
        }).sort({ joinedAt: 1 });

        if (potentialMatch) {
            console.log(`[QUEUE JOIN] Found match: ${email} <-> ${potentialMatch.userId}`);
            
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
                status: 'active',
                createdAt: new Date()
            });

            // Remove both from queue
            await Queue.deleteMany({
                userId: { $in: [email, potentialMatch.userId] }
            });

            console.log(`[QUEUE JOIN] Match created: ${match._id}`);

            return res.json({
                matched: true,
                matchId: match._id,
                partner: {
                    username: potentialMatch.username
                }
            });
        }

        console.log(`[QUEUE JOIN] No match found, user ${email} waiting in queue`);

        res.json({ 
            matched: false,
            message: 'Added to queue, waiting for match...',
            queueId: queueEntry._id
        });

    } catch (error) {
        console.error('[QUEUE JOIN] Error:', error);
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

            console.log(`[QUEUE STATUS] User ${email} matched with ${partner.username}`);

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
            console.log(`[QUEUE STATUS] User ${email} not in queue`);
            return res.json({
                matched: false,
                inQueue: false
            });
        }

        const position = await Queue.countDocuments({ 
            joinedAt: { $lt: queueEntry.joinedAt } 
        }) + 1;

        console.log(`[QUEUE STATUS] User ${email} in queue, position: ${position}`);

        res.json({
            matched: false,
            inQueue: true,
            position: position
        });

    } catch (error) {
        console.error('[QUEUE STATUS] Error:', error);
        res.status(500).json({ message: 'Failed to check status' });
    }
});

// Leave queue
router.post('/queue/leave', authenticate, async (req, res) => {
    try {
        const { email } = req.user;
        await Queue.deleteOne({ userId: email });
        console.log(`[QUEUE LEAVE] User ${email} left queue`);
        res.json({ message: 'Left queue successfully' });
    } catch (error) {
        console.error('[QUEUE LEAVE] Error:', error);
        res.status(500).json({ message: 'Failed to leave queue' });
    }
});

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
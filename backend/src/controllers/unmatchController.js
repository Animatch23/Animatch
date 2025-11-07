import Match from '../models/Match.js';
import ChatSession from '../models/ChatSession.js';
import { notifyBothUsersUnmatch } from '../utils/notificationService.js';

/**
 * Unmatch Controller
 * Handles unmatching users and cleaning up chat data
 */

/**
 * Unmatch a user from their current chat partner
 * POST /api/unmatch
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user from middleware
 * @param {String} req.user.email - User's email
 * @param {String} req.user.username - User's username
 * @param {Object} res - Express response object
 */
export const unmatchUser = async (req, res) => {
    try {
        const { email, username } = req.user;

        console.log(`[UNMATCH] ==========================================`);
        console.log(`[UNMATCH] Unmatch initiated by: ${email} (${username})`);
        console.log(`[UNMATCH] Timestamp: ${new Date().toISOString()}`);

        // Find active match for this user
        const match = await Match.findOne({
            $or: [
                { 'user1.userId': email },
                { 'user2.userId': email }
            ],
            status: 'active'
        });

        if (!match) {
            console.log(`[UNMATCH] No active match found for user: ${email}`);
            return res.status(404).json({ 
                success: false,
                message: 'No active chat session found' 
            });
        }

        console.log(`[UNMATCH] Active match found: ${match._id}`);

        // Determine partner details
        const isUser1 = match.user1.userId === email;
        const partner = isUser1 ? match.user2 : match.user1;
        
        console.log(`[UNMATCH] Partner: ${partner.userId} (${partner.username})`);

        // Update match status to 'unmatched'
        match.status = 'unmatched';
        match.unmatchedAt = new Date();
        match.unmatchedBy = email;
        await match.save();

        console.log(`[UNMATCH] Match ${match._id} status updated to 'unmatched'`);

        // Find and delete/mark chat session
        const chatSession = await ChatSession.findOne({
            participants: { 
                $all: [email, partner.userId] 
            },
            active: true
        });

        if (chatSession) {
            // Mark chat session as unmatched (soft delete)
            chatSession.active = false;
            chatSession.unmatched = true;
            chatSession.unmatchedBy = email;
            chatSession.unmatchedAt = new Date();
            chatSession.endedAt = new Date();
            await chatSession.save();

            console.log(`[UNMATCH] Chat session ${chatSession._id} marked as unmatched`);
        } else {
            console.log(`[UNMATCH] No chat session found (may not have been created yet)`);
        }

        // Notify both users about the unmatch
        console.log(`[UNMATCH] Sending notifications to both users...`);
        const notificationResult = await notifyBothUsersUnmatch(
            email,
            partner.userId,
            username,
            partner.username,
            match._id.toString()
        );

        console.log(`[UNMATCH] Notifications sent:`, notificationResult);
        console.log(`[UNMATCH] Unmatch completed successfully`);
        console.log(`[UNMATCH] ==========================================`);

        return res.status(200).json({
            success: true,
            message: 'Successfully unmatched',
            data: {
                matchId: match._id,
                unmatchedAt: match.unmatchedAt,
                partnerUsername: partner.username,
                notificationSent: notificationResult.partnerNotified
            }
        });

    } catch (error) {
        console.error('[UNMATCH] Error during unmatch:', error);
        console.error('[UNMATCH] Error stack:', error.stack);
        return res.status(500).json({ 
            success: false,
            message: 'Failed to unmatch user',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get unmatch history for a user (optional - for debugging/admin)
 * GET /api/unmatch/history
 */
export const getUnmatchHistory = async (req, res) => {
    try {
        const { email } = req.user;

        console.log(`[UNMATCH HISTORY] Fetching history for: ${email}`);

        const unmatchedMatches = await Match.find({
            $or: [
                { 'user1.userId': email },
                { 'user2.userId': email }
            ],
            status: 'unmatched'
        }).sort({ unmatchedAt: -1 });

        console.log(`[UNMATCH HISTORY] Found ${unmatchedMatches.length} unmatched sessions for ${email}`);

        const history = unmatchedMatches.map(match => {
            const isUser1 = match.user1.userId === email;
            const partner = isUser1 ? match.user2 : match.user1;
            const wasInitiator = match.unmatchedBy === email;

            return {
                matchId: match._id,
                partnerUsername: partner.username,
                createdAt: match.createdAt,
                unmatchedAt: match.unmatchedAt,
                wasInitiator: wasInitiator
            };
        });

        return res.status(200).json({
            success: true,
            count: history.length,
            history: history
        });

    } catch (error) {
        console.error('[UNMATCH HISTORY] Error:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Failed to fetch unmatch history' 
        });
    }
};

export default {
    unmatchUser,
    getUnmatchHistory
};

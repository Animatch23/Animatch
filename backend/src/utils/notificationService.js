/**
 * Notification Service (MOCKED for Sprint 1)
 * 
 * This service handles notifications to users about chat events.
 * Currently mocked with console logs - will be replaced with real-time
 * notifications (WebSocket/Socket.io) in Sprint 2.
 */

/**
 * Notify a user that they have been unmatched
 * @param {String} userId - Email of the user to notify
 * @param {String} partnerUsername - Username of the partner who unmatched
 * @param {String} matchId - ID of the match that was ended
 * @returns {Promise<Object>} Notification result
 */
export const notifyUnmatch = async (userId, partnerUsername, matchId) => {
    try {
        console.log(`[NOTIFICATION SERVICE] ==========================================`);
        console.log(`[NOTIFICATION SERVICE] Unmatch Notification Triggered`);
        console.log(`[NOTIFICATION SERVICE] To: ${userId}`);
        console.log(`[NOTIFICATION SERVICE] Partner: ${partnerUsername}`);
        console.log(`[NOTIFICATION SERVICE] Match ID: ${matchId}`);
        console.log(`[NOTIFICATION SERVICE] Timestamp: ${new Date().toISOString()}`);
        console.log(`[NOTIFICATION SERVICE] ==========================================`);

        // Mock notification delivery
        // In Sprint 2, this will:
        // - Send WebSocket/Socket.io event to connected user
        // - Send push notification if user is offline
        // - Update user's notification center

        return {
            success: true,
            notified: true,
            userId: userId,
            timestamp: new Date(),
            method: 'MOCKED' // Will be 'websocket', 'push', etc. in Sprint 2
        };
    } catch (error) {
        console.error(`[NOTIFICATION SERVICE] Error notifying ${userId}:`, error);
        return {
            success: false,
            notified: false,
            userId: userId,
            error: error.message
        };
    }
};

/**
 * Notify both users about an unmatch event
 * @param {String} initiatorId - User who initiated unmatch
 * @param {String} partnerId - User who was unmatched
 * @param {String} initiatorUsername - Username of initiator
 * @param {String} partnerUsername - Username of partner
 * @param {String} matchId - ID of the match
 * @returns {Promise<Object>} Notification results
 */
export const notifyBothUsersUnmatch = async (
    initiatorId,
    partnerId,
    initiatorUsername,
    partnerUsername,
    matchId
) => {
    console.log(`[NOTIFICATION SERVICE] Notifying both users about unmatch`);
    
    // Notify partner (they need to know they were unmatched)
    const partnerNotification = await notifyUnmatch(partnerId, initiatorUsername, matchId);
    
    // Optionally notify initiator (confirmation)
    console.log(`[NOTIFICATION SERVICE] Unmatch initiated by: ${initiatorId}`);
    console.log(`[NOTIFICATION SERVICE] Unmatch confirmed for initiator`);
    
    return {
        initiatorNotified: true,
        partnerNotified: partnerNotification.success,
        timestamp: new Date()
    };
};

export default {
    notifyUnmatch,
    notifyBothUsersUnmatch
};

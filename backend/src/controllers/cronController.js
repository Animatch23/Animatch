import ChatSession from '../models/ChatSession.js';
import Queue from '../models/Queue.js';

export const expireChats = async () => {
    console.log('Running expiry job...');
    try {
        const expiryThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); 
        const result = await ChatSession.updateMany(
        {
            active: true,
            isSaved: false,
            startedAt: { $lt: expiryThreshold }
        },
        {
            $set: {
            active: false,
            endedAt: new Date()
            }
        }
        );

        if (result.modifiedCount > 0) {
            console.log(`Expired ${result.modifiedCount} chat sessions.`);
        } else {
            console.log('No chat sessions to expire.');
        }

    } catch (err) {
        console.error('Error in expiry job:', err);
    }
};

/**
 * Clean up stale queue entries (ghost users)
 * This is a safety net in case socket-based cleanup fails
 * Removes queue entries older than 5 minutes
 */
export const cleanupStaleQueueEntries = async () => {
    console.log('Running stale queue cleanup...');
    try {
        // Remove queue entries older than 5 minutes
        const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
        const result = await Queue.deleteMany({
            createdAt: { $lt: staleThreshold }
        });

        if (result.deletedCount > 0) {
            console.log(`⭐ Cleaned up ${result.deletedCount} stale queue entries (ghost users).`);
        } else {
            console.log('No stale queue entries to clean up.');
        }

    } catch (err) {
        console.error('Error in stale queue cleanup:', err);
    }
};
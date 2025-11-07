import ChatSession from '../models/ChatSession.js';

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
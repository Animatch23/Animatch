import ChatSession from '../models/ChatSession.js';
import Queue from '../models/Queue.js';
import User from '../models/User.js';

/**
 * Join the matchmaking queue
 */
export const joinQueue = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log(`[QUEUE JOIN] User: ${user.email} (${user.username})`);

    // Check if user already has an active chat
    const existingChat = await ChatSession.findOne({
      participants: userId,
      active: true,
      expiresAt: { $gt: new Date() }
    });

    if (existingChat) {
      console.log(`[QUEUE JOIN] User ${user.email} already in active chat`);
      return res.json({
        matched: true,
        chatSessionId: existingChat._id.toString()
      });
    }

    // Check if user is already in queue
    const existingQueueEntry = await Queue.findOne({ userId });
    if (existingQueueEntry) {
      console.log(`[QUEUE JOIN] User ${user.email} already in queue, attempting to match`);
    } else {
      // Add to queue using upsert to prevent duplicates
      await Queue.updateOne(
        { userId },
        { $set: { userId, status: 'waiting', createdAt: new Date() } },
        { upsert: true }
      );
      console.log(`[QUEUE JOIN] Added ${user.email} to queue`);
    }

    // Try to find a match - look for ANY waiting user except current user
    const waitingUsers = await Queue.find({
      status: 'waiting',
      userId: { $ne: userId }
    }).sort({ createdAt: 1 }).limit(10); // Get multiple candidates

    if (waitingUsers.length === 0) {
      console.log(`[QUEUE JOIN] No match found for ${user.email}, staying in queue`);
      return res.json({ matched: false, queued: true });
    }

    // Pick the first available partner
    const partner = waitingUsers[0];
    const partnerUser = await User.findById(partner.userId);

    if (!partnerUser) {
      console.log(`[QUEUE JOIN] Partner user not found, staying in queue`);
      return res.json({ matched: false, queued: true });
    }

    console.log(`[QUEUE JOIN] Attempting to match: ${user.email} <-> ${partnerUser.email}`);

    // Try to remove both from queue atomically to prevent double-matching
    const deleteResult = await Queue.deleteMany({
      userId: { $in: [userId, partner.userId] }
    });

    if (deleteResult.deletedCount < 2) {
      console.log(`[QUEUE JOIN] Race condition detected, one user already matched`);
      // Re-add current user to queue if partner was taken
      await Queue.updateOne(
        { userId },
        { $set: { userId, status: 'waiting', createdAt: new Date() } },
        { upsert: true }
      );
      return res.json({ matched: false, queued: true });
    }

    // Create ChatSession (expires in 30 minutes)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const chatSession = await ChatSession.create({
      participants: [userId, partner.userId],
      users: [userId, partner.userId],
      active: true,
      startedAt: new Date(),
      expiresAt
    });

    console.log(`[QUEUE JOIN] Match created: ${chatSession._id} - ${user.email} <-> ${partnerUser.email}`);

    return res.json({
      matched: true,
      chatSessionId: chatSession._id.toString()
    });
  } catch (error) {
    console.error('[QUEUE JOIN] Error:', error);
    res.status(500).json({ message: 'Failed to join queue' });
  }
};

/**
 * Get queue status
 */
export const getQueueStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);

    // Check active chat first
    const activeChat = await ChatSession.findOne({
      participants: userId,
      active: true,
      expiresAt: { $gt: new Date() }
    });

    if (activeChat) {
      const partner = await User.findOne({
        _id: { $in: activeChat.participants, $ne: userId }
      });
      
      console.log(`[QUEUE STATUS] User ${user.email} matched with ${partner?.username}`);
      return res.json({
        queued: false,
        matched: true,
        chatSessionId: activeChat._id.toString()
      });
    }

    // Check queue position
    const queueEntry = await Queue.findOne({ userId });
    if (queueEntry) {
      // Try to find a match while checking status
      const waitingUsers = await Queue.find({
        status: 'waiting',
        userId: { $ne: userId }
      }).sort({ createdAt: 1 }).limit(10);

      if (waitingUsers.length > 0) {
        console.log(`[QUEUE STATUS] Found potential match for ${user.email}, attempting to create chat`);
        
        const partner = waitingUsers[0];
        const partnerUser = await User.findById(partner.userId);

        if (partnerUser) {
          // Try to remove both from queue atomically
          const deleteResult = await Queue.deleteMany({
            userId: { $in: [userId, partner.userId] }
          });

          if (deleteResult.deletedCount === 2) {
            // Create ChatSession
            const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
            const chatSession = await ChatSession.create({
              participants: [userId, partner.userId],
              users: [userId, partner.userId],
              active: true,
              startedAt: new Date(),
              expiresAt
            });

            console.log(`[QUEUE STATUS] Match created: ${chatSession._id} - ${user.email} <-> ${partnerUser.email}`);

            return res.json({
              queued: false,
              matched: true,
              chatSessionId: chatSession._id.toString()
            });
          } else {
            // Race condition - re-add user if needed
            await Queue.updateOne(
              { userId },
              { $set: { userId, status: 'waiting', createdAt: new Date() } },
              { upsert: true }
            );
          }
        }
      }

      const position = await Queue.countDocuments({
        createdAt: { $lte: queueEntry.createdAt }
      });
      console.log(`[QUEUE STATUS] User ${user.email} in queue, position: ${position}`);
      return res.json({ queued: true, matched: false, position });
    }

    return res.json({ queued: false, matched: false });
  } catch (error) {
    console.error('[QUEUE STATUS] Error:', error);
    res.status(500).json({ message: 'Failed to get queue status' });
  }
};

/**
 * Leave queue
 */
export const leaveQueue = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: 'User not authenticated' });

    // Only remove queue entry; do NOT end active chat
    await Queue.deleteOne({ userId });
    console.log(`[QUEUE LEAVE] User ${user.email} left queue (active chat untouched)`);

    res.json({ message: 'Left queue' });
  } catch (error) {
    console.error('[QUEUE LEAVE] Error:', error);
    res.status(500).json({ message: 'Failed to leave queue' });
  }
};

/**
 * Check queue status (alias for getQueueStatus for backward compatibility)
 */
export const checkQueueStatus = getQueueStatus;

/**
 * Get active match info
 */
export const getActiveMatch = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);

    const activeChat = await ChatSession.findOne({
      participants: userId,
      active: true,
      expiresAt: { $gt: new Date() }
    }).populate('participants', 'username');

    if (!activeChat) {
      return res.status(404).json({ message: 'No active match' });
    }

    const partner = activeChat.participants.find(
      p => p._id.toString() !== userId.toString()
    );

    console.log(`[MATCH ACTIVE] User ${user.email} has active match with ${partner?.username}`);

    res.json({
      chatSessionId: activeChat._id.toString(),
      partnerUsername: partner?.username || 'Anonymous',
      expiresAt: activeChat.expiresAt
    });
  } catch (error) {
    console.error('[MATCH ACTIVE] Error:', error);
    res.status(500).json({ message: 'Failed to get active match' });
  }
};
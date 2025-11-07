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

    // Remove user from queue if already there
    await Queue.deleteOne({ userId });

    // Add to queue
    await Queue.create({ userId, status: 'waiting' });
    console.log(`[QUEUE JOIN] Added ${user.email} to queue`);

    // Try to find a match
    const waitingUsers = await Queue.find({
      status: 'waiting',
      userId: { $ne: userId }
    }).sort({ createdAt: 1 }).limit(1);

    if (waitingUsers.length === 0) {
      return res.json({ matched: false, queued: true });
    }

    const partner = waitingUsers[0];
    const partnerUser = await User.findById(partner.userId);

    console.log(`[QUEUE JOIN] Found match: ${user.email} <-> ${partnerUser.email}`);

    // Create ChatSession (expires in 30 minutes)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const chatSession = await ChatSession.create({
      participants: [userId, partner.userId],
      users: [userId, partner.userId],
      active: true,
      startedAt: new Date(),
      expiresAt
    });

    console.log(`[QUEUE JOIN] Match created: ${chatSession._id}`);

    // Remove both from queue
    await Queue.deleteMany({
      userId: { $in: [userId, partner.userId] }
    });

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
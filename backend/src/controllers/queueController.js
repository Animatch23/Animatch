import Queue from '../models/Queue.js';
import ChatSession from '../models/ChatSession.js';

// Join the matchmaking queue
export const joinQueue = async (req, res) => {
  try {
    const userId = req.user.id;

    // If user already in an active chat, do not queue them
    const activeChat = await ChatSession.findOne({ participants: userId, active: true });
    if (activeChat) {
      return res.json({
        matched: true,
        chatSession: activeChat
      });
    }

    // Check if user is already in queue
    const existingEntry = await Queue.findOne({ userId });
    if (existingEntry) {
      return res.status(400).json({ message: "Already in queue" });
    }

    // Add user to queue
    const queueEntry = new Queue({
      userId,
      preferences: req.body.preferences || {}
    });
    await queueEntry.save();

    // Try to match immediately
    const match = await findMatch(userId);
    if (match) {
      return res.json({
        matched: true,
        chatSession: match
      });
    }

    console.log("Queue entry saved:", queueEntry);

    return res.json({
      matched: false,
      message: "Added to queue"
    });
  } catch (error) {
    console.error('Queue join error:', error);
    res.status(500).json({ message: "Server error" });
  }
};

// Leave the matchmaking queue
export const leaveQueue = async (req, res) => {
  try {
    const userId = req.user.id;
    await Queue.findOneAndDelete({ userId });
    res.json({ message: "Removed from queue" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Check queue status
export const checkQueueStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    // If user already in an active chat, return that session
    const activeChat = await ChatSession.findOne({ participants: userId, active: true });
    if (activeChat) {
      return res.json({
        matched: true,
        chatSession: activeChat
      });
    }

    const queueEntry = await Queue.findOne({ userId });

    // If not in queue
    if (!queueEntry) {
      return res.json({ inQueue: false });
    }

    // Try to match
    const match = await findMatch(userId);
    if (match) {
      return res.json({
        matched: true,
        chatSession: match
      });
    }

    // Still waiting
    const waitTime = Date.now() - queueEntry.joinedAt;
    return res.json({
      inQueue: true,
      waitTime,
      matched: false
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Internal function to find a match (random pairing) and enforce single active chat
async function findMatch(userId) {
  // Ensure the requesting user has no active chat
  const userActive = await ChatSession.findOne({ participants: userId, active: true });
  if (userActive) return userActive;

  // Count potential partners
  const candidatesQuery = { userId: { $ne: userId } };
  const count = await Queue.countDocuments(candidatesQuery);
  if (!count) return null;

  // Pick a random candidate
  const randomSkip = Math.floor(Math.random() * count);
  const otherUser = await Queue.findOne(candidatesQuery).skip(randomSkip);
  if (!otherUser) return null;

  // Ensure the other user has no active chat
  const otherActive = await ChatSession.findOne({ participants: otherUser.userId, active: true });
  if (otherActive) {
    // Optionally: remove them from queue if they have an active chat
    await Queue.deleteOne({ userId: otherUser.userId });
    return null;
  }

  // Create a chat session between the two users
  const chatSession = new ChatSession({
    participants: [userId, otherUser.userId]
  });
  await chatSession.save();

  // Remove both users from the queue
  await Queue.deleteMany({
    userId: { $in: [userId, otherUser.userId] }
  });

  console.log("Chat session created:", chatSession);

  return chatSession;
}
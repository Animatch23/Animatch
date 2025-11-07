import mongoose from "mongoose";
import Queue from "../models/Queue.js";
import ChatSession from "../models/ChatSession.js";

const normalizeObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }
  if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
};

// Join the matchmaking queue
export const joinQueue = async (req, res) => {
  try {
    const userIdObj = normalizeObjectId(req.user?.id);
    if (!userIdObj) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await Queue.findOneAndUpdate(
      { userId: userIdObj },
      {
        $set: { status: "waiting", chatId: null },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({ matched: false, message: "Added to queue" });
  } catch (err) {
    console.error("joinQueue error:", err);
    res.status(500).json({ error: "Failed to join queue" });
  }
};

// GET /api/queue/status
export const queueStatus = async (req, res) => {
  try {
    const userIdObj = normalizeObjectId(req.user?.id);
    if (!userIdObj) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const q = await Queue.findOne({ userId: userIdObj }).lean();
    const inQueue = !!q;
    const matched = !!(q && q.status === "matched" && q.chatId);

    return res.status(200).json({ inQueue, matched });
  } catch (err) {
    console.error("queueStatus error:", err);
    res.status(500).json({ error: "Failed to query queue status" });
  }
};

// POST /api/queue/leave
export const leaveQueue = async (req, res) => {
  try {
    const userIdObj = normalizeObjectId(req.user?.id);
    if (!userIdObj) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await Queue.deleteOne({ userId: userIdObj });
    return res.status(200).json({ message: "Removed from queue" });
  } catch (err) {
    console.error("leaveQueue error:", err);
    res.status(500).json({ error: "Failed to leave queue" });
  }
};

// Check queue status
export const checkQueueStatus = async (req, res) => {
  try {
    const userId = normalizeObjectId(req.user?.id);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // If user already in an active chat, return that session
    const activeChat = await ChatSession.findOne({ participants: userId, status: "active" });
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
    const waitTime = queueEntry.createdAt ? Date.now() - queueEntry.createdAt.getTime() : null;
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
  const userActive = await ChatSession.findOne({ participants: userId, status: "active" });
  if (userActive) return userActive;

  // Count potential partners
  const candidatesQuery = { userId: { $ne: userId }, status: "waiting" };
  const count = await Queue.countDocuments(candidatesQuery);
  if (!count) return null;

  // Pick a random candidate
  const randomSkip = Math.floor(Math.random() * count);
  const otherUser = await Queue.findOne(candidatesQuery).skip(randomSkip);
  if (!otherUser) return null;

  // Ensure the other user has no active chat
  const otherActive = await ChatSession.findOne({ participants: otherUser.userId, status: "active" });
  if (otherActive) {
    // Optionally: remove them from queue if they have an active chat
    await Queue.deleteOne({ userId: otherUser.userId });
    return null;
  }

  // Create a chat session between the two users
  const chatSession = new ChatSession({
    participants: [userId, otherUser.userId],
    status: "active",
  });
  await chatSession.save();

  // Remove both users from the queue
  await Queue.deleteMany({
    userId: { $in: [userId, otherUser.userId] }
  });

  console.log("Chat session created:", chatSession);

  return chatSession;
}
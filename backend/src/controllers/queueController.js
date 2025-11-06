import Queue from '../models/Queue.js';
import ChatSession from '../models/ChatSession.js';
import mongoose from "mongoose";

// Join the matchmaking queue
export const joinQueue = async (req, res) => {
  try {
    const userId = req.userId;
    const castId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : undefined;

    // Shortcut: if already in an active chat, return it
    if (castId) {
      const existingChat = await ChatSession.findOne({
        active: true,
        $or: [{ participants: castId }, { users: castId }],
      })
        .select("_id")
        .lean();

      if (existingChat) {
        return res.json({ matched: true, chatId: String(existingChat._id) });
      }
    }

    // Upsert/refresh queue entry as waiting and clear any stale chatId
    await Queue.updateOne(
      { userId },
      {
        $set: { status: "waiting", chatId: null },
        $setOnInsert: { userId, joinedAt: new Date() },
      },
      { upsert: true }
    );

    // Atomically claim an opponent by locking their status to avoid double matches
    const opponent = await Queue.findOneAndUpdate(
      {
        status: "waiting",
        userId: { $ne: userId },
      },
      { $set: { status: "locked" } },
      { sort: { createdAt: 1 }, new: false, lean: true }
    );

    if (!opponent) {
      return res.json({ queued: true, matched: false });
    }

    // Create a chat session between the two users
    const oppId = new mongoose.Types.ObjectId(opponent.userId);
    const chat = await ChatSession.create({
      participants: castId ? [castId, oppId] : [oppId],
      users: castId ? [castId, oppId] : [oppId],
      active: true,
      startedAt: new Date(),
    });

    // Mark both users as matched and attach chatId
    await Queue.updateMany(
      { userId: { $in: [userId, opponent.userId] } },
      { $set: { status: "matched", chatId: chat._id } }
    );

    return res.json({
      matched: true,
      chatId: String(chat._id),
      partnerId: opponent.userId,
    });
  } catch (err) {
    console.error("joinQueue error:", err);
    res.status(500).json({ error: "Failed to join queue" });
  }
};

export const queueStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const castId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : undefined;

    // Check active chat first
    if (castId) {
      const active = await ChatSession.findOne({ participants: castId, active: true })
        .select("_id")
        .lean();
      if (active) {
        return res.json({ matched: true, chatId: String(active._id) });
      }
    }

    const q = await Queue.findOne({ userId }).lean();
    if (!q) return res.json({ queued: false, matched: false });

    if (q.status === "matched" && q.chatId) {
      return res.json({ matched: true, chatId: String(q.chatId) });
    }

    // waiting or locked
    return res.json({ queued: true, matched: false });
  } catch (err) {
    console.error("queueStatus error:", err);
    res.status(500).json({ error: "Failed to query queue status" });
  }
};

export const leaveQueue = async (req, res) => {
  try {
    const userId = req.userId;
    await Queue.deleteOne({ userId, status: { $ne: "matched" } });
    res.json({ left: true });
  } catch (err) {
    console.error("leaveQueue error:", err);
    res.status(500).json({ error: "Failed to leave queue" });
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
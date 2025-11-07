import mongoose from "mongoose";
import Queue from "../models/Queue.js";
import ChatSession from "../models/ChatSession.js";
import Profile from "../models/Profile.js";
import { findBestMatch, calculateSimilarityScore, getMatchingStrategy } from "../utils/matchmakingAlgorithm.js";

// Join the matchmaking queue
export const joinQueue = async (req, res) => {
  try {
    const userIdObj = req.user?.id;
    if (!userIdObj) {
      console.log("[joinQueue] Unauthorized access attempt");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const idStr = userIdObj.toString();
    console.log(`[joinQueue] User ${idStr} attempting to join queue`);

    // Fetch user's profile to get interests
    const profile = await Profile.findOne({ userId: idStr });
    const interests = profile?.interests || { course: null, dorm: null, organizations: [] };
    
    console.log(`[joinQueue] User ${idStr} interests:`, interests);

    await Queue.updateOne(
      { $or: [{ userId: userIdObj }, { userId: idStr }] },
      { 
        $setOnInsert: { userId: userIdObj }, 
        $set: { 
          status: "waiting", 
          chatId: null,
          interests: interests // Store interests in queue for matching
        } 
      },
      { upsert: true }
    );

    console.log(`[joinQueue] User ${idStr} successfully added to queue`);
    return res.status(200).json({ matched: false, message: "Added to queue" });
  } catch (err) {
    console.error("[joinQueue] Error:", err);
    res.status(500).json({ error: "Failed to join queue" });
  }
};

// GET /api/queue/status
export const queueStatus = async (req, res) => {
  try {
    const userIdObj = req.user?.id;
    if (!userIdObj) {
      console.log("[queueStatus] Unauthorized access attempt");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const idStr = userIdObj.toString();

    const q = await Queue.findOne({ $or: [{ userId: userIdObj }, { userId: idStr }] }).lean();
    const inQueue = !!q;
    const matched = !!(q && q.status === "matched" && q.chatId);

    console.log(`[queueStatus] User ${idStr} - inQueue: ${inQueue}, matched: ${matched}`);
    return res.status(200).json({ inQueue, matched });
  } catch (err) {
    console.error("[queueStatus] Error:", err);
    res.status(500).json({ error: "Failed to query queue status" });
  }
};

// POST /api/queue/leave
export const leaveQueue = async (req, res) => {
  try {
    const userIdObj = req.user?.id;
    if (!userIdObj) {
      console.log("[leaveQueue] Unauthorized access attempt");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const idStr = userIdObj.toString();
    console.log(`[leaveQueue] User ${idStr} attempting to leave queue`);

    await Queue.deleteOne({ $or: [{ userId: userIdObj }, { userId: idStr }] });
    
    console.log(`[leaveQueue] User ${idStr} successfully removed from queue`);
    return res.status(200).json({ message: "Removed from queue" });
  } catch (err) {
    console.error("[leaveQueue] Error:", err);
    res.status(500).json({ error: "Failed to leave queue" });
  }
};

// Check queue status
export const checkQueueStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`[checkQueueStatus] Checking status for user ${userId}`);

    // If user already in an active chat, return that session
    const activeChat = await ChatSession.findOne({ participants: userId, active: true });
    if (activeChat) {
      console.log(`[checkQueueStatus] User ${userId} already in active chat:`, activeChat._id);
      return res.json({
        matched: true,
        chatSession: activeChat
      });
    }

    const queueEntry = await Queue.findOne({ userId });

    // If not in queue
    if (!queueEntry) {
      console.log(`[checkQueueStatus] User ${userId} not in queue`);
      return res.json({ inQueue: false });
    }

    // Try to match
    const match = await findMatch(userId);
    if (match) {
      console.log(`[checkQueueStatus] User ${userId} matched successfully`);
      return res.json({
        matched: true,
        chatSession: match
      });
    }

    // Still waiting
    const waitTime = Date.now() - queueEntry.joinedAt;
    console.log(`[checkQueueStatus] User ${userId} still waiting - wait time: ${waitTime}ms`);
    return res.json({
      inQueue: true,
      waitTime,
      matched: false
    });
  } catch (error) {
    console.error("[checkQueueStatus] Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Internal function to find a match using interest-based algorithm
async function findMatch(userId) {
  console.log(`[findMatch] Starting match search for user ${userId}`);
  
  // Ensure the requesting user has no active chat
  const userActive = await ChatSession.findOne({ participants: userId, active: true });
  if (userActive) {
    console.log(`[findMatch] User ${userId} already has active chat:`, userActive._id);
    return userActive;
  }

  // Get current user's queue entry with interests
  const currentUser = await Queue.findOne({ userId });
  if (!currentUser) {
    console.log(`[findMatch] User ${userId} not found in queue`);
    return null;
  }

  const userInterests = currentUser.interests || { course: null, dorm: null, organizations: [] };
  console.log(`[findMatch] User ${userId} interests:`, userInterests);

  // Find all potential candidates (excluding current user)
  const candidates = await Queue.find({ 
    userId: { $ne: userId },
    status: 'waiting'
  }).lean();

  console.log(`[findMatch] Found ${candidates.length} potential candidates`);

  if (candidates.length === 0) {
    console.log(`[findMatch] No candidates available for user ${userId}`);
    return null;
  }

  // Use interest-based matching algorithm
  const bestMatch = findBestMatch(userInterests, candidates);
  
  if (!bestMatch) {
    console.log(`[findMatch] No suitable match found for user ${userId}`);
    return null;
  }

  const matchedUserId = bestMatch.userId;
  const similarityScore = calculateSimilarityScore(userInterests, bestMatch.interests);
  const strategy = getMatchingStrategy(similarityScore);
  
  console.log(`[findMatch] Best match for ${userId} is ${matchedUserId}`);
  console.log(`[findMatch] Similarity score: ${similarityScore}`);
  console.log(`[findMatch] Matching strategy: ${strategy}`);

  // Ensure the other user has no active chat
  const otherActive = await ChatSession.findOne({ participants: matchedUserId, active: true });
  if (otherActive) {
    console.log(`[findMatch] Matched user ${matchedUserId} already has active chat, removing from queue`);
    await Queue.deleteOne({ userId: matchedUserId });
    return null;
  }

  // Create a chat session between the two users
  const chatSession = new ChatSession({
    participants: [userId, matchedUserId],
    metadata: {
      matchingStrategy: strategy,
      similarityScore: similarityScore,
      matchedAt: new Date()
    }
  });
  await chatSession.save();

  // Remove both users from the queue
  await Queue.deleteMany({
    userId: { $in: [userId, matchedUserId] }
  });

  console.log(`[findMatch] Chat session created:`, chatSession._id);
  console.log(`[findMatch] Users ${userId} and ${matchedUserId} removed from queue`);

  return chatSession;
}
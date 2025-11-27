import ChatSession from '../models/ChatSession.js';
import Queue from '../models/Queue.js';
import User from '../models/User.js';

/**
 * Calculate similarity score between two users (0-100)
 * Higher score = more similar
 * 
 * Scoring breakdown:
 * - Course match: 30 points (case-insensitive match)
 * - Housing match: 20 points (case-insensitive match)
 * - Organizations: up to 30 points (5 points per shared org, max 6 orgs, case-insensitive)
 * - Interests: up to 20 points (10 points per shared interest, max 2 interests, case-insensitive)
 * 
 * @param {Object} user1 - First user object with course, housing, organizations, interests
 * @param {Object} user2 - Second user object with course, housing, organizations, interests
 * @returns {number} Similarity score from 0 to 100
 */
const calculateSimilarity = (user1, user2) => {
  let score = 0;

  // Course similarity (30 points for case-insensitive match)
  // Handles "Other" courses and custom entries
  if (user1.course && user2.course && 
      user1.course.toLowerCase().trim() === user2.course.toLowerCase().trim()) {
    score += 30;
  }

  // Housing similarity (20 points for case-insensitive match)
  if (user1.housing && user2.housing && 
      user1.housing.toLowerCase().trim() === user2.housing.toLowerCase().trim()) {
    score += 20;
  }

  // Organizations similarity (up to 30 points, case-insensitive)
  if (user1.organizations && user2.organizations && 
      user1.organizations.length > 0 && user2.organizations.length > 0) {
    // Normalize organizations to lowercase for comparison
    const user1OrgsLower = user1.organizations.map(org => org.toLowerCase().trim());
    const user2OrgsLower = user2.organizations.map(org => org.toLowerCase().trim());
    
    const sharedOrgs = user1OrgsLower.filter(org => user2OrgsLower.includes(org));
    // 5 points per shared org, max 6 orgs = 30 points
    score += Math.min(sharedOrgs.length * 5, 30);
  }

  // Interests similarity (up to 20 points, case-insensitive)
  if (user1.interests && user2.interests && 
      user1.interests.length > 0 && user2.interests.length > 0) {
    // Normalize interests to lowercase for comparison
    const user1InterestsLower = user1.interests.map(interest => interest.toLowerCase().trim());
    const user2InterestsLower = user2.interests.map(interest => interest.toLowerCase().trim());
    
    const sharedInterests = user1InterestsLower.filter(interest => 
      user2InterestsLower.includes(interest)
    );
    // 10 points per shared interest, max 2 interests = 20 points
    score += Math.min(sharedInterests.length * 10, 20);
  }

  return score;
};

/**
 * Join the matchmaking queue
 * Ensures only 1 active chat session per user
 */
export const joinQueue = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log(`[QUEUE JOIN] User: ${user.email} (${user.username})`);

    // ⭐ CRITICAL: Check if user already has an active chat (enforces 1 active session rule)
    const existingChat = await ChatSession.findOne({
      participants: userId,
      active: true,
      expiresAt: { $gt: new Date() }
    });

    if (existingChat) {
      console.log(`[QUEUE JOIN] User ${user.email} already in active chat - cannot join queue`);
      return res.json({
        matched: true,
        chatSessionId: existingChat._id.toString(),
        alreadyInChat: true
      });
    }

    // Check if user is already in queue
    let existingQueueEntry = await Queue.findOne({ userId });
    const now = new Date();
    let timeInQueue = 0;

    if (existingQueueEntry) {
      timeInQueue = (now - existingQueueEntry.createdAt) / 1000; // Time in seconds
      console.log(`[QUEUE JOIN] User ${user.email} already in queue for ${timeInQueue.toFixed(1)}s, attempting to match`);
    } else {
      // Add to queue using upsert to prevent duplicates
      await Queue.updateOne(
        { userId },
        { $set: { userId, status: 'waiting', createdAt: now } },
        { upsert: true }
      );
      console.log(`[QUEUE JOIN] Added ${user.email} to queue`);
      existingQueueEntry = await Queue.findOne({ userId }); // Fetch the created entry
    }

    // Determine if we should use random matching (after 30 seconds)
    const SIMILARITY_TIMEOUT_SECONDS = 30;
    const MINIMUM_SIMILARITY_THRESHOLD = 20; // Don't match below this score unless timeout
    const useRandomMatching = timeInQueue >= SIMILARITY_TIMEOUT_SECONDS;

    if (useRandomMatching) {
      console.log(`[QUEUE JOIN] ⏰ User ${user.email} has been waiting ${timeInQueue.toFixed(1)}s (>= ${SIMILARITY_TIMEOUT_SECONDS}s), switching to random matching`);
    }

    // Try to find a match - look for waiting users and calculate similarity
    const waitingUsers = await Queue.find({
      status: 'waiting',
      userId: { $ne: userId }
    }).sort({ createdAt: 1 }).limit(50); // Get more candidates for better matching

    if (waitingUsers.length === 0) {
      console.log(`[QUEUE JOIN] No match found for ${user.email}, staying in queue`);
      return res.json({ matched: false, queued: true });
    }

    // Calculate similarity scores for all candidates
    const candidatesWithScores = [];
    for (const queueEntry of waitingUsers) {
      const candidateUser = await User.findById(queueEntry.userId);
      
      if (!candidateUser) {
        continue;
      }

      // Check if candidate has active chat
      const candidateActiveChat = await ChatSession.findOne({
        participants: queueEntry.userId,
        active: true,
        expiresAt: { $gt: new Date() }
      });

      if (candidateActiveChat) {
        // Remove from queue if they have active chat
        await Queue.deleteOne({ userId: queueEntry.userId });
        continue;
      }

      // Calculate similarity score
      const similarityScore = calculateSimilarity(user, candidateUser);
      
      candidatesWithScores.push({
        queueEntry,
        user: candidateUser,
        score: similarityScore
      });

      console.log(`[QUEUE JOIN] Candidate ${candidateUser.email}: similarity score = ${similarityScore}`);
    }

    if (candidatesWithScores.length === 0) {
      console.log(`[QUEUE JOIN] No valid candidates for ${user.email}, staying in queue`);
      return res.json({ matched: false, queued: true });
    }

    // Sort candidates based on matching strategy
    if (useRandomMatching) {
      // Random matching: Sort by queue time only (FIFO = random)
      candidatesWithScores.sort((a, b) => {
        return new Date(a.queueEntry.createdAt) - new Date(b.queueEntry.createdAt);
      });
      console.log(`[QUEUE JOIN] 🎲 Random matching active - using FIFO order`);
    } else {
      // Similarity-based matching: Sort by score first, then by queue time
      candidatesWithScores.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score; // Higher score first
        }
        // If scores equal, prioritize who joined queue first
        return new Date(a.queueEntry.createdAt) - new Date(b.queueEntry.createdAt);
      });
      console.log(`[QUEUE JOIN] 🎯 Interest-based matching active - best match: ${candidatesWithScores[0].user.email} (score: ${candidatesWithScores[0].score})`);
    }
    // Try to match with candidates in order of similarity
    for (const candidate of candidatesWithScores) {
      const partnerUser = candidate.user;
      const partner = candidate.queueEntry;

      // Skip low-similarity matches unless we're in random matching mode
      if (!useRandomMatching && candidate.score < MINIMUM_SIMILARITY_THRESHOLD) {
        console.log(`[QUEUE JOIN] Skipping ${partnerUser.email} - similarity ${candidate.score} below threshold ${MINIMUM_SIMILARITY_THRESHOLD}`);
        continue;
      }

      console.log(`[QUEUE JOIN] Attempting to match: ${user.email} <-> ${partnerUser.email} (similarity: ${candidate.score})`);

      // Try to remove both from queue atomically to prevent double-matching
      const deleteResult = await Queue.deleteMany({
        userId: { $in: [userId, partner.userId] }
      });

      if (deleteResult.deletedCount < 2) {
        console.log(`[QUEUE JOIN] Race condition detected, partner already matched with someone else`);
        continue; // Try next candidate
      }

      // ⭐ Create ChatSession (expires in 24 hours unless saved)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const chatSession = await ChatSession.create({
        participants: [userId, partner.userId],
        active: true,
        startedAt: new Date(),
        expiresAt,
        isSaved: false,
        savedByUsers: []
      });

      console.log(`[QUEUE JOIN] ✅ Match created: ${chatSession._id} - ${user.email} <-> ${partnerUser.email} (similarity score: ${candidate.score})`);

      return res.json({
        matched: true,
        chatSessionId: chatSession._id.toString()
      });
    }

    // No successful match found
    console.log(`[QUEUE JOIN] No available partners for ${user.email}, staying in queue`);
    return res.json({ matched: false, queued: true });

  } catch (error) {
    console.error('[QUEUE JOIN] Error:', error);
    res.status(500).json({ message: 'Failed to join queue' });
  }
};

/**
 * Get queue status
 * Attempts to match while checking status
 */
export const getQueueStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);

    // ⭐ Check active chat first (enforces 1 active session rule)
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
      // Calculate time in queue for timeout logic
      const now = new Date();
      const timeInQueue = (now - queueEntry.createdAt) / 1000; // Time in seconds
      const SIMILARITY_TIMEOUT_SECONDS = 30;
      const MINIMUM_SIMILARITY_THRESHOLD = 20; // Don't match below this score unless timeout
      const useRandomMatching = timeInQueue >= SIMILARITY_TIMEOUT_SECONDS;

      if (useRandomMatching) {
        console.log(`[QUEUE STATUS] ⏰ User ${user.email} has been waiting ${timeInQueue.toFixed(1)}s (>= ${SIMILARITY_TIMEOUT_SECONDS}s), switching to random matching`);
      }

      // Try to find a match while checking status
      const waitingUsers = await Queue.find({
        status: 'waiting',
        userId: { $ne: userId }
      }).sort({ createdAt: 1 }).limit(50); // Get more candidates for better matching

      if (waitingUsers.length > 0) {
        console.log(`[QUEUE STATUS] Found potential matches for ${user.email}, calculating similarity scores`);

        // Calculate similarity scores for all candidates
        const candidatesWithScores = [];
        for (const queueEntry of waitingUsers) {
          const candidateUser = await User.findById(queueEntry.userId);
          
          if (!candidateUser) {
            continue;
          }

          // ⭐ Check partner doesn't have active chat
          const candidateActiveChat = await ChatSession.findOne({
            participants: queueEntry.userId,
            active: true,
            expiresAt: { $gt: new Date() }
          });

          if (candidateActiveChat) {
            console.log(`[QUEUE STATUS] Candidate ${candidateUser.email} already in active chat, removing from queue`);
            await Queue.deleteOne({ userId: queueEntry.userId });
            continue;
          }

          // Calculate similarity score
          const similarityScore = calculateSimilarity(user, candidateUser);
          
          candidatesWithScores.push({
            queueEntry,
            user: candidateUser,
            score: similarityScore
          });
        }

        if (candidatesWithScores.length > 0) {
          // Sort candidates based on matching strategy
          if (useRandomMatching) {
            // Random matching: Sort by queue time only (FIFO = random)
            candidatesWithScores.sort((a, b) => {
              return new Date(a.queueEntry.createdAt) - new Date(b.queueEntry.createdAt);
            });
            console.log(`[QUEUE STATUS] 🎲 Random matching active - using FIFO order`);
          } else {
            // Similarity-based matching: Sort by score first
            candidatesWithScores.sort((a, b) => {
              if (b.score !== a.score) {
                return b.score - a.score;
              }
              return new Date(a.queueEntry.createdAt) - new Date(b.queueEntry.createdAt);
            });
            console.log(`[QUEUE STATUS] 🎯 Interest-based matching active - best candidate score: ${candidatesWithScores[0].score}`);
          }

          // Try each candidate until successful
          for (const candidate of candidatesWithScores) {
            const partnerUser = candidate.user;
            const partner = candidate.queueEntry;

            // Skip low-similarity matches unless we're in random matching mode
            if (!useRandomMatching && candidate.score < MINIMUM_SIMILARITY_THRESHOLD) {
              console.log(`[QUEUE STATUS] Skipping ${partnerUser.email} - similarity ${candidate.score} below threshold ${MINIMUM_SIMILARITY_THRESHOLD}`);
              continue;
            }

            // Try to remove both from queue atomically
            const deleteResult = await Queue.deleteMany({
              userId: { $in: [userId, partner.userId] }
            });

            if (deleteResult.deletedCount === 2) {
              // Create ChatSession
              const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
              const chatSession = await ChatSession.create({
                participants: [userId, partner.userId],
                active: true,
                startedAt: new Date(),
                expiresAt,
                isSaved: false,
                savedByUsers: []
              });

              console.log(`[QUEUE STATUS] ✅ Match created: ${chatSession._id} - ${user.email} <-> ${partnerUser.email} (similarity: ${candidate.score})`);

              return res.json({
                queued: false,
                matched: true,
                chatSessionId: chatSession._id.toString()
              });
            } else {
              // Race condition - try next candidate
              console.log(`[QUEUE STATUS] Race condition, trying next candidate`);
              continue;
            }
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
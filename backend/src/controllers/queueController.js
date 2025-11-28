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
 * Get users who have saved chats with the given user
 * @param {string} userId - User ID to check
 * @returns {Promise<string[]>} Array of user IDs who have saved chats with this user
 */
const getSavedChatPartners = async (userId) => {
  // Only exclude partners from ACTIVE saved chats.
  // If a saved chat is inactive (active: false) or unmatched, allow rematching with that partner.
  const savedChats = await ChatSession.find({
    participants: userId,
    isSaved: true,
    active: true, // Only block rematching for ACTIVE saved chats
    unmatchedBy: { $exists: false } // exclude unmatched saved chats so rematching is allowed
  });
  
  // Extract all partner IDs from saved chats
  const partnerIds = savedChats.flatMap(chat => 
    chat.participants
      .filter(p => p.toString() !== userId.toString())
      .map(p => p.toString())
  );
  
  return [...new Set(partnerIds)]; // Remove duplicates
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

    // ⭐ CRITICAL: Check if user has an active UNSAVED chat (only unsaved chats block queue)
    // Saved chats (isSaved=true) don't block - users can have saved chats AND find new matches
    const existingUnsavedChat = await ChatSession.findOne({
      participants: userId,
      active: true,
      isSaved: { $ne: true }, // Only block on UNSAVED active chats
      expiresAt: { $gt: new Date() }
    });

    if (existingUnsavedChat) {
      console.log(`[QUEUE JOIN] User ${user.email} has active UNSAVED chat - cannot join queue`);
      return res.json({
        matched: true,
        chatSessionId: existingUnsavedChat._id.toString(),
        alreadyInChat: true
      });
    }

    // ⭐ Get users with saved chats to exclude from matching
    const savedChatPartnerIds = await getSavedChatPartners(userId);
    if (savedChatPartnerIds.length > 0) {
      console.log(`[QUEUE JOIN] User ${user.email} has ${savedChatPartnerIds.length} saved chat partners - excluding from matching`);
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

    // Get blocked users lists
    const blockedUsers = user.blockedUsers || [];
    const usersWhoBlockedMe = await User.find({ blockedUsers: userId }).distinct('_id');
    const excludedUserIds = [...blockedUsers.map(id => id.toString()), ...usersWhoBlockedMe.map(id => id.toString())];

    // Try to find a match - look for waiting users and calculate similarity
    // ⭐ Exclude users who have saved chats with current user AND blocked users
    const waitingUsers = await Queue.find({
      status: 'waiting',
      userId: { 
        $ne: userId,
        $nin: [...savedChatPartnerIds, ...excludedUserIds] // Exclude saved chat partners AND blocked users
      }
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

      // Check if candidate has active UNSAVED chat (saved chats don't block queue)
      const candidateActiveUnsavedChat = await ChatSession.findOne({
        participants: queueEntry.userId,
        active: true,
        isSaved: { $ne: true }, // Only block on UNSAVED active chats
        expiresAt: { $gt: new Date() }
      });

      if (candidateActiveUnsavedChat) {
        // Remove from queue if they have active unsaved chat
        await Queue.deleteOne({ userId: queueEntry.userId });
        continue;
      }

      // ⭐ Double-check: skip if candidate has saved chat with current user
      const candidateSavedPartners = await getSavedChatPartners(queueEntry.userId.toString());
      if (candidateSavedPartners.includes(userId.toString())) {
        console.log(`[QUEUE JOIN] Skipping ${candidateUser.email} - has saved chat with current user`);
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
      return res.json({ 
        matched: false, 
        queued: true,
        matchingStatus: {
          mode: useRandomMatching ? 'random' : 'similarity',
          timeInQueue: timeInQueue
        }
      });
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
        console.log(`[QUEUE JOIN] Race condition detected (deleted ${deleteResult.deletedCount}), checking if we were matched`);
        
        // Check if WE were matched by someone else
        const weWereMatched = await ChatSession.findOne({
          participants: userId,
          active: true,
          isSaved: { $ne: true },
          expiresAt: { $gt: new Date() }
        });

        if (weWereMatched) {
          console.log(`[QUEUE JOIN] ⭐ We were matched by another user! Returning their chat session.`);
          return res.json({
            matched: true,
            chatSessionId: weWereMatched._id.toString()
          });
        }

        // We weren't matched, partner was taken - try next candidate
        continue;
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

    // No successful match found - but check if someone else matched with us during our attempts
    // This handles the race condition where another user's joinQueue matched with us
    const matchedByOther = await ChatSession.findOne({
      participants: userId,
      active: true,
      isSaved: { $ne: true },
      expiresAt: { $gt: new Date() }
    });

    if (matchedByOther) {
      console.log(`[QUEUE JOIN] ⭐ Race condition resolved: ${user.email} was matched by another user during matching attempts`);
      return res.json({
        matched: true,
        chatSessionId: matchedByOther._id.toString()
      });
    }

    // Check if we're still in the queue (we might have been removed by another match attempt)
    const stillInQueue = await Queue.findOne({ userId });
    if (!stillInQueue) {
      // We were removed from queue but don't have a chat - re-add to queue
      console.log(`[QUEUE JOIN] User ${user.email} was removed from queue without match, re-adding`);
      await Queue.updateOne(
        { userId },
        { $set: { userId, status: 'waiting', createdAt: new Date() } },
        { upsert: true }
      );
    }

    console.log(`[QUEUE JOIN] No available partners for ${user.email}, staying in queue`);
    return res.json({ 
      matched: false, 
      queued: true,
      matchingStatus: {
        mode: useRandomMatching ? 'random' : 'similarity',
        timeInQueue: timeInQueue,
        bestScore: candidatesWithScores.length > 0 ? candidatesWithScores[0].score : 0,
        belowThreshold: !useRandomMatching && candidatesWithScores.length > 0 && candidatesWithScores[0].score < MINIMUM_SIMILARITY_THRESHOLD
      }
    });

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

    // ⭐ Check for active UNSAVED chat first (only unsaved chats block queue)
    // Users with active saved chats CAN still be in queue looking for new matches
    const activeUnsavedChat = await ChatSession.findOne({
      participants: userId,
      active: true,
      isSaved: { $ne: true }, // Only block on UNSAVED active chats
      expiresAt: { $gt: new Date() }
    });

    if (activeUnsavedChat) {
      const partner = await User.findOne({
        _id: { $in: activeUnsavedChat.participants, $ne: userId }
      });

      console.log(`[QUEUE STATUS] User ${user.email} has active UNSAVED chat with ${partner?.username}`);
      return res.json({
        queued: false,
        matched: true,
        chatSessionId: activeUnsavedChat._id.toString()
      });
    }

    // ⭐ Get users with saved chats to exclude from matching
    const savedChatPartnerIds = await getSavedChatPartners(userId);

    // Check queue position
    const queueEntry = await Queue.findOne({ userId });
    if (queueEntry) {
      // Calculate time in queue
      const now = new Date();
      const timeInQueue = (now - queueEntry.createdAt) / 1000; // Time in seconds
      
      // Determine matching strategy
      const SIMILARITY_TIMEOUT_SECONDS = 30;
      const MINIMUM_SIMILARITY_THRESHOLD = 20;
      const useRandomMatching = timeInQueue >= SIMILARITY_TIMEOUT_SECONDS;

      if (useRandomMatching) {
        console.log(`[QUEUE STATUS] ⏰ User ${user.email} has been waiting ${timeInQueue.toFixed(1)}s (>= ${SIMILARITY_TIMEOUT_SECONDS}s), switching to random matching`);
      }

      // Get blocked users lists
      const blockedUsers = user.blockedUsers || [];
      const usersWhoBlockedMe = await User.find({ blockedUsers: userId }).distinct('_id');
      const excludedUserIds = [userId, ...blockedUsers, ...usersWhoBlockedMe];

      // Try to find a match while checking status
      // ⭐ Exclude users who have saved chats with current user AND blocked users
      const waitingUsers = await Queue.find({
        status: 'waiting',
        userId: { 
          $ne: userId,
          $nin: [...savedChatPartnerIds, ...excludedUserIds] // Exclude saved chat partners AND blocked users
        }
      }).sort({ createdAt: 1 }).limit(50); // Get more candidates for better matching

      const candidatesWithScores = [];

      if (waitingUsers.length > 0) {
        console.log(`[QUEUE STATUS] Found potential matches for ${user.email}, calculating similarity scores`);
        for (const queueEntry of waitingUsers) {
          const candidateUser = await User.findById(queueEntry.userId);
          
          if (!candidateUser) {
            continue;
          }

          // ⭐ Check partner doesn't have active UNSAVED chat (saved chats don't block queue)
          const candidateActiveUnsavedChat = await ChatSession.findOne({
            participants: queueEntry.userId,
            active: true,
            isSaved: { $ne: true }, // Only block on UNSAVED active chats
            expiresAt: { $gt: new Date() }
          });

          if (candidateActiveUnsavedChat) {
            console.log(`[QUEUE STATUS] Candidate ${candidateUser.email} has active unsaved chat, removing from queue`);
            await Queue.deleteOne({ userId: queueEntry.userId });
            continue;
          }

          // ⭐ Double-check: skip if candidate has saved chat with current user
          const candidateSavedPartners = await getSavedChatPartners(queueEntry.userId.toString());
          if (candidateSavedPartners.includes(userId.toString())) {
            console.log(`[QUEUE STATUS] Skipping ${candidateUser.email} - has saved chat with current user`);
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
              // Race condition - check if WE were matched by someone else
              console.log(`[QUEUE STATUS] Race condition (deleted ${deleteResult.deletedCount}), checking if we were matched`);
              
              const weWereMatched = await ChatSession.findOne({
                participants: userId,
                active: true,
                isSaved: { $ne: true },
                expiresAt: { $gt: new Date() }
              });

              if (weWereMatched) {
                console.log(`[QUEUE STATUS] ⭐ We were matched by another user!`);
                return res.json({
                  queued: false,
                  matched: true,
                  chatSessionId: weWereMatched._id.toString()
                });
              }
              
              // We weren't matched, partner was taken - try next candidate
              continue;
            }
          }
        }
      }

      // After trying all candidates, check if someone matched with us during the process
      const matchedDuringSearch = await ChatSession.findOne({
        participants: userId,
        active: true,
        isSaved: { $ne: true },
        expiresAt: { $gt: new Date() }
      });

      if (matchedDuringSearch) {
        console.log(`[QUEUE STATUS] ⭐ Race condition resolved: ${user.email} was matched during search`);
        return res.json({
          queued: false,
          matched: true,
          chatSessionId: matchedDuringSearch._id.toString()
        });
      }

      // Also verify we're still in queue (might have been removed by race condition)
      const stillInQueue = await Queue.findOne({ userId });
      if (!stillInQueue) {
        // Re-add to queue since we weren't matched but got removed
        console.log(`[QUEUE STATUS] User ${user.email} was removed from queue without match, re-adding`);
        await Queue.updateOne(
          { userId },
          { $set: { userId, status: 'waiting', createdAt: new Date() } },
          { upsert: true }
        );
      }

      console.log(`[QUEUE STATUS] User ${user.email} in queue`);
      return res.json({ 
        queued: true, 
        matched: false,
        matchingStatus: {
          mode: useRandomMatching ? 'random' : 'similarity',
          timeInQueue: timeInQueue,
          bestScore: candidatesWithScores.length > 0 ? candidatesWithScores[0].score : 0,
          belowThreshold: !useRandomMatching && candidatesWithScores.length > 0 && candidatesWithScores[0].score < MINIMUM_SIMILARITY_THRESHOLD
        }
      });
    }

    // ⭐ RACE CONDITION FIX: User is not in queue - they might have been matched by another user
    // Re-check for active chat one more time in case it was created after the initial check
    const activeUnsavedChatRecheck = await ChatSession.findOne({
      participants: userId,
      active: true,
      isSaved: { $ne: true },
      expiresAt: { $gt: new Date() }
    });

    if (activeUnsavedChatRecheck) {
      const partner = await User.findOne({
        _id: { $in: activeUnsavedChatRecheck.participants, $ne: userId }
      });

      console.log(`[QUEUE STATUS] ⭐ Race condition resolved: User ${user.email} was matched by ${partner?.username} - found on re-check`);
      return res.json({
        queued: false,
        matched: true,
        chatSessionId: activeUnsavedChatRecheck._id.toString()
      });
    }

    // User is truly not in queue and has no active chat
    console.log(`[QUEUE STATUS] User ${user.email} not in queue and no active chat`);
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
/**
 * Content Moderation Service - US-19
 * Handles automatic detection and flagging of offensive content
 */

import FlaggedContent from '../models/FlaggedContent.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

// Offensive content patterns with severity levels
// Severity: 1=low, 2=medium, 3=high
const offensivePatterns = [
  // Low severity - mild language
  { pattern: /\b(damn|darn|hell)\b/i, severity: 1, reason: 'offensive_language' },
  { pattern: /\b(crap|sucks|stupid)\b/i, severity: 1, reason: 'offensive_language' },
  
  // Medium severity - moderate profanity (with character repetition handling)
  { pattern: /\ba+s+s+\b/i, severity: 2, reason: 'offensive_language' },
  { pattern: /\bf+u+c+k+/i, severity: 2, reason: 'offensive_language' },
  { pattern: /\bs+h+i+t+/i, severity: 2, reason: 'offensive_language' },
  { pattern: /\bb+i+t+c+h+/i, severity: 2, reason: 'offensive_language' },
  { pattern: /\bd+i+c+k+\b/i, severity: 2, reason: 'offensive_language' },
  
  // High severity - harassment and threats
  { pattern: /\bkill\s+(you|yourself|urself|him|her|them)\b/i, severity: 3, reason: 'threat' },
  { pattern: /\bdie\s+(you|bitch|idiot|moron)\b/i, severity: 3, reason: 'threat' },
  { pattern: /\bi\s+(will|wanna|want\s+to)\s+hurt\s+you\b/i, severity: 3, reason: 'threat' },
  { pattern: /\bi\s+hate\s+you\b/i, severity: 3, reason: 'harassment' },
  { pattern: /\b(you('re)?\s+)?(ugly|worthless|pathetic|disgusting)\b/i, severity: 3, reason: 'harassment' },
  { pattern: /\bgo\s+(die|away|kill\s+yourself)\b/i, severity: 3, reason: 'threat' },
  
  // Spam indicators
  { pattern: /(.)\1{5,}/i, severity: 1, reason: 'spam' }, // 6+ repeated chars
  { pattern: /(https?:\/\/[^\s]+){3,}/i, severity: 2, reason: 'spam' } // Multiple URLs
];

// Words that should NOT trigger false positives (whitelist context)
const safeContextPatterns = [
  /\bshell\b/i,       // "shell scripting"
  /\bassembly\b/i,    // "assembly language"
  /\bassessment\b/i,  // Contains "ass"
  /\bclass\b/i,       // Contains "ass"
  /\bpassword\b/i,    // Contains "ass"
  /\bhello\b/i,       // Safe word
  /\bhistory\b/i,     // Contains "story" which has "tory"
];

/**
 * Check if content contains offensive material
 * @param {string} content - Message content to check
 * @returns {Object} { flagged, flags[], severity, reason }
 */
export const moderateContent = (content) => {
  if (!content || typeof content !== 'string') {
    return { flagged: false, flags: [], severity: 0, reason: null };
  }

  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) {
    return { flagged: false, flags: [], severity: 0, reason: null };
  }

  const flags = [];
  let maxSeverity = 0;
  let primaryReason = null;

  // Check each pattern
  for (const { pattern, severity, reason } of offensivePatterns) {
    if (pattern.test(trimmedContent)) {
      const match = trimmedContent.match(pattern);
      
      // Check if this match is actually a false positive
      let isFalsePositive = false;
      if (match) {
        for (const safePattern of safeContextPatterns) {
          if (safePattern.test(trimmedContent) && 
              trimmedContent.toLowerCase().includes(match[0].toLowerCase())) {
            // Check if the match is part of a safe word
            const matchedWord = match[0].toLowerCase();
            const safeMatch = trimmedContent.match(safePattern);
            if (safeMatch && safeMatch[0].toLowerCase().includes(matchedWord)) {
              isFalsePositive = true;
              break;
            }
          }
        }
      }

      if (!isFalsePositive) {
        flags.push({
          pattern: pattern.toString(),
          matched: match ? match[0] : null,
          severity,
          reason
        });

        if (severity > maxSeverity) {
          maxSeverity = severity;
          primaryReason = reason;
        }
      }
    }
  }

  return {
    flagged: flags.length > 0,
    flags,
    severity: maxSeverity,
    reason: primaryReason
  };
};

/**
 * Process a message for moderation
 * @param {Object} messageData - { messageId, userId, chatSessionId, content }
 * @returns {Object} { flagged, severity, flagRecord }
 */
export const processMessage = async (messageData) => {
  const { messageId, userId, chatSessionId, content } = messageData;
  
  const result = moderateContent(content);
  
  if (!result.flagged) {
    return { flagged: false, severity: 0, flagRecord: null };
  }

  try {
    // Update message with flagged status
    await Message.findByIdAndUpdate(messageId, {
      isFlagged: true,
      flaggedAt: new Date(),
      flagSeverity: result.severity,
      moderationStatus: 'pending'
    });

    // Get user's current flag count for escalation logic
    const user = await User.findById(userId);
    const userFlagCount = user?.flagCount || 0;

    // Create flagged content record
    const flagRecord = await FlaggedContent.create({
      messageId,
      userId,
      chatSessionId,
      content,
      flagReason: result.reason,
      severity: result.severity,
      matchedPatterns: result.flags.map(f => f.matched).filter(Boolean),
      status: 'pending',
      flaggedAt: new Date()
    });

    // Increment user's flag count
    await User.findByIdAndUpdate(userId, {
      $inc: { flagCount: 1 }
    });

    // Log for admin notification (high severity or repeat offender)
    if (result.severity >= 3 || userFlagCount >= 5) {
      console.log(`[MODERATION] HIGH PRIORITY FLAG - User ${userId}, Severity: ${result.severity}, Total flags: ${userFlagCount + 1}`);
    }

    return {
      flagged: true,
      severity: result.severity,
      flagRecord
    };
  } catch (error) {
    console.error('[MODERATION] Error processing message:', error);
    // Don't block message delivery on moderation errors
    return { flagged: result.flagged, severity: result.severity, flagRecord: null, error };
  }
};

/**
 * Review a flagged content record
 * @param {string} flagId - FlaggedContent document ID
 * @param {Object} reviewData - { status, reviewedBy, reviewNotes, actionTaken }
 */
export const reviewFlaggedContent = async (flagId, reviewData) => {
  const { status, reviewedBy, reviewNotes, actionTaken } = reviewData;

  const flagRecord = await FlaggedContent.findByIdAndUpdate(
    flagId,
    {
      status,
      reviewedBy,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes || '',
      actionTaken: actionTaken || 'none'
    },
    { new: true }
  );

  if (!flagRecord) {
    throw new Error('Flag record not found');
  }

  // If action is taken, update the user accordingly
  if (actionTaken && actionTaken !== 'none') {
    const updateFields = {};

    switch (actionTaken) {
      case 'warning_issued':
        updateFields.$inc = { warningCount: 1 };
        break;
      case 'message_removed':
        await Message.findByIdAndUpdate(flagRecord.messageId, {
          moderationStatus: 'removed'
        });
        break;
      case 'user_suspended':
        updateFields.isSuspended = true;
        updateFields.suspendedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        break;
      case 'user_banned':
        updateFields.isSuspended = true;
        updateFields.suspendedUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
        break;
    }

    if (Object.keys(updateFields).length > 0) {
      await User.findByIdAndUpdate(flagRecord.userId, updateFields);
    }
  }

  return flagRecord;
};

/**
 * Get moderation statistics
 */
export const getModerationStats = async () => {
  return FlaggedContent.getStatistics();
};

export default {
  moderateContent,
  processMessage,
  reviewFlaggedContent,
  getModerationStats
};

/**
 * Gamification Service - US-15
 * Handles streaks, badges, and activity tracking
 */

import User from '../models/User.js';
import Badge, { seedBadges } from '../models/Badge.js';

/**
 * Check if two dates are consecutive days
 * @param {Date} lastActive - Previous activity date
 * @param {Date} currentDate - Current date
 * @returns {boolean}
 */
export const isConsecutiveDay = (lastActive, currentDate) => {
  if (!lastActive) return false;
  
  const last = new Date(lastActive);
  const current = new Date(currentDate);
  
  // Normalize to start of day
  last.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);
  
  const diffTime = current.getTime() - last.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return diffDays === 1;
};

/**
 * Check if two dates are the same day
 * @param {Date} date1 
 * @param {Date} date2 
 * @returns {boolean}
 */
export const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.toDateString() === d2.toDateString();
};

/**
 * Record user activity and update streak
 * @param {string} userId - User ID
 * @param {string} activityType - Type of activity ('message', 'match', 'login')
 * @returns {Object} Updated user stats and any new badges earned
 */
export const recordActivity = async (userId, activityType = 'message') => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();
  const lastActive = user.lastActiveDate;
  
  let newStreak = user.currentStreak || 0;
  let streakUpdated = false;
  
  // Calculate new streak
  if (isConsecutiveDay(lastActive, now)) {
    newStreak += 1;
    streakUpdated = true;
  } else if (!isSameDay(lastActive, now)) {
    // Not same day and not consecutive - reset streak
    if (lastActive && !isConsecutiveDay(lastActive, now)) {
      newStreak = 1; // Start new streak
    } else if (!lastActive) {
      newStreak = 1; // First activity ever
    }
    streakUpdated = true;
  }
  // If same day, keep current streak (don't update)

  const updates = {
    lastActiveDate: now
  };

  if (streakUpdated) {
    updates.currentStreak = newStreak;
    
    // Update max streak if current exceeds it
    if (newStreak > (user.maxStreak || 0)) {
      updates.maxStreak = newStreak;
    }
  }

  // Increment activity-specific counters
  if (activityType === 'message') {
    updates.$inc = { ...updates.$inc, totalMessages: 1 };
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    updates,
    { new: true }
  );

  // Check for new badges
  const newBadges = await checkAndAwardBadges(userId, updatedUser);

  return {
    currentStreak: updatedUser.currentStreak,
    maxStreak: updatedUser.maxStreak,
    totalMessages: updatedUser.totalMessages,
    newBadges
  };
};

/**
 * Record a successful match
 * @param {string} userId - User ID
 * @param {string} partnerId - Partner's user ID (for unique match tracking)
 * @returns {Object} Updated stats
 */
export const recordMatch = async (userId, partnerId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Check if this is a unique match (never matched with this partner before)
  // This would require a separate collection to track, for now we'll increment
  const updates = {
    $inc: { totalMatches: 1, uniqueMatchCount: 1 }
  };

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    updates,
    { new: true }
  );

  // Check for new badges
  const newBadges = await checkAndAwardBadges(userId, updatedUser);

  return {
    totalMatches: updatedUser.totalMatches,
    uniqueMatchCount: updatedUser.uniqueMatchCount,
    newBadges
  };
};

/**
 * Check and award eligible badges
 * @param {string} userId - User ID
 * @param {Object} userStats - Current user statistics
 * @returns {Array} Newly awarded badges
 */
export const checkAndAwardBadges = async (userId, userStats) => {
  // Ensure badges are seeded
  await seedBadges();
  
  const allBadges = await Badge.getActiveBadges();
  const currentBadges = userStats.badges || [];
  const newBadges = [];

  for (const badge of allBadges) {
    // Skip if already has badge
    if (currentBadges.includes(badge.badgeId)) {
      continue;
    }

    // Check eligibility
    const isEligible = Badge.checkEligibility(badge, {
      currentStreak: userStats.currentStreak || 0,
      maxStreak: userStats.maxStreak || 0,
      totalMatches: userStats.totalMatches || 0,
      totalMessages: userStats.totalMessages || 0,
      uniqueMatchCount: userStats.uniqueMatchCount || 0,
      savedChatsCount: userStats.savedChatsCount || 0
    });

    if (isEligible) {
      newBadges.push({
        badgeId: badge.badgeId,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        rarity: badge.rarity
      });
    }
  }

  // Award new badges
  if (newBadges.length > 0) {
    const badgeIds = newBadges.map(b => b.badgeId);
    const earnedDates = {};
    badgeIds.forEach(id => {
      earnedDates[id] = new Date();
    });

    await User.findByIdAndUpdate(userId, {
      $addToSet: { badges: { $each: badgeIds } },
      $set: Object.fromEntries(
        badgeIds.map(id => [`badgeEarnedDates.${id}`, new Date()])
      )
    });
  }

  return newBadges;
};

/**
 * Get user's gamification stats
 * @param {string} userId - User ID
 * @returns {Object} Complete gamification stats
 */
export const getUserStats = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Ensure badges are seeded
  await seedBadges();

  // Get all badges with earned status
  const allBadges = await Badge.getActiveBadges();
  const earnedBadgeIds = user.badges || [];

  const badgesWithStatus = allBadges.map(badge => ({
    badgeId: badge.badgeId,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    category: badge.category,
    rarity: badge.rarity,
    requirement: badge.requirement,
    earned: earnedBadgeIds.includes(badge.badgeId),
    earnedAt: user.badgeEarnedDates?.get(badge.badgeId) || null
  }));

  return {
    currentStreak: user.currentStreak || 0,
    maxStreak: user.maxStreak || 0,
    lastActiveDate: user.lastActiveDate,
    totalMessages: user.totalMessages || 0,
    totalMatches: user.totalMatches || 0,
    uniqueMatchCount: user.uniqueMatchCount || 0,
    badges: badgesWithStatus,
    earnedBadgesCount: earnedBadgeIds.length,
    totalBadgesCount: allBadges.length
  };
};

/**
 * Get leaderboard data
 * @param {string} type - Leaderboard type ('streak', 'messages', 'matches')
 * @param {number} limit - Number of results
 * @returns {Array} Top users
 */
export const getLeaderboard = async (type = 'streak', limit = 10) => {
  let sortField;
  
  switch (type) {
    case 'streak':
      sortField = { maxStreak: -1 };
      break;
    case 'messages':
      sortField = { totalMessages: -1 };
      break;
    case 'matches':
      sortField = { totalMatches: -1 };
      break;
    default:
      sortField = { maxStreak: -1 };
  }

  const users = await User.find({})
    .sort(sortField)
    .limit(limit)
    .select('username currentStreak maxStreak totalMessages totalMatches badges');

  return users.map((user, index) => ({
    rank: index + 1,
    username: user.username,
    currentStreak: user.currentStreak || 0,
    maxStreak: user.maxStreak || 0,
    totalMessages: user.totalMessages || 0,
    totalMatches: user.totalMatches || 0,
    badgesCount: (user.badges || []).length
  }));
};

export default {
  isConsecutiveDay,
  isSameDay,
  recordActivity,
  recordMatch,
  checkAndAwardBadges,
  getUserStats,
  getLeaderboard
};

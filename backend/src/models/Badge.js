/**
 * Badge Model - US-15
 * Defines available badges in the gamification system
 */

import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema({
  badgeId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '🏆' // Default emoji icon
  },
  category: {
    type: String,
    enum: ['streak', 'social', 'activity', 'special'],
    default: 'activity'
  },
  requirement: {
    type: {
      type: String,
      enum: ['streak', 'matches', 'messages', 'unique_matches', 'saved_chats'],
      required: true
    },
    count: {
      type: Number,
      required: true
    }
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Static method to get all active badges
badgeSchema.statics.getActiveBadges = async function() {
  return this.find({ isActive: true }).sort({ 'requirement.count': 1 });
};

// Static method to check badge eligibility
badgeSchema.statics.checkEligibility = function(badge, userStats) {
  const { type, count } = badge.requirement;
  
  switch (type) {
    case 'streak':
      return userStats.currentStreak >= count || userStats.maxStreak >= count;
    case 'matches':
      return userStats.totalMatches >= count;
    case 'messages':
      return userStats.totalMessages >= count;
    case 'unique_matches':
      return userStats.uniqueMatchCount >= count;
    case 'saved_chats':
      return userStats.savedChatsCount >= count;
    default:
      return false;
  }
};

const Badge = mongoose.model('Badge', badgeSchema);

// Seed default badges if collection is empty
export const seedBadges = async () => {
  const count = await Badge.countDocuments();
  if (count === 0) {
    const defaultBadges = [
      // Streak badges
      {
        badgeId: 'streak_3',
        name: '3-Day Streak',
        description: 'Chat for 3 consecutive days',
        icon: '🔥',
        category: 'streak',
        requirement: { type: 'streak', count: 3 },
        rarity: 'common'
      },
      {
        badgeId: 'streak_7',
        name: 'Week Warrior',
        description: 'Maintain a 7-day chat streak',
        icon: '⚡',
        category: 'streak',
        requirement: { type: 'streak', count: 7 },
        rarity: 'uncommon'
      },
      {
        badgeId: 'streak_14',
        name: 'Fortnight Fighter',
        description: 'Maintain a 14-day chat streak',
        icon: '💪',
        category: 'streak',
        requirement: { type: 'streak', count: 14 },
        rarity: 'rare'
      },
      {
        badgeId: 'streak_30',
        name: 'Monthly Master',
        description: 'Maintain a 30-day chat streak',
        icon: '👑',
        category: 'streak',
        requirement: { type: 'streak', count: 30 },
        rarity: 'epic'
      },
      // Social badges
      {
        badgeId: 'first_match',
        name: 'First Match',
        description: 'Complete your first match',
        icon: '🤝',
        category: 'social',
        requirement: { type: 'matches', count: 1 },
        rarity: 'common'
      },
      {
        badgeId: 'social_5',
        name: 'Social Starter',
        description: 'Match with 5 different users',
        icon: '👋',
        category: 'social',
        requirement: { type: 'unique_matches', count: 5 },
        rarity: 'common'
      },
      {
        badgeId: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Match with 25 different users',
        icon: '🦋',
        category: 'social',
        requirement: { type: 'unique_matches', count: 25 },
        rarity: 'rare'
      },
      {
        badgeId: 'match_master',
        name: 'Match Master',
        description: 'Complete 50 total matches',
        icon: '🎯',
        category: 'social',
        requirement: { type: 'matches', count: 50 },
        rarity: 'epic'
      },
      // Activity badges
      {
        badgeId: 'chat_starter',
        name: 'Chat Starter',
        description: 'Send 10 messages',
        icon: '💬',
        category: 'activity',
        requirement: { type: 'messages', count: 10 },
        rarity: 'common'
      },
      {
        badgeId: 'conversationalist',
        name: 'Conversationalist',
        description: 'Send 100 messages',
        icon: '🗣️',
        category: 'activity',
        requirement: { type: 'messages', count: 100 },
        rarity: 'uncommon'
      },
      {
        badgeId: 'chat_champion',
        name: 'Chat Champion',
        description: 'Send 500 messages',
        icon: '🏆',
        category: 'activity',
        requirement: { type: 'messages', count: 500 },
        rarity: 'rare'
      },
      {
        badgeId: 'super_saver',
        name: 'Super Saver',
        description: 'Save 5 chat sessions',
        icon: '💾',
        category: 'activity',
        requirement: { type: 'saved_chats', count: 5 },
        rarity: 'uncommon'
      }
    ];

    await Badge.insertMany(defaultBadges);
    console.log('[BADGE] Seeded default badges');
  }
};

export default Badge;

/**
 * US-15: Streaks and Badges Tests
 * Tests for daily activity tracking, streak calculation, and badge unlocking
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import Badge from '../models/Badge.js';
import { connectTestDB, disconnectTestDB } from '../utils/testDb.js';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Streaks and Badges - US-15', () => {
  
  afterEach(async () => {
    await User.deleteMany({});
    await Badge.deleteMany({});
  });

  describe('Streak Calculation', () => {
    
    it('should increment streak when user is active on consecutive days', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(12, 0, 0, 0);

      const today = new Date();
      today.setHours(14, 0, 0, 0);

      const isConsecutiveDay = (lastActive, currentDate) => {
        const lastDate = new Date(lastActive);
        const current = new Date(currentDate);
        
        // Normalize to start of day
        lastDate.setHours(0, 0, 0, 0);
        current.setHours(0, 0, 0, 0);
        
        const diffTime = current.getTime() - lastDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        return diffDays === 1;
      };

      expect(isConsecutiveDay(yesterday, today)).toBe(true);
    });

    it('should reset streak when user misses a day', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(12, 0, 0, 0);

      const today = new Date();
      today.setHours(14, 0, 0, 0);

      const isConsecutiveDay = (lastActive, currentDate) => {
        const lastDate = new Date(lastActive);
        const current = new Date(currentDate);
        
        lastDate.setHours(0, 0, 0, 0);
        current.setHours(0, 0, 0, 0);
        
        const diffTime = current.getTime() - lastDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        return diffDays === 1;
      };

      expect(isConsecutiveDay(twoDaysAgo, today)).toBe(false);
    });

    it('should not increment streak for multiple activities on same day', () => {
      const morningToday = new Date();
      morningToday.setHours(9, 0, 0, 0);

      const eveningToday = new Date();
      eveningToday.setHours(21, 0, 0, 0);

      const isSameDay = (date1, date2) => {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return d1.toDateString() === d2.toDateString();
      };

      expect(isSameDay(morningToday, eveningToday)).toBe(true);
    });

    it('should track maximum streak achieved', async () => {
      const user = await User.create({
        username: 'streakuser',
        email: 'streak@test.com',
        currentStreak: 5,
        maxStreak: 10,
        lastActiveDate: new Date()
      });

      // When current streak beats max, update max
      const updateStreak = async (userId, newStreak, currentMax) => {
        const updates = {
          currentStreak: newStreak,
          lastActiveDate: new Date()
        };
        
        if (newStreak > currentMax) {
          updates.maxStreak = newStreak;
        }
        
        return User.findByIdAndUpdate(userId, updates, { new: true });
      };

      const result = await updateStreak(user._id, 12, 10);
      
      expect(result.currentStreak).toBe(12);
      expect(result.maxStreak).toBe(12); // Updated because 12 > 10
    });
  });

  describe('Badge System', () => {
    const badgeDefinitions = [
      { badgeId: 'first_match', name: 'First Match', description: 'Complete your first match', requirement: { type: 'matches', count: 1 } },
      { badgeId: 'chat_starter', name: 'Chat Starter', description: 'Send 10 messages', requirement: { type: 'messages', count: 10 } },
      { badgeId: 'streak_3', name: '3-Day Streak', description: 'Maintain a 3-day streak', requirement: { type: 'streak', count: 3 } },
      { badgeId: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', requirement: { type: 'streak', count: 7 } },
      { badgeId: 'streak_30', name: 'Monthly Master', description: 'Maintain a 30-day streak', requirement: { type: 'streak', count: 30 } },
      { badgeId: 'social_butterfly', name: 'Social Butterfly', description: 'Match with 5 different users', requirement: { type: 'unique_matches', count: 5 } }
    ];

    it('should check if user qualifies for badge', () => {
      const checkBadgeEligibility = (badge, userStats) => {
        const { type, count } = badge.requirement;
        
        switch (type) {
          case 'matches':
            return userStats.totalMatches >= count;
          case 'messages':
            return userStats.totalMessages >= count;
          case 'streak':
            return userStats.currentStreak >= count || userStats.maxStreak >= count;
          case 'unique_matches':
            return userStats.uniqueMatchCount >= count;
          default:
            return false;
        }
      };

      const userStats = {
        totalMatches: 5,
        totalMessages: 15,
        currentStreak: 4,
        maxStreak: 7,
        uniqueMatchCount: 3
      };

      expect(checkBadgeEligibility(badgeDefinitions[0], userStats)).toBe(true);  // first_match
      expect(checkBadgeEligibility(badgeDefinitions[1], userStats)).toBe(true);  // chat_starter
      expect(checkBadgeEligibility(badgeDefinitions[2], userStats)).toBe(true);  // streak_3
      expect(checkBadgeEligibility(badgeDefinitions[3], userStats)).toBe(true);  // streak_7 (max)
      expect(checkBadgeEligibility(badgeDefinitions[4], userStats)).toBe(false); // streak_30
      expect(checkBadgeEligibility(badgeDefinitions[5], userStats)).toBe(false); // social_butterfly
    });

    it('should award badge only once', async () => {
      const user = await User.create({
        username: 'badgeuser',
        email: 'badge@test.com',
        badges: ['first_match', 'chat_starter']
      });
      
      const awardBadge = async (userId, badgeId, currentBadges) => {
        if (currentBadges.includes(badgeId)) {
          return { awarded: false, reason: 'Already has badge' };
        }
        
        await User.findByIdAndUpdate(userId, {
          $addToSet: { badges: badgeId }
        });
        
        return { awarded: true, badgeId };
      };

      // Try to award existing badge
      const result1 = await awardBadge(user._id, 'first_match', user.badges);
      expect(result1.awarded).toBe(false);

      // Award new badge
      const result2 = await awardBadge(user._id, 'streak_3', user.badges);
      expect(result2.awarded).toBe(true);
    });

    it('should return list of earned badges for user', async () => {
      const user = await User.create({
        username: 'earneduser',
        email: 'earned@test.com',
        badges: ['first_match', 'chat_starter', 'streak_3']
      });

      const retrieved = await User.findById(user._id);
      
      expect(retrieved.badges.length).toBe(3);
      expect(retrieved.badges).toEqual(
        expect.arrayContaining(['first_match', 'chat_starter', 'streak_3'])
      );
    });

    it('should get all available badges with earned status', () => {
      const earnedBadgeIds = ['first_match', 'streak_3'];
      
      const getBadgesWithStatus = (allBadges, earnedIds) => {
        return allBadges.map(badge => ({
          ...badge,
          earned: earnedIds.includes(badge.badgeId),
          earnedAt: earnedIds.includes(badge.badgeId) ? new Date() : null
        }));
      };

      const result = getBadgesWithStatus(badgeDefinitions, earnedBadgeIds);
      
      expect(result.find(b => b.badgeId === 'first_match').earned).toBe(true);
      expect(result.find(b => b.badgeId === 'streak_7').earned).toBe(false);
    });
  });

  describe('Activity Tracking', () => {
    
    it('should record activity and update streak on message send', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const user = await User.create({
        username: 'activityuser',
        email: 'activity@test.com',
        currentStreak: 2,
        maxStreak: 5,
        lastActiveDate: yesterday,
        totalMessages: 10
      });

      const recordActivity = async (userId, activityType) => {
        const userDoc = await User.findById(userId);
        if (!userDoc) throw new Error('User not found');

        const now = new Date();
        const lastActive = new Date(userDoc.lastActiveDate);
        
        // Check if consecutive day
        lastActive.setHours(0, 0, 0, 0);
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        
        const diffDays = (today - lastActive) / (1000 * 60 * 60 * 24);
        
        let newStreak = userDoc.currentStreak;
        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1; // Reset
        }
        // If same day (diffDays === 0), keep current streak

        const updates = {
          lastActiveDate: now,
          currentStreak: newStreak
        };

        if (newStreak > userDoc.maxStreak) {
          updates.maxStreak = newStreak;
        }

        if (activityType === 'message') {
          updates.$inc = { totalMessages: 1 };
        }

        return User.findByIdAndUpdate(userId, updates, { new: true });
      };

      const result = await recordActivity(user._id, 'message');
      
      expect(result.currentStreak).toBe(3); // Incremented from 2
    });

    it('should record activity on successful match', async () => {
      const user = await User.create({
        username: 'matchuser',
        email: 'match@test.com',
        totalMatches: 5
      });

      const incrementMatches = async (userId) => {
        return User.findByIdAndUpdate(
          userId,
          { $inc: { totalMatches: 1 } },
          { new: true }
        );
      };

      const result = await incrementMatches(user._id);
      
      expect(result.totalMatches).toBe(6);
    });
  });

  describe('Gamification Stats', () => {
    
    it('should return user gamification stats', async () => {
      const user = await User.create({
        username: 'statsuser',
        email: 'stats@test.com',
        currentStreak: 5,
        maxStreak: 12,
        lastActiveDate: new Date(),
        totalMessages: 150,
        totalMatches: 20,
        badges: ['first_match', 'chat_starter', 'streak_3', 'streak_7']
      });

      const retrieved = await User.findById(user._id);
      
      const stats = {
        currentStreak: retrieved.currentStreak,
        maxStreak: retrieved.maxStreak,
        totalMessages: retrieved.totalMessages,
        totalMatches: retrieved.totalMatches,
        badgesEarned: retrieved.badges.length,
        badges: retrieved.badges
      };

      expect(stats.currentStreak).toBe(5);
      expect(stats.maxStreak).toBe(12);
      expect(stats.badgesEarned).toBe(4);
    });

    it('should initialize gamification fields for new user', async () => {
      const user = await User.create({
        username: 'newuser',
        email: 'new@test.com'
      });

      const retrieved = await User.findById(user._id);

      expect(retrieved.currentStreak).toBe(0);
      expect(retrieved.maxStreak).toBe(0);
      expect(retrieved.badges).toEqual([]);
      expect(retrieved.totalMessages).toBe(0);
      expect(retrieved.totalMatches).toBe(0);
    });
  });
});

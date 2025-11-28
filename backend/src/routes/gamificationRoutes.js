/**
 * Gamification Routes - US-15
 * Endpoints for streaks, badges, and leaderboards
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import gamificationService from '../services/gamificationService.js';

const router = express.Router();

/**
 * GET /api/gamification/stats
 * Get current user's gamification statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const stats = await gamificationService.getUserStats(userId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[GAMIFICATION] Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get gamification stats'
    });
  }
});

/**
 * GET /api/gamification/badges
 * Get all badges with user's earned status
 */
router.get('/badges', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const stats = await gamificationService.getUserStats(userId);
    
    res.json({
      success: true,
      badges: stats.badges,
      earnedCount: stats.earnedBadgesCount,
      totalCount: stats.totalBadgesCount
    });
  } catch (error) {
    console.error('[GAMIFICATION] Error getting badges:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get badges'
    });
  }
});

/**
 * GET /api/gamification/streak
 * Get current user's streak information
 */
router.get('/streak', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const stats = await gamificationService.getUserStats(userId);
    
    res.json({
      success: true,
      streak: {
        current: stats.currentStreak,
        max: stats.maxStreak,
        lastActive: stats.lastActiveDate
      }
    });
  } catch (error) {
    console.error('[GAMIFICATION] Error getting streak:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get streak info'
    });
  }
});

/**
 * GET /api/gamification/leaderboard/:type
 * Get leaderboard data
 * Types: streak, messages, matches
 */
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const type = req.query.type || 'streak';
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    
    const leaderboard = await gamificationService.getLeaderboard(type, limit);
    
    res.json({
      success: true,
      type,
      leaderboard
    });
  } catch (error) {
    console.error('[GAMIFICATION] Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get leaderboard'
    });
  }
});

/**
 * GET /api/gamification/leaderboard/:type
 * Get leaderboard data with type in URL
 * Types: streak, messages, matches
 */
router.get('/leaderboard/:type', authenticateToken, async (req, res) => {
  try {
    const type = req.params.type || 'streak';
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    
    const leaderboard = await gamificationService.getLeaderboard(type, limit);
    
    res.json({
      success: true,
      type,
      leaderboard
    });
  } catch (error) {
    console.error('[GAMIFICATION] Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get leaderboard'
    });
  }
});

/**
 * POST /api/gamification/activity
 * Manually record an activity (for testing/admin)
 */
router.post('/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { activityType } = req.body;
    
    const result = await gamificationService.recordActivity(userId, activityType || 'login');
    
    res.json({
      success: true,
      ...result,
      message: result.newBadges.length > 0 
        ? `Activity recorded! You earned ${result.newBadges.length} new badge(s)!`
        : 'Activity recorded!'
    });
  } catch (error) {
    console.error('[GAMIFICATION] Error recording activity:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to record activity'
    });
  }
});

export default router;

/**
 * Moderation Routes - US-19
 * Admin endpoints for reviewing flagged content
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import moderationService from '../services/moderationService.js';
import FlaggedContent from '../models/FlaggedContent.js';

const router = express.Router();

// Note: In production, add admin role check middleware

/**
 * GET /api/moderation/flags
 * Get pending flagged content for review
 */
router.get('/flags', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const status = req.query.status || 'pending';
    
    let query = {};
    if (status !== 'all') {
      query.status = status;
    }

    const flags = await FlaggedContent.find(query)
      .sort({ severity: -1, flaggedAt: -1 })
      .limit(limit)
      .populate('userId', 'username email flagCount warningCount')
      .populate('chatSessionId', 'participants startedAt');

    res.json({
      success: true,
      flags,
      count: flags.length
    });
  } catch (error) {
    console.error('[MODERATION] Error getting flags:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get flagged content'
    });
  }
});

/**
 * GET /api/moderation/flags/:flagId
 * Get a specific flagged content record
 */
router.get('/flags/:flagId', authenticateToken, async (req, res) => {
  try {
    const { flagId } = req.params;
    
    const flag = await FlaggedContent.findById(flagId)
      .populate('userId', 'username email flagCount warningCount')
      .populate('chatSessionId', 'participants startedAt')
      .populate('reviewedBy', 'username');

    if (!flag) {
      return res.status(404).json({
        success: false,
        message: 'Flagged content not found'
      });
    }

    res.json({
      success: true,
      flag
    });
  } catch (error) {
    console.error('[MODERATION] Error getting flag:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get flagged content'
    });
  }
});

/**
 * POST /api/moderation/flags/:flagId/review
 * Review and take action on flagged content
 */
router.post('/flags/:flagId/review', authenticateToken, async (req, res) => {
  try {
    const { flagId } = req.params;
    const { status, reviewNotes, actionTaken } = req.body;
    
    if (!status || !['confirmed', 'dismissed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "confirmed" or "dismissed"'
      });
    }

    const result = await moderationService.reviewFlaggedContent(flagId, {
      status,
      reviewedBy: req.user.userId,
      reviewNotes,
      actionTaken
    });

    res.json({
      success: true,
      flag: result,
      message: `Flag ${status} successfully`
    });
  } catch (error) {
    console.error('[MODERATION] Error reviewing flag:', error);
    res.status(error.message === 'Flag record not found' ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to review flagged content'
    });
  }
});

/**
 * GET /api/moderation/stats
 * Get moderation statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await moderationService.getModerationStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[MODERATION] Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get moderation stats'
    });
  }
});

/**
 * GET /api/moderation/user/:userId/history
 * Get flagging history for a specific user
 */
router.get('/user/:userId/history', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    
    const flags = await FlaggedContent.getUserFlags(userId, limit);
    
    res.json({
      success: true,
      flags,
      count: flags.length
    });
  } catch (error) {
    console.error('[MODERATION] Error getting user history:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user flag history'
    });
  }
});

/**
 * POST /api/moderation/test
 * Test content moderation (for development)
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }

    const result = moderationService.moderateContent(content);
    
    res.json({
      success: true,
      content,
      result
    });
  } catch (error) {
    console.error('[MODERATION] Error testing content:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to test content'
    });
  }
});

export default router;

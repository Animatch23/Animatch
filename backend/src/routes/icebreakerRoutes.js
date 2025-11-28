import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import ChatSession from '../models/ChatSession.js';
import { 
  getIcebreaker, 
  refreshIcebreaker, 
  dismissIcebreaker 
} from '../services/icebreakerService.js';

const router = express.Router();

/**
 * GET /api/icebreaker/:chatSessionId
 * Get the current icebreaker prompt for a chat session
 */
router.get('/:chatSessionId', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { chatSessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Verify user is participant in this chat
    const chatSession = await ChatSession.findOne({
      _id: chatSessionId,
      participants: userId
    });

    if (!chatSession) {
      return res.status(403).json({ message: 'Access denied to this chat session' });
    }

    const result = await getIcebreaker(chatSessionId);
    res.json(result);
  } catch (error) {
    console.error('[ICEBREAKER ROUTE] Error getting icebreaker:', error);
    res.status(500).json({ message: 'Failed to get icebreaker' });
  }
});

/**
 * POST /api/icebreaker/:chatSessionId/refresh
 * Get a new icebreaker prompt (both users will see the same new prompt)
 */
router.post('/:chatSessionId/refresh', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { chatSessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Verify user is participant in this chat
    const chatSession = await ChatSession.findOne({
      _id: chatSessionId,
      participants: userId,
      active: true
    });

    if (!chatSession) {
      return res.status(403).json({ message: 'Access denied or chat is inactive' });
    }

    const result = await refreshIcebreaker(chatSessionId);
    
    // Emit socket event so both users see the new prompt
    const io = req.app.get('io');
    if (io) {
      io.to(chatSessionId.toString()).emit('icebreaker:updated', {
        prompt: result.prompt,
        dismissed: result.dismissed
      });
    }

    res.json(result);
  } catch (error) {
    console.error('[ICEBREAKER ROUTE] Error refreshing icebreaker:', error);
    res.status(500).json({ message: 'Failed to refresh icebreaker' });
  }
});

/**
 * POST /api/icebreaker/:chatSessionId/dismiss
 * Dismiss the icebreaker prompt for this session
 */
router.post('/:chatSessionId/dismiss', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { chatSessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Verify user is participant in this chat
    const chatSession = await ChatSession.findOne({
      _id: chatSessionId,
      participants: userId,
      active: true
    });

    if (!chatSession) {
      return res.status(403).json({ message: 'Access denied or chat is inactive' });
    }

    const success = await dismissIcebreaker(chatSessionId);
    
    if (success) {
      // Emit socket event so both users see the dismissal
      const io = req.app.get('io');
      if (io) {
        io.to(chatSessionId.toString()).emit('icebreaker:updated', {
          prompt: null,
          dismissed: true
        });
      }
    }

    res.json({ success, dismissed: success });
  } catch (error) {
    console.error('[ICEBREAKER ROUTE] Error dismissing icebreaker:', error);
    res.status(500).json({ message: 'Failed to dismiss icebreaker' });
  }
});

export default router;

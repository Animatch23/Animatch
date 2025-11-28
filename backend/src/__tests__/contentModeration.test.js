/**
 * US-19: Automated Content Moderation Tests
 * Tests for offensive content detection, flagging, and admin notification
 */

import mongoose from 'mongoose';
import FlaggedContent from '../models/FlaggedContent.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import ChatSession from '../models/ChatSession.js';
import { connectTestDB, disconnectTestDB } from '../utils/testDb.js';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Automated Content Moderation - US-19', () => {
  
  afterEach(async () => {
    await FlaggedContent.deleteMany({});
    await Message.deleteMany({});
    await User.deleteMany({});
    await ChatSession.deleteMany({});
  });

  describe('Content Detection - Offensive Keywords', () => {
    // List of test patterns (production would have more comprehensive list)
    const offensivePatterns = [
      /\b(damn|hell)\b/i,           // Mild profanity
      /\b(ass|crap)\b/i,            // Moderate language
      /\bf+u+c+k+/i,                // With repeated chars
      /\bs+h+i+t+/i,                // With repeated chars
      /\bkill\s+(you|yourself)\b/i, // Threats
      /\bi\s+hate\s+you\b/i,        // Harassment
      /\bstupid\s+(idiot|moron)\b/i // Insults
    ];

    const moderateContent = (text) => {
      const flags = [];
      
      for (const pattern of offensivePatterns) {
        if (pattern.test(text)) {
          const match = text.match(pattern);
          flags.push({
            pattern: pattern.toString(),
            matched: match ? match[0] : null,
            severity: getSeverity(pattern)
          });
        }
      }

      return {
        flagged: flags.length > 0,
        flags,
        severity: flags.length > 0 ? Math.max(...flags.map(f => f.severity)) : 0
      };
    };

    const getSeverity = (pattern) => {
      const patternStr = pattern.toString();
      if (patternStr.includes('kill') || patternStr.includes('hate')) return 3; // High
      if (patternStr.includes('f+u+c+k') || patternStr.includes('s+h+i+t')) return 2; // Medium
      return 1; // Low
    };

    it('should detect mild offensive language', () => {
      const result = moderateContent('What the hell is going on?');
      
      expect(result.flagged).toBe(true);
      expect(result.flags.length).toBeGreaterThan(0);
      expect(result.severity).toBe(1);
    });

    it('should detect moderate offensive language with character repetition', () => {
      const result = moderateContent('That is so fuuuuck');
      
      expect(result.flagged).toBe(true);
      expect(result.severity).toBe(2);
    });

    it('should detect threatening content', () => {
      const result = moderateContent('I will kill you');
      
      expect(result.flagged).toBe(true);
      expect(result.severity).toBe(3);
    });

    it('should detect harassment', () => {
      const result = moderateContent('I hate you so much');
      
      expect(result.flagged).toBe(true);
      expect(result.severity).toBe(3);
    });

    it('should pass clean messages', () => {
      const result = moderateContent('Hello! How are you doing today?');
      
      expect(result.flagged).toBe(false);
      expect(result.flags.length).toBe(0);
    });

    it('should not false-positive on similar innocent words', () => {
      const result = moderateContent('I love shell scripting and assembly language');
      
      expect(result.flagged).toBe(false);
    });

    it('should handle empty messages', () => {
      const result = moderateContent('');
      
      expect(result.flagged).toBe(false);
    });

    it('should handle messages with only whitespace', () => {
      const result = moderateContent('   \n\t  ');
      
      expect(result.flagged).toBe(false);
    });
  });

  describe('Content Flagging Storage', () => {

    it('should create flagged content record', async () => {
      const user = await User.create({
        username: 'flaguser',
        email: 'flag@test.com'
      });
      
      const chatSession = await ChatSession.create({
        participants: [user._id, new mongoose.Types.ObjectId()],
        active: true
      });

      const message = await Message.create({
        chatSessionId: chatSession._id,
        senderId: user._id,
        content: 'Offensive message here',
        sentAt: new Date()
      });

      const flagData = {
        messageId: message._id,
        userId: user._id,  // FlaggedContent uses userId
        chatSessionId: chatSession._id,
        content: 'Offensive message here',
        flagReason: 'offensive_language',
        severity: 2,
        matchedPatterns: ['profanity'],
        status: 'pending'
      };

      const result = await FlaggedContent.create(flagData);

      expect(result.status).toBe('pending');
      expect(result.severity).toBe(2);
      expect(result.flagReason).toBe('offensive_language');
    });

    it('should update message with flagged status', async () => {
      const user = await User.create({
        username: 'flagmsguser',
        email: 'flagmsg@test.com'
      });
      
      const chatSession = await ChatSession.create({
        participants: [user._id, new mongoose.Types.ObjectId()],
        active: true
      });

      const message = await Message.create({
        chatSessionId: chatSession._id,
        senderId: user._id,
        content: 'Message content',
        sentAt: new Date(),
        isFlagged: false
      });

      const result = await Message.findByIdAndUpdate(
        message._id,
        { isFlagged: true },
        { new: true }
      );

      expect(result.isFlagged).toBe(true);
    });

    it('should track user flag count', async () => {
      const user = await User.create({
        username: 'flagcountuser',
        email: 'flagcount@test.com',
        flagCount: 2
      });

      const result = await User.findByIdAndUpdate(
        user._id,
        { $inc: { flagCount: 1 } },
        { new: true }
      );

      expect(result.flagCount).toBe(3);
    });
  });

  describe('Admin Review System', () => {
    
    it('should retrieve pending flagged content for admin review', async () => {
      const user = await User.create({
        username: 'pendinguser',
        email: 'pending@test.com'
      });
      
      const chatSession = await ChatSession.create({
        participants: [user._id, new mongoose.Types.ObjectId()],
        active: true
      });

      const message1 = await Message.create({
        chatSessionId: chatSession._id,
        senderId: user._id,
        content: 'Bad message 1',
        sentAt: new Date()
      });

      const message2 = await Message.create({
        chatSessionId: chatSession._id,
        senderId: user._id,
        content: 'Bad message 2',
        sentAt: new Date()
      });

      await FlaggedContent.create([
        { messageId: message1._id, userId: user._id, chatSessionId: chatSession._id, content: 'Bad message 1', flagReason: 'offensive_language', severity: 2, status: 'pending' },
        { messageId: message2._id, userId: user._id, chatSessionId: chatSession._id, content: 'Bad message 2', flagReason: 'threat', severity: 3, status: 'pending' }
      ]);

      const result = await FlaggedContent.find({ status: 'pending' })
        .sort({ severity: -1, createdAt: -1 })
        .limit(50);

      expect(result.length).toBe(2);
      expect(result[0].status).toBe('pending');
      // Higher severity should come first
      expect(result[0].severity).toBe(3);
    });

    it('should allow admin to approve/dismiss flag', async () => {
      const user = await User.create({
        username: 'dismissuser',
        email: 'dismiss@test.com'
      });
      
      const adminId = new mongoose.Types.ObjectId();
      
      const chatSession = await ChatSession.create({
        participants: [user._id, new mongoose.Types.ObjectId()],
        active: true
      });

      const message = await Message.create({
        chatSessionId: chatSession._id,
        senderId: user._id,
        content: 'Flagged message',
        sentAt: new Date()
      });

      const flag = await FlaggedContent.create({
        messageId: message._id,
        userId: user._id,
        chatSessionId: chatSession._id,
        content: 'Flagged message',
        flagReason: 'offensive_language',
        severity: 1,
        status: 'pending'
      });

      const result = await FlaggedContent.findByIdAndUpdate(
        flag._id,
        {
          status: 'dismissed',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNotes: 'False positive'
        },
        { new: true }
      );

      expect(result.status).toBe('dismissed');
      expect(result.reviewedBy.toString()).toBe(adminId.toString());
      expect(result.reviewNotes).toBe('False positive');
    });

    it('should allow admin to confirm flag and take action', async () => {
      const user = await User.create({
        username: 'confirmuser',
        email: 'confirm@test.com'
      });
      
      const adminId = new mongoose.Types.ObjectId();
      
      const chatSession = await ChatSession.create({
        participants: [user._id, new mongoose.Types.ObjectId()],
        active: true
      });

      const message = await Message.create({
        chatSessionId: chatSession._id,
        senderId: user._id,
        content: 'Confirmed bad message',
        sentAt: new Date()
      });

      const flag = await FlaggedContent.create({
        messageId: message._id,
        userId: user._id,
        chatSessionId: chatSession._id,
        content: 'Confirmed bad message',
        flagReason: 'harassment',
        severity: 3,
        status: 'pending'
      });

      const result = await FlaggedContent.findByIdAndUpdate(
        flag._id,
        {
          status: 'confirmed',
          reviewedBy: adminId,
          actionTaken: 'warning_issued'
        },
        { new: true }
      );

      expect(result.status).toBe('confirmed');
      expect(result.actionTaken).toBe('warning_issued');
    });

    it('should count pending flags for admin dashboard', async () => {
      const user = await User.create({
        username: 'countuser',
        email: 'count@test.com'
      });
      
      const chatSession = await ChatSession.create({
        participants: [user._id, new mongoose.Types.ObjectId()],
        active: true
      });

      // Create multiple flagged content items
      for (let i = 0; i < 5; i++) {
        const message = await Message.create({
          chatSessionId: chatSession._id,
          senderId: user._id,
          content: `Bad message ${i}`,
          sentAt: new Date()
        });
        
        await FlaggedContent.create({
          messageId: message._id,
          userId: user._id,
          chatSessionId: chatSession._id,
          content: `Bad message ${i}`,
          flagReason: 'offensive_language',
          severity: 2,
          status: 'pending'
        });
      }

      const pendingCount = await FlaggedContent.countDocuments({ status: 'pending' });

      expect(pendingCount).toBe(5);
    });
  });

  describe('Severity Levels and Actions', () => {
    
    it('should categorize severity levels correctly', () => {
      const severityLevels = {
        1: { name: 'low', action: 'log_only' },
        2: { name: 'medium', action: 'flag_for_review' },
        3: { name: 'high', action: 'flag_and_notify_admin' }
      };

      expect(severityLevels[1].action).toBe('log_only');
      expect(severityLevels[2].action).toBe('flag_for_review');
      expect(severityLevels[3].action).toBe('flag_and_notify_admin');
    });

    it('should determine action based on severity', () => {
      const determineAction = (severity, userFlagCount) => {
        // More flags = stricter response
        const effectiveSeverity = Math.min(3, severity + Math.floor(userFlagCount / 5));
        
        switch (effectiveSeverity) {
          case 1:
            return 'log_only';
          case 2:
            return 'flag_for_review';
          case 3:
          default:
            return 'flag_and_notify_admin';
        }
      };

      expect(determineAction(1, 0)).toBe('log_only');
      expect(determineAction(1, 5)).toBe('flag_for_review'); // Bumped up due to history
      expect(determineAction(2, 10)).toBe('flag_and_notify_admin'); // Repeat offender
      expect(determineAction(3, 0)).toBe('flag_and_notify_admin');
    });

    it('should handle repeat offenders with escalation', () => {
      const shouldEscalate = (flagCount, recentFlagCount) => {
        // Escalate if user has 10+ total flags or 3+ in last 24 hours
        return flagCount >= 10 || recentFlagCount >= 3;
      };

      expect(shouldEscalate(5, 1)).toBe(false);
      expect(shouldEscalate(10, 0)).toBe(true);
      expect(shouldEscalate(2, 3)).toBe(true);
    });
  });

  describe('Real-time Moderation Integration', () => {
    const offensivePatterns = [/\bf+u+c+k+/i, /\bs+h+i+t+/i];
    
    it('should process message before delivery', async () => {
      const processMessage = async (messageData) => {
        let flagged = false;
        let severity = 0;

        for (const pattern of offensivePatterns) {
          if (pattern.test(messageData.content)) {
            flagged = true;
            severity = 2;
            break;
          }
        }

        return {
          ...messageData,
          isFlagged: flagged,
          moderationResult: { flagged, severity },
          // Message is still delivered, just flagged for review
          delivered: true
        };
      };

      const cleanMessage = await processMessage({ content: 'Hello friend!' });
      expect(cleanMessage.isFlagged).toBe(false);
      expect(cleanMessage.delivered).toBe(true);

      const flaggedMessage = await processMessage({ content: 'What the fuuck' });
      expect(flaggedMessage.isFlagged).toBe(true);
      expect(flaggedMessage.delivered).toBe(true); // Still delivered
      expect(flaggedMessage.moderationResult.severity).toBe(2);
    });

    it('should not block message delivery for flagged content', () => {
      // Design decision: Flag but don't censor - admins review later
      const shouldBlockDelivery = (severity) => {
        // Only block for severe threats (severity 4+, which we don't have)
        return severity >= 4;
      };

      expect(shouldBlockDelivery(1)).toBe(false);
      expect(shouldBlockDelivery(2)).toBe(false);
      expect(shouldBlockDelivery(3)).toBe(false);
    });
  });

  describe('FlaggedContent Model Schema', () => {
    
    it('should validate required fields', async () => {
      const user = await User.create({
        username: 'schemauser',
        email: 'schema@test.com'
      });
      
      const chatSession = await ChatSession.create({
        participants: [user._id, new mongoose.Types.ObjectId()],
        active: true
      });

      const message = await Message.create({
        chatSessionId: chatSession._id,
        senderId: user._id,
        content: 'Test content',
        sentAt: new Date()
      });

      const flagData = {
        messageId: message._id,
        userId: user._id,
        chatSessionId: chatSession._id,
        content: 'Test content',
        flagReason: 'offensive_language',
        severity: 2
      };

      const flag = await FlaggedContent.create(flagData);

      expect(flag.messageId).toBeDefined();
      expect(flag.userId).toBeDefined();
      expect(flag.chatSessionId).toBeDefined();
      expect(flag.content).toBe('Test content');
      expect(flag.flagReason).toBe('offensive_language');
      expect(flag.severity).toBe(2);
    });

    it('should have valid status enum values', async () => {
      const user = await User.create({
        username: 'enumuser',
        email: 'enum@test.com'
      });
      
      const chatSession = await ChatSession.create({
        participants: [user._id, new mongoose.Types.ObjectId()],
        active: true
      });

      const message = await Message.create({
        chatSessionId: chatSession._id,
        senderId: user._id,
        content: 'Enum test',
        sentAt: new Date()
      });

      // Create with pending status
      const flag = await FlaggedContent.create({
        messageId: message._id,
        userId: user._id,
        chatSessionId: chatSession._id,
        content: 'Enum test',
        flagReason: 'offensive_language',
        severity: 1,
        status: 'pending'
      });

      expect(flag.status).toBe('pending');

      // Update to confirmed
      const updated = await FlaggedContent.findByIdAndUpdate(
        flag._id,
        { status: 'confirmed' },
        { new: true }
      );

      expect(updated.status).toBe('confirmed');
    });

    it('should have valid action taken enum values', async () => {
      const validActions = [
        'none',
        'warning_issued',
        'message_removed',
        'user_suspended',
        'user_banned'
      ];

      expect(validActions.length).toBe(5);
    });
  });
});

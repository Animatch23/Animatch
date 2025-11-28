/**
 * US-14: Icebreaker Prompts Tests
 * Tests for random prompt selection, session tracking, and preventing repeats
 */

import mongoose from 'mongoose';
import ChatSession from '../models/ChatSession.js';
import { connectTestDB, disconnectTestDB } from '../utils/testDb.js';

// Mock prompts data for testing
const mockPrompts = [
  { id: 1, text: "What's your favorite anime?", tags: ["anime", "favorites"] },
  { id: 2, text: "What are you studying?", tags: ["campus", "academics"] },
  { id: 3, text: "What's your favorite food?", tags: ["food", "favorites"] },
  { id: 4, text: "Any hobbies?", tags: ["hobbies"] },
  { id: 5, text: "What music do you like?", tags: ["music", "favorites"] }
];

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Icebreaker Prompts - US-14', () => {
  
  afterEach(async () => {
    await ChatSession.deleteMany({});
  });

  describe('getRandomPrompt', () => {
    // Helper function to simulate the selection logic
    const getRandomPrompt = (usedPromptIds = []) => {
      const availablePrompts = mockPrompts.filter(p => !usedPromptIds.includes(p.id));
      if (availablePrompts.length === 0) {
        // Reset - all prompts used, pick any
        return mockPrompts[Math.floor(Math.random() * mockPrompts.length)];
      }
      return availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
    };

    it('should return a prompt object with id, text, and tags', () => {
      const prompt = getRandomPrompt();
      
      expect(prompt).toHaveProperty('id');
      expect(prompt).toHaveProperty('text');
      expect(prompt).toHaveProperty('tags');
      expect(typeof prompt.id).toBe('number');
      expect(typeof prompt.text).toBe('string');
      expect(Array.isArray(prompt.tags)).toBe(true);
    });

    it('should exclude previously used prompts from selection', () => {
      const usedIds = [1, 2, 3];
      
      // Run multiple times to verify exclusion
      for (let i = 0; i < 10; i++) {
        const prompt = getRandomPrompt(usedIds);
        // Should only get prompts 4 or 5
        expect([4, 5]).toContain(prompt.id);
      }
    });

    it('should reset and allow any prompt when all prompts have been used', () => {
      const usedIds = [1, 2, 3, 4, 5]; // All used
      const prompt = getRandomPrompt(usedIds);
      
      // Should return some prompt (any from the pool)
      expect(prompt).toBeDefined();
      expect(mockPrompts.map(p => p.id)).toContain(prompt.id);
    });

    it('should return a prompt when no prompts have been used', () => {
      const prompt = getRandomPrompt([]);
      
      expect(prompt).toBeDefined();
      expect(prompt.text.length).toBeGreaterThan(0);
    });
  });

  describe('Chat Session Prompt Tracking', () => {
    
    it('should track used prompt IDs in chat session', async () => {
      const user1Id = new mongoose.Types.ObjectId();
      const user2Id = new mongoose.Types.ObjectId();
      
      // Create a chat session with some used prompts
      const session = await ChatSession.create({
        participants: [user1Id, user2Id],
        active: true,
        usedPrompts: [1, 2]
      });

      // Add another prompt
      const result = await ChatSession.findByIdAndUpdate(
        session._id,
        { $push: { usedPrompts: 3 } },
        { new: true }
      );

      expect(result.usedPrompts).toContain(3);
      expect(result.usedPrompts.length).toBe(3);
    });

    it('should retrieve used prompt IDs from chat session', async () => {
      const user1Id = new mongoose.Types.ObjectId();
      const user2Id = new mongoose.Types.ObjectId();
      const usedPromptIds = [1, 3, 5];
      
      const session = await ChatSession.create({
        participants: [user1Id, user2Id],
        active: true,
        usedPrompts: usedPromptIds
      });

      const retrieved = await ChatSession.findById(session._id);
      
      expect(retrieved.usedPrompts).toEqual(expect.arrayContaining(usedPromptIds));
      expect(retrieved.usedPrompts.length).toBe(3);
    });

    it('should return empty array for new session with no used prompts', async () => {
      const user1Id = new mongoose.Types.ObjectId();
      const user2Id = new mongoose.Types.ObjectId();
      
      const session = await ChatSession.create({
        participants: [user1Id, user2Id],
        active: true
      });

      const retrieved = await ChatSession.findById(session._id);
      
      expect(retrieved.usedPrompts).toEqual([]);
    });
  });

  describe('Icebreaker Service Logic', () => {
    // Helper to get next prompt for a session
    const getNextPromptForSession = async (sessionId) => {
      const session = await ChatSession.findById(sessionId);
      
      if (!session) {
        throw new Error('Chat session not found');
      }

      const usedIds = session.usedPrompts || [];
      let availablePrompts = mockPrompts.filter(p => !usedIds.includes(p.id));
      
      // Reset if all used
      if (availablePrompts.length === 0) {
        availablePrompts = mockPrompts;
        await ChatSession.findByIdAndUpdate(sessionId, { usedPrompts: [] });
      }

      const selectedPrompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
      
      // Track the used prompt
      await ChatSession.findByIdAndUpdate(
        sessionId,
        { 
          $addToSet: { usedPrompts: selectedPrompt.id },
          currentPrompt: selectedPrompt,
          promptShownAt: new Date()
        }
      );

      return selectedPrompt;
    };

    it('should get next prompt and track it for session', async () => {
      const user1Id = new mongoose.Types.ObjectId();
      const user2Id = new mongoose.Types.ObjectId();
      
      const session = await ChatSession.create({
        participants: [user1Id, user2Id],
        active: true,
        usedPrompts: [1]
      });

      const prompt = await getNextPromptForSession(session._id);
      
      expect(prompt).toBeDefined();
      expect(prompt.id).not.toBe(1); // Should exclude already used prompt
      
      // Verify it was tracked
      const updated = await ChatSession.findById(session._id);
      expect(updated.usedPrompts).toContain(prompt.id);
    });

    it('should throw error for invalid session', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await expect(
        getNextPromptForSession(fakeId)
      ).rejects.toThrow('Chat session not found');
    });

    it('should reset prompts when all have been used', async () => {
      const user1Id = new mongoose.Types.ObjectId();
      const user2Id = new mongoose.Types.ObjectId();
      
      // All prompts used
      const session = await ChatSession.create({
        participants: [user1Id, user2Id],
        active: true,
        usedPrompts: [1, 2, 3, 4, 5]
      });

      const prompt = await getNextPromptForSession(session._id);
      
      expect(prompt).toBeDefined();
      expect(mockPrompts.map(p => p.id)).toContain(prompt.id);
    });
  });

  describe('Prompt Pool Requirements', () => {
    
    it('should have prompts available', () => {
      expect(mockPrompts.length).toBeGreaterThanOrEqual(5);
    });

    it('should have unique IDs for all prompts', () => {
      const ids = mockPrompts.map(p => p.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('each prompt should have required fields', () => {
      mockPrompts.forEach(prompt => {
        expect(prompt).toHaveProperty('id');
        expect(prompt).toHaveProperty('text');
        expect(prompt.text.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Current Prompt Field', () => {
    it('should store current prompt in chat session', async () => {
      const user1Id = new mongoose.Types.ObjectId();
      const user2Id = new mongoose.Types.ObjectId();
      const currentPrompt = mockPrompts[0];
      
      const session = await ChatSession.create({
        participants: [user1Id, user2Id],
        active: true,
        currentPrompt: currentPrompt,
        promptShownAt: new Date()
      });

      const retrieved = await ChatSession.findById(session._id);
      
      expect(retrieved.currentPrompt.id).toBe(currentPrompt.id);
      expect(retrieved.currentPrompt.text).toBe(currentPrompt.text);
      expect(retrieved.promptShownAt).toBeDefined();
    });
  });
});

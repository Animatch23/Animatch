import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Queue from '../models/Queue.js';
import ChatSession from '../models/ChatSession.js';
import Profile from '../models/Profile.js';
import { joinQueue, leaveQueue, checkQueueStatus } from '../controllers/queueController.js';

let mongoServer;

// Mock user data
const mockUser1 = { id: new mongoose.Types.ObjectId() };
const mockUser2 = { id: new mongoose.Types.ObjectId() };
const mockUser3 = { id: new mongoose.Types.ObjectId() };

// Mock request/response
const mockRequest = (userData = {}, body = {}) => ({
  user: userData,
  body: body
});

const mockResponse = () => {
  const res = {};
  res._statusCode = null;
  res._jsonData = null;
  
  res.status = function(code) {
    res._statusCode = code;
    return this;
  };
  
  res.json = function(data) {
    res._jsonData = data;
    return this;
  };
  
  return res;
};

// Setup before tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  process.env.JWT_SECRET = 'test-secret';
});

// Clean up after tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clear data between tests
beforeEach(async () => {
  await Queue.deleteMany({});
  await ChatSession.deleteMany({});
  await Profile.deleteMany({});
});

describe('Interest-Based Queue Controller Tests', () => {
  
  describe('joinQueue with interests', () => {
    
    test('should add user to queue with interests from profile', async () => {
      // Create a profile with interests
      await Profile.create({
        userId: mockUser1.id.toString(),
        username: 'user1',
        interests: {
          course: 'Computer Science',
          dorm: 'Dorm A',
          organizations: ['Anime Club', 'Gaming Society']
        }
      });

      const req = mockRequest(mockUser1);
      const res = mockResponse();
      
      await joinQueue(req, res);
      
      expect(res._statusCode).toBe(200);
      expect(res._jsonData.matched).toBe(false);
      
      const queueEntry = await Queue.findOne({ userId: mockUser1.id.toString() });
      expect(queueEntry).toBeTruthy();
      expect(queueEntry.interests.course).toBe('Computer Science');
      expect(queueEntry.interests.dorm).toBe('Dorm A');
      expect(queueEntry.interests.organizations).toEqual(['Anime Club', 'Gaming Society']);
    });

    test('should add user to queue with default interests if profile not found', async () => {
      const req = mockRequest(mockUser1);
      const res = mockResponse();
      
      await joinQueue(req, res);
      
      expect(res._statusCode).toBe(200);
      
      const queueEntry = await Queue.findOne({ userId: mockUser1.id.toString() });
      expect(queueEntry).toBeTruthy();
      expect(queueEntry.interests.course).toBeNull();
      expect(queueEntry.interests.dorm).toBeNull();
      expect(queueEntry.interests.organizations).toEqual([]);
    });

    test('should add user to queue with partial interests', async () => {
      await Profile.create({
        userId: mockUser1.id.toString(),
        username: 'user1',
        interests: {
          course: 'Computer Science',
          dorm: null,
          organizations: []
        }
      });

      const req = mockRequest(mockUser1);
      const res = mockResponse();
      
      await joinQueue(req, res);
      
      const queueEntry = await Queue.findOne({ userId: mockUser1.id.toString() });
      expect(queueEntry.interests.course).toBe('Computer Science');
      expect(queueEntry.interests.dorm).toBeNull();
      expect(queueEntry.interests.organizations).toEqual([]);
    });
  });

  describe('checkQueueStatus with interest-based matching', () => {
    
    test('should match users with similar interests over dissimilar ones', async () => {
      // Create profiles
      await Profile.create({
        userId: mockUser1.id.toString(),
        username: 'user1',
        interests: {
          course: 'Computer Science',
          dorm: 'Dorm A',
          organizations: ['Anime Club']
        }
      });

      await Profile.create({
        userId: mockUser2.id.toString(),
        username: 'user2',
        interests: {
          course: 'Business',
          dorm: 'Dorm B',
          organizations: ['Chess Club']
        }
      });

      await Profile.create({
        userId: mockUser3.id.toString(),
        username: 'user3',
        interests: {
          course: 'Computer Science',
          dorm: 'Dorm A',
          organizations: ['Anime Club']
        }
      });

      // Add users to queue
      await Queue.create({
        userId: mockUser2.id.toString(),
        username: 'user2',
        interests: {
          course: 'Business',
          dorm: 'Dorm B',
          organizations: ['Chess Club']
        }
      });

      await Queue.create({
        userId: mockUser3.id.toString(),
        username: 'user3',
        interests: {
          course: 'Computer Science',
          dorm: 'Dorm A',
          organizations: ['Anime Club']
        }
      });

      await Queue.create({
        userId: mockUser1.id.toString(),
        username: 'user1',
        interests: {
          course: 'Computer Science',
          dorm: 'Dorm A',
          organizations: ['Anime Club']
        }
      });

      const req = mockRequest(mockUser1);
      const res = mockResponse();
      
      await checkQueueStatus(req, res);
      
      expect(res._jsonData.matched).toBe(true);
      expect(res._jsonData.chatSession).toBeTruthy();
      
      // Verify the match was with user3 (similar interests) not user2
      const chatSession = await ChatSession.findById(res._jsonData.chatSession._id);
      const participantIds = chatSession.participants.map(p => p.toString());
      
      expect(participantIds).toContain(mockUser1.id.toString());
      expect(participantIds).toContain(mockUser3.id.toString());
      expect(participantIds).not.toContain(mockUser2.id.toString());
    });

    test('should fallback to random matching if no similar interests', async () => {
      // Create profiles with no matching interests
      await Profile.create({
        userId: mockUser1.id.toString(),
        username: 'user1',
        interests: {
          course: 'Computer Science',
          dorm: 'Dorm A',
          organizations: ['Anime Club']
        }
      });

      await Profile.create({
        userId: mockUser2.id.toString(),
        username: 'user2',
        interests: {
          course: 'Business',
          dorm: 'Dorm B',
          organizations: ['Chess Club']
        }
      });

      await Queue.create({
        userId: mockUser2.id.toString(),
        username: 'user2',
        interests: {
          course: 'Business',
          dorm: 'Dorm B',
          organizations: ['Chess Club']
        }
      });

      await Queue.create({
        userId: mockUser1.id.toString(),
        username: 'user1',
        interests: {
          course: 'Computer Science',
          dorm: 'Dorm A',
          organizations: ['Anime Club']
        }
      });

      const req = mockRequest(mockUser1);
      const res = mockResponse();
      
      await checkQueueStatus(req, res);
      
      // Should still match despite no common interests (random fallback)
      expect(res._jsonData.matched).toBe(true);
      expect(res._jsonData.chatSession).toBeTruthy();
      
      const chatSession = await ChatSession.findById(res._jsonData.chatSession._id);
      expect(chatSession.metadata.matchingStrategy).toBe('random-fallback');
      expect(chatSession.metadata.similarityScore).toBe(0);
    });

    test('should store matching metadata in chat session', async () => {
      await Profile.create({
        userId: mockUser1.id.toString(),
        username: 'user1',
        interests: {
          course: 'Computer Science',
          dorm: null,
          organizations: []
        }
      });

      await Profile.create({
        userId: mockUser2.id.toString(),
        username: 'user2',
        interests: {
          course: 'Computer Science',
          dorm: null,
          organizations: []
        }
      });

      await Queue.create({
        userId: mockUser2.id.toString(),
        username: 'user2',
        interests: {
          course: 'Computer Science',
          dorm: null,
          organizations: []
        }
      });

      await Queue.create({
        userId: mockUser1.id.toString(),
        username: 'user1',
        interests: {
          course: 'Computer Science',
          dorm: null,
          organizations: []
        }
      });

      const req = mockRequest(mockUser1);
      const res = mockResponse();
      
      await checkQueueStatus(req, res);
      
      const chatSession = await ChatSession.findById(res._jsonData.chatSession._id);
      expect(chatSession.metadata).toBeTruthy();
      expect(chatSession.metadata.matchingStrategy).toBe('similarity-based');
      expect(chatSession.metadata.similarityScore).toBe(3); // Course match
      expect(chatSession.metadata.matchedAt).toBeTruthy();
    });

    test('should not match if user already has active chat', async () => {
      // Create an active chat for user1
      await ChatSession.create({
        participants: [mockUser1.id, mockUser2.id],
        active: true
      });

      await Queue.create({
        userId: mockUser1.id.toString(),
        username: 'user1',
        interests: {
          course: 'Computer Science',
          dorm: null,
          organizations: []
        }
      });

      const req = mockRequest(mockUser1);
      const res = mockResponse();
      
      await checkQueueStatus(req, res);
      
      expect(res._jsonData.matched).toBe(true);
      // Should return existing chat session
      expect(res._jsonData.chatSession.active).toBe(true);
    });

    test('should return waiting status if no matches available', async () => {
      await Queue.create({
        userId: mockUser1.id.toString(),
        username: 'user1',
        interests: {
          course: 'Computer Science',
          dorm: null,
          organizations: []
        }
      });

      const req = mockRequest(mockUser1);
      const res = mockResponse();
      
      await checkQueueStatus(req, res);
      
      expect(res._jsonData.inQueue).toBe(true);
      expect(res._jsonData.matched).toBe(false);
      expect(res._jsonData.waitTime).toBeDefined();
    });

    test('should not match if other user has active chat', async () => {
      // Create an active chat for user2
      await ChatSession.create({
        participants: [mockUser2.id, mockUser3.id],
        active: true
      });

      await Queue.create({
        userId: mockUser1.id.toString(),
        username: 'user1',
        interests: {
          course: 'Computer Science',
          dorm: null,
          organizations: []
        }
      });

      await Queue.create({
        userId: mockUser2.id.toString(),
        username: 'user2',
        interests: {
          course: 'Computer Science',
          dorm: null,
          organizations: []
        }
      });

      const req = mockRequest(mockUser1);
      const res = mockResponse();
      
      await checkQueueStatus(req, res);
      
      // Should not match with user2 since they have active chat
      expect(res._jsonData.matched).toBe(false);
      
      // User2 should be removed from queue
      const user2InQueue = await Queue.findOne({ userId: mockUser2.id.toString() });
      expect(user2InQueue).toBeNull();
    });
  });

  describe('leaveQueue', () => {
    
    test('should remove user from queue', async () => {
      await Queue.create({
        userId: mockUser1.id.toString(),
        username: 'user1',
        interests: {
          course: 'Computer Science',
          dorm: null,
          organizations: []
        }
      });

      const req = mockRequest(mockUser1);
      const res = mockResponse();
      
      await leaveQueue(req, res);
      
      expect(res._statusCode).toBe(200);
      
      const queueEntry = await Queue.findOne({ userId: mockUser1.id.toString() });
      expect(queueEntry).toBeNull();
    });
  });

  describe('Integration tests', () => {
    
    test('should handle multiple concurrent users with varying interests', async () => {
      const users = [
        {
          id: new mongoose.Types.ObjectId(),
          interests: { course: 'Computer Science', dorm: 'Dorm A', organizations: ['Anime Club'] }
        },
        {
          id: new mongoose.Types.ObjectId(),
          interests: { course: 'Computer Science', dorm: 'Dorm B', organizations: ['Gaming'] }
        },
        {
          id: new mongoose.Types.ObjectId(),
          interests: { course: 'Business', dorm: 'Dorm C', organizations: ['Finance Club'] }
        },
        {
          id: new mongoose.Types.ObjectId(),
          interests: { course: 'Engineering', dorm: 'Dorm D', organizations: [] }
        }
      ];

      // Add all users to queue
      for (const user of users) {
        await Queue.create({
          userId: user.id.toString(),
          username: `user${user.id}`,
          interests: user.interests
        });
      }

      // First user tries to match
      const req = mockRequest({ id: users[0].id });
      const res = mockResponse();
      
      await checkQueueStatus(req, res);
      
      expect(res._jsonData.matched).toBe(true);
      
      // Should match with user 2 (same course)
      const chatSession = await ChatSession.findById(res._jsonData.chatSession._id);
      const participantIds = chatSession.participants.map(p => p.toString());
      
      expect(participantIds).toContain(users[0].id.toString());
      expect(participantIds).toContain(users[1].id.toString());
    });

    test('should handle matching when all users have identical interests', async () => {
      const commonInterests = {
        course: 'Computer Science',
        dorm: 'Dorm A',
        organizations: ['Anime Club']
      };

      await Queue.create({
        userId: mockUser1.id.toString(),
        username: 'user1',
        interests: commonInterests
      });

      await Queue.create({
        userId: mockUser2.id.toString(),
        username: 'user2',
        interests: commonInterests
      });

      const req = mockRequest(mockUser1);
      const res = mockResponse();
      
      await checkQueueStatus(req, res);
      
      expect(res._jsonData.matched).toBe(true);
      
      const chatSession = await ChatSession.findById(res._jsonData.chatSession._id);
      expect(chatSession.metadata.similarityScore).toBe(6); // 3 + 2 + 1
      expect(chatSession.metadata.matchingStrategy).toBe('similarity-based');
    });
  });
});

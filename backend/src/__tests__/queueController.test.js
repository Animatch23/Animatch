import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Queue from '../models/Queue.js';
import ChatSession from '../models/ChatSession.js';
import User from '../models/User.js';
import { joinQueue, leaveQueue, checkQueueStatus } from '../controllers/queueController.js';

let mongoServer;

// Mock user data
const mockUser1 = { id: new mongoose.Types.ObjectId() };
const mockUser2 = { id: new mongoose.Types.ObjectId() };

// Mock request/response
const mockRequest = (userData = {}) => ({
  user: userData,
  body: {}
});

// Use a simpler mock approach without jest.fn()
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
  await User.deleteMany({});
});

describe('Queue Controller Tests', () => {
  test('joinQueue should add a user to the queue', async () => {
    // Create user in database first
    await User.create({
      _id: mockUser1.id,
      email: 'user1@test.com',
      username: 'testuser1',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: ['ACM'],
      interests: ['Gaming']
    });

    const req = mockRequest(mockUser1);
    const res = mockResponse();
    
    await joinQueue(req, res);
    
    // Check response using our custom properties instead of jest.fn() expectations
    expect(res._jsonData).toBeTruthy();
    expect(res._jsonData.matched).toBe(false);
    expect(res._jsonData.queued).toBe(true);
    
    const queueEntries = await Queue.find({});
    expect(queueEntries.length).toBe(1);
    expect(queueEntries[0].userId.toString()).toBe(mockUser1.id.toString());
  });

  test('joinQueue should match two users with similar profiles', async () => {
    // Create two users with similar profiles
    await User.create({
      _id: mockUser1.id,
      email: 'user1@test.com',
      username: 'testuser1',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: ['ACM', 'IEEE'],
      interests: ['Gaming', 'Anime']
    });

    await User.create({
      _id: mockUser2.id,
      email: 'user2@test.com',
      username: 'testuser2',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: ['ACM'],
      interests: ['Gaming']
    });

    // Add first user to queue
    const req1 = mockRequest(mockUser1);
    const res1 = mockResponse();
    await joinQueue(req1, res1);

    // Add second user to queue - should match
    const req2 = mockRequest(mockUser2);
    const res2 = mockResponse();
    await joinQueue(req2, res2);

    // Check that match was created
    expect(res2._jsonData.matched).toBe(true);
    expect(res2._jsonData.chatSessionId).toBeTruthy();

    // Verify chat session was created
    const chatSessions = await ChatSession.find({});
    expect(chatSessions.length).toBe(1);
    expect(chatSessions[0].participants).toHaveLength(2);
    expect(chatSessions[0].active).toBe(true);

    // Verify queue is empty
    const queueEntries = await Queue.find({});
    expect(queueEntries.length).toBe(0);
  });

  test('joinQueue should prioritize high similarity matches', async () => {
    // Create three users with different similarity levels
    const user1Id = new mongoose.Types.ObjectId();
    const user2Id = new mongoose.Types.ObjectId(); // High similarity
    const user3Id = new mongoose.Types.ObjectId(); // Low similarity

    await User.create({
      _id: user1Id,
      email: 'user1@test.com',
      username: 'testuser1',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: ['ACM'],
      interests: ['Gaming']
    });

    await User.create({
      _id: user2Id,
      email: 'user2@test.com',
      username: 'testuser2',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: ['ACM'],
      interests: ['Gaming']
    });

    await User.create({
      _id: user3Id,
      email: 'user3@test.com',
      username: 'testuser3',
      course: 'Business',
      housing: 'St. Joseph Hall',
      organizations: [],
      interests: []
    });

    // Add user3 (low similarity) to queue first
    await Queue.create({ userId: user3Id, status: 'waiting' });

    // Add user2 (high similarity) to queue
    await Queue.create({ userId: user2Id, status: 'waiting' });

    // Add user1 - should match with user2 (higher similarity) not user3
    const req = mockRequest({ id: user1Id });
    const res = mockResponse();
    await joinQueue(req, res);

    // Check that match was created with user2
    expect(res._jsonData.matched).toBe(true);
    const chatSession = await ChatSession.findById(res._jsonData.chatSessionId);
    expect(chatSession.participants).toContainEqual(user1Id);
    expect(chatSession.participants).toContainEqual(user2Id);

    // user3 should still be in queue
    const queueEntries = await Queue.find({});
    expect(queueEntries.length).toBe(1);
    expect(queueEntries[0].userId.toString()).toBe(user3Id.toString());
  });

  test('joinQueue should handle case-insensitive matching', async () => {
    // Create two users with same info but different cases
    await User.create({
      _id: mockUser1.id,
      email: 'user1@test.com',
      username: 'testuser1',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: ['ACM'],
      interests: ['Gaming']
    });

    await User.create({
      _id: mockUser2.id,
      email: 'user2@test.com',
      username: 'testuser2',
      course: 'computer science', // lowercase
      housing: 'agape hall', // lowercase
      organizations: ['acm'], // lowercase
      interests: ['gaming'] // lowercase
    });

    // Add first user to queue
    const req1 = mockRequest(mockUser1);
    const res1 = mockResponse();
    await joinQueue(req1, res1);

    // Add second user - should match despite case differences
    const req2 = mockRequest(mockUser2);
    const res2 = mockResponse();
    await joinQueue(req2, res2);

    // Check that match was created
    expect(res2._jsonData.matched).toBe(true);
    expect(res2._jsonData.chatSessionId).toBeTruthy();
  });

  test('joinQueue should prevent duplicate active chats', async () => {
    const thirdUser = { id: new mongoose.Types.ObjectId() };

    // Create users
    await User.create({
      _id: mockUser1.id,
      email: 'user1@test.com',
      username: 'testuser1',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: [],
      interests: []
    });

    await User.create({
      _id: mockUser2.id,
      email: 'user2@test.com',
      username: 'testuser2',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: [],
      interests: []
    });

    await User.create({
      _id: thirdUser.id,
      email: 'user3@test.com',
      username: 'testuser3',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: [],
      interests: []
    });

    // Create existing chat session for user1
    await ChatSession.create({
      participants: [mockUser1.id, mockUser2.id],
      active: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    // Try to add user1 to queue - should return existing chat
    const req = mockRequest(mockUser1);
    const res = mockResponse();
    await joinQueue(req, res);

    // Should return existing chat, not create new one
    expect(res._jsonData.matched).toBe(true);
    expect(res._jsonData.chatSessionId).toBeTruthy();

    // Verify only one chat session exists
    const chatSessions = await ChatSession.find({});
    expect(chatSessions.length).toBe(1);
  });

  test('leaveQueue should remove user from queue', async () => {
    // Create user and add to queue
    await User.create({
      _id: mockUser1.id,
      email: 'user1@test.com',
      username: 'testuser1',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: [],
      interests: []
    });

    await Queue.create({ userId: mockUser1.id, status: 'waiting' });

    // Leave queue
    const req = mockRequest(mockUser1);
    const res = mockResponse();
    await leaveQueue(req, res);

    // Verify queue is empty
    const queueEntries = await Queue.find({});
    expect(queueEntries.length).toBe(0);
    expect(res._jsonData.message).toBe('Left queue');
  });

  test('checkQueueStatus should return queue position when no match possible', async () => {
    // Create user alone in queue with NO other candidates
    await User.create({
      _id: mockUser1.id,
      email: 'user1@test.com',
      username: 'testuser1',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: ['ACM'],
      interests: ['Gaming']
    });

    // Add ONLY mockUser1 to queue
    await Queue.create({ userId: mockUser1.id, status: 'waiting', createdAt: new Date(Date.now() - 1000) });

    // Check status for mockUser1
    const req = mockRequest(mockUser1);
    const res = mockResponse();
    await checkQueueStatus(req, res);

    // User should be in queue (no match possible when alone)
    expect(res._jsonData.queued).toBe(true);
    expect(res._jsonData.matched).toBe(false);
    // Verify new matchingStatus structure instead of position
    expect(res._jsonData.matchingStatus).toBeDefined();
    expect(res._jsonData.matchingStatus.mode).toBe('similarity'); // Should be in similarity mode (< 30s)
    expect(res._jsonData.matchingStatus.timeInQueue).toBeLessThan(30); // Less than 30 seconds
  });

  test('checkQueueStatus should match users even with 0 similarity (fallback)', async () => {
    const user2Id = new mongoose.Types.ObjectId();

    // Create users with completely different profiles
    await User.create({
      _id: mockUser1.id,
      email: 'user1@test.com',
      username: 'testuser1',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: ['ACM'],
      interests: ['Gaming']
    });

    await User.create({
      _id: user2Id,
      email: 'user2@test.com',
      username: 'testuser2',
      course: 'Business',
      housing: 'St. Joseph Hall',
      organizations: ['MBA Club'],
      interests: ['Finance']
    });

    // Add both users to queue, with mockUser1 having been waiting 31 seconds (triggers random fallback)
    await Queue.create({ userId: user2Id, status: 'waiting', createdAt: new Date(Date.now() - 2000) });
    await Queue.create({ userId: mockUser1.id, status: 'waiting', createdAt: new Date(Date.now() - 31000) });

    // Check status for mockUser1 - should match with user2 despite 0 similarity
    const req = mockRequest(mockUser1);
    const res = mockResponse();
    await checkQueueStatus(req, res);

    // Should have matched (fallback to random when similarity = 0)
    expect(res._jsonData.matched).toBe(true);
    expect(res._jsonData.chatSessionId).toBeTruthy();

    // Verify match was created
    const chatSession = await ChatSession.findById(res._jsonData.chatSessionId);
    expect(chatSession).toBeTruthy();
    expect(chatSession.participants).toContainEqual(mockUser1.id);
    expect(chatSession.participants).toContainEqual(user2Id);
  });

  test('joinQueue should not match users who have ACTIVE saved chats', async () => {
    // Create two users
    await User.create({
      _id: mockUser1.id,
      email: 'user1@test.com',
      username: 'testuser1',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: ['ACM'],
      interests: ['Gaming']
    });

    await User.create({
      _id: mockUser2.id,
      email: 'user2@test.com',
      username: 'testuser2',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: ['ACM'],
      interests: ['Gaming']
    });

    // Create an ACTIVE saved chat between them (only active saved chats block rematching)
    await ChatSession.create({
      participants: [mockUser1.id, mockUser2.id],
      active: true, // ACTIVE saved chat blocks rematching
      isSaved: true,
      savedByUsers: [mockUser1.id, mockUser2.id],
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Far in the future
    });

    // Add user2 to queue
    await Queue.create({ userId: mockUser2.id, status: 'waiting' });

    // Try to add user1 to queue - should NOT match with user2
    const req = mockRequest(mockUser1);
    const res = mockResponse();
    await joinQueue(req, res);

    // Should NOT be matched, should be queued instead
    expect(res._jsonData.matched).toBe(false);
    expect(res._jsonData.queued).toBe(true);

    // Both users should still be in queue
    const queueEntries = await Queue.find({});
    expect(queueEntries.length).toBe(2);
  });

  test('checkQueueStatus should exclude ACTIVE saved chat partners from matching', async () => {
    // Create two users
    await User.create({
      _id: mockUser1.id,
      email: 'user1@test.com',
      username: 'testuser1',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: [],
      interests: []
    });

    await User.create({
      _id: mockUser2.id,
      email: 'user2@test.com',
      username: 'testuser2',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: [],
      interests: []
    });

    // Create an ACTIVE saved chat between them (only active saved chats block)
    await ChatSession.create({
      participants: [mockUser1.id, mockUser2.id],
      active: true, // ACTIVE saved chat blocks rematching
      isSaved: true,
      savedByUsers: [mockUser1.id, mockUser2.id],
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });

    // Add both users to queue with enough wait time for random matching
    await Queue.create({ userId: mockUser1.id, status: 'waiting', createdAt: new Date(Date.now() - 35000) });
    await Queue.create({ userId: mockUser2.id, status: 'waiting', createdAt: new Date(Date.now() - 35000) });

    // Check status for user1 - should NOT match with user2 even after timeout
    const req = mockRequest(mockUser1);
    const res = mockResponse();
    await checkQueueStatus(req, res);

    // Should still be queued, not matched
    expect(res._jsonData.queued).toBe(true);
    expect(res._jsonData.matched).toBe(false);
  });

  test('joinQueue should match with new users even if user has saved chats with others', async () => {
    const user3Id = new mongoose.Types.ObjectId();

    // Create three users
    await User.create({
      _id: mockUser1.id,
      email: 'user1@test.com',
      username: 'testuser1',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: ['ACM'],
      interests: ['Gaming']
    });

    await User.create({
      _id: mockUser2.id,
      email: 'user2@test.com',
      username: 'testuser2',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: ['ACM'],
      interests: ['Gaming']
    });

    await User.create({
      _id: user3Id,
      email: 'user3@test.com',
      username: 'testuser3',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: ['ACM'],
      interests: ['Gaming']
    });

    // Create a saved chat between user1 and user2
    await ChatSession.create({
      participants: [mockUser1.id, mockUser2.id],
      active: false,
      isSaved: true,
      savedByUsers: [mockUser1.id, mockUser2.id],
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });

    // Add user3 to queue (fresh user with no saved chats)
    await Queue.create({ userId: user3Id, status: 'waiting' });

    // User1 joins queue - should match with user3 (not user2)
    const req = mockRequest(mockUser1);
    const res = mockResponse();
    await joinQueue(req, res);

    // Should be matched with user3
    expect(res._jsonData.matched).toBe(true);
    expect(res._jsonData.chatSessionId).toBeTruthy();

    // Verify the match is with user3, not user2
    const chatSession = await ChatSession.findOne({ active: true });
    expect(chatSession.participants).toContainEqual(mockUser1.id);
    expect(chatSession.participants).toContainEqual(user3Id);
    expect(chatSession.participants).not.toContainEqual(mockUser2.id);
  });

  test('joinQueue should allow rematch when saved chat was unmatched', async () => {
    // Create two users
    await User.create({
      _id: mockUser1.id,
      email: 'user1@test.com',
      username: 'testuser1',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: ['ACM'],
      interests: ['Gaming']
    });

    await User.create({
      _id: mockUser2.id,
      email: 'user2@test.com',
      username: 'testuser2',
      course: 'Computer Science',
      housing: 'Agape Hall',
      organizations: ['ACM'],
      interests: ['Gaming']
    });

    // Create a saved chat between them but mark as unmatched (should allow rematch)
    await ChatSession.create({
      participants: [mockUser1.id, mockUser2.id],
      active: false,
      isSaved: true,
      savedByUsers: [mockUser1.id, mockUser2.id],
      unmatchedBy: mockUser1.id, // user1 had unmatched previously
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });

    // Add user2 to queue
    await Queue.create({ userId: mockUser2.id, status: 'waiting' });

    // Now add user1 to queue - they should be allowed to be matched with user2 because the saved chat was unmatched
    const req = mockRequest(mockUser1);
    const res = mockResponse();
    await joinQueue(req, res);

    // Should be matched now
    expect(res._jsonData.matched).toBe(true);
    expect(res._jsonData.chatSessionId).toBeTruthy();

    const chatSession = await ChatSession.findById(res._jsonData.chatSessionId);
    expect(chatSession).toBeTruthy();
    expect(chatSession.participants).toContainEqual(mockUser1.id);
    expect(chatSession.participants).toContainEqual(mockUser2.id);
  });
});
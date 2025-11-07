import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Queue from '../models/Queue.js';
import ChatSession from '../models/ChatSession.js';
import { joinQueue, leaveQueue, checkQueueStatus } from '../controllers/queueController.js';
import User from '../models/User.js';

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
    const req = mockRequest(mockUser1);
    const res = mockResponse();
    
    await joinQueue(req, res);
    
    // Check response using our custom properties instead of jest.fn() expectations
    expect(res._jsonData).toBeTruthy();
    expect(res._jsonData.matched === false).toBe(true);
    
    const queueEntries = await Queue.find({});
    expect(queueEntries.length).toBe(1);
    expect(queueEntries[0].userId.toString()).toBe(mockUser1.id.toString());
  });
});

describe('Matchmaking with Blocklist (US #10)', () => {

  test('should not match a user with someone on their blocklist', async () => {
    const user1 = { id: new mongoose.Types.ObjectId() };
    const user3 = { id: new mongoose.Types.ObjectId() };

    await User.create([
      { _id: user1.id, username: 'user1', blockList: [user3.id] },
      { _id: user3.id, username: 'user3', blockList: [] },
    ]);

    const req1 = mockRequest(user1);
    const res1 = mockResponse();
    const req3 = mockRequest(user3);
    const res3 = mockResponse();

    await joinQueue(req1, res1);
    
    await joinQueue(req3, res3);

    await checkQueueStatus(req1, res1);

    expect(res1._jsonData.matched).toBe(false);
  });

  test('should successfully match two users who have not blocked each other', async () => {
    const user1 = { id: new mongoose.Types.ObjectId() };
    const user2 = { id: new mongoose.Types.ObjectId() };

    await User.create([
      { _id: user1.id, username: 'user1', blockList: [] },
      { _id: user2.id, username: 'user2', blockList: [] },
    ]);

    const req1 = mockRequest(user1);
    const res1 = mockResponse();
    const req2 = mockRequest(user2);
    const res2 = mockResponse();

    await joinQueue(req1, res1);
    
    await joinQueue(req2, res2);

    await checkQueueStatus(req1, res1);

    expect(res1._jsonData.matched).toBe(true);
    expect(res1._jsonData.chatSession).toBeDefined();
  });
});
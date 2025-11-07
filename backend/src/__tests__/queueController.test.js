import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Queue from '../models/Queue.js';
import ChatSession from '../models/ChatSession.js';
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
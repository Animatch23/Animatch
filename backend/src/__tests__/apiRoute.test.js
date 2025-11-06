import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import queueRoutes from '../routes/queueRoutes.js';
import { protect } from '../middleware/authMiddleware.js';
import Queue from '../models/Queue.js';

let mongoServer;
let app;

// Setup test user
const testUser = { id: new mongoose.Types.ObjectId() };

// Create token for test user
const generateToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  
  // Setup environment variable for JWT
  process.env.JWT_SECRET = 'test-secret';
  
  // Setup Express app
  app = express();
  app.use(express.json());
  app.use('/api/queue', queueRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Queue.deleteMany({});
});

describe('Queue API Routes Tests', () => {
  test('POST /api/queue/join should require auth token', async () => {
    const res = await request(app)
      .post('/api/queue/join')
      .send({});
      
    expect(res.statusCode).toBe(401);
  });
  
  test('POST /api/queue/join should add user to queue', async () => {
    const token = generateToken(testUser);
    
    const res = await request(app)
      .post('/api/queue/join')
      .set('Authorization', `Bearer ${token}`)
      .send({});
      
    expect(res.statusCode).toBe(200);
    expect(res.body.matched).toBe(false);
    expect(res.body.message).toBe('Added to queue');
  });
  
  test('GET /api/queue/status should return queue status', async () => {
    // Add user to queue first
    await new Queue({ userId: testUser.id }).save();
    
    const token = generateToken(testUser);
    
    const res = await request(app)
      .get('/api/queue/status')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.statusCode).toBe(200);
    expect(res.body.inQueue).toBe(true);
    expect(res.body.matched).toBe(false);
  });
  
  test('POST /api/queue/leave should remove user from queue', async () => {
    // Add user to queue first
    await new Queue({ userId: testUser.id }).save();
    
    const token = generateToken(testUser);
    
    const res = await request(app)
      .post('/api/queue/leave')
      .set('Authorization', `Bearer ${token}`)
      .send({});
      
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Removed from queue');
    
    // Confirm removal
    const queueEntries = await Queue.find({});
    expect(queueEntries).toHaveLength(0);
  });
});
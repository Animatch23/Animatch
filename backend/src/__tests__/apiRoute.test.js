import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Queue from '../models/Queue.js';
import User from '../models/User.js';
import app from '../server.js';

let testToken;
let testUser;

beforeAll(async () => {
  // Wait for the app's database connection to be ready
  if (mongoose.connection.readyState === 0) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in test environment');
  }
  
  console.log('JWT_SECRET loaded:', !!secret);
  
  // Clean up any existing test user
  await User.deleteMany({ email: 'test@dlsu.edu.ph' });
  
  // Create a test user in the database
  testUser = await User.create({
    email: 'test@dlsu.edu.ph',
    username: 'Test User'
  });
  
  testToken = jwt.sign(
    { 
      email: testUser.email,
      name: testUser.username
    },
    secret,
    { expiresIn: '1h' }
  );
  
  console.log('Token generated successfully');
});

afterAll(async () => {
  // Clean up test user
  if (testUser) {
    await User.deleteMany({ email: 'test@dlsu.edu.ph' });
  }
  await Queue.deleteMany({});
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
    expect(res.body.message).toBe('No token provided');
  });

  test('POST /api/queue/join should reject invalid token', async () => {
    const res = await request(app)
      .post('/api/queue/join')
      .set('Authorization', 'Bearer invalid-token')
      .send({});
      
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Invalid token');
  });
});
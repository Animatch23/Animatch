import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import queueRoutes from '../routes/queueRoutes.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import Queue from '../models/Queue.js';
import User from '../models/User.js';
import app from '../server.js';

let mongoServer;
let testToken;
let testUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  
  // Generate token AFTER server.js has loaded .env.test
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in test environment');
  }
  
  console.log('JWT_SECRET loaded:', !!secret);
  
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
    expect(res.body.message).toBe('No token provided');
  });
  
  test('POST /api/queue/join should add user to queue', async () => {
    console.log('Sending request with token');
    
    const res = await request(app)
      .post('/api/queue/join')
      .set('Authorization', `Bearer ${testToken}`)
      .send({});
    
    console.log('Response status:', res.statusCode);
    console.log('Response body:', res.body);
      
    expect(res.statusCode).toBe(200);
    expect(res.body.matched).toBe(false);
    expect(res.body.message).toBe('Added to queue');
  });

  test('GET /api/queue/status should return queue status', async () => {
    // First join with testToken
    await request(app)
      .post('/api/queue/join')
      .set('Authorization', `Bearer ${testToken}`)
      .send({});

    // Then check status with same token
    const res = await request(app)
      .get('/api/queue/status')
      .set('Authorization', `Bearer ${testToken}`);
      
    expect(res.statusCode).toBe(200);
    expect(res.body.inQueue).toBe(true);
    expect(res.body.matched).toBe(false);
  });
  
  test('POST /api/queue/leave should remove user from queue', async () => {
    // Join with testToken
    await request(app)
      .post('/api/queue/join')
      .set('Authorization', `Bearer ${testToken}`)
      .send({});

    // Leave with same token
    const res = await request(app)
      .post('/api/queue/leave')
      .set('Authorization', `Bearer ${testToken}`)
      .send({});
      
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Removed from queue');
    
    // Confirm removal
    const queueEntries = await Queue.find({});
    expect(queueEntries).toHaveLength(0);
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
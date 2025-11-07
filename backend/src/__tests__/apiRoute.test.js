import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import queueRoutes from '../routes/queueRoutes.js';
import { protect } from '../middleware/authMiddleware.js';
import Queue from '../models/Queue.js';
import app from '../server.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Queue.deleteMany({});
});

describe('Queue API Routes Tests', () => {
  const testToken = new mongoose.Types.ObjectId().toHexString();

  test('POST /api/queue/join should require auth token', async () => {
    const res = await request(app)
      .post('/api/queue/join')
      .send({});
      
    expect(res.statusCode).toBe(401);
  });
  
  test('POST /api/queue/join should add user to queue', async () => {
    const res = await request(app)
      .post('/api/queue/join')
      .set('Authorization', `Bearer ${testToken}`)
      .send({});
      
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
});
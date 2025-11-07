import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import User from '../models/User.js';
import Queue from '../models/Queue.js';
import ChatSession from '../models/ChatSession.js';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URL);
});

afterAll(async () => {
  await mongoose.disconnect();
});

afterEach(async () => {
  await User.deleteMany({});
  await Queue.deleteMany({});
  await ChatSession.deleteMany({});
});

describe('Queue API Routes Tests', () => {

  let user1Id, cookie1;

  beforeEach(async () => {
    user1Id = new mongoose.Types.ObjectId();
    cookie1 = `uid=${user1Id.toHexString()}`;

    await User.create({ _id: user1Id, username: 'testuser' });
  });

  test('POST /api/queue/join should add a new user to queue if no cookie is sent', async () => {
    const res = await request(app)
      .post('/api/queue/join')
      .send({});
    
    expect(res.statusCode).toBe(200);
    expect(res.body.matched).toBe(false);

    const queueEntries = await Queue.find({});
    expect(queueEntries).toHaveLength(1);
    expect(queueEntries[0].userId.equals(user1Id)).toBe(false);
  });

  test('GET /api/queue/status should return queue status', async () => {
    await request(app)
      .post('/api/queue/join')
      .set('Cookie', cookie1)
      .send({});
    
    const res = await request(app)
      .get('/api/queue/status')
      .set('Cookie', cookie1);

    expect(res.statusCode).toBe(200);
    expect(res.body.inQueue).toBe(true);
    expect(res.body.matched).toBe(false);
  });

  test('POST /api/queue/leave should remove user from queue', async () => {
    await request(app)
      .post('/api/queue/join')
      .set('Cookie', cookie1)
      .send({});
    
    let queueEntries = await Queue.find({});
    expect(queueEntries).toHaveLength(1);

    const res = await request(app)
      .post('/api/queue/leave')
      .set('Cookie', cookie1);

    expect(res.statusCode).toBe(200);

    queueEntries = await Queue.find({});
    expect(queueEntries).toHaveLength(0);
  });
});
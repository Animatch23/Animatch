import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import User from '../models/User.js';
import ChatSession from '../models/ChatSession.js';
import Queue from '../models/Queue.js';

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL);
});

afterAll(async () => {
    await mongoose.disconnect();
});

afterEach(async () => {
    await User.deleteMany({});
    await ChatSession.deleteMany({});
    await Queue.deleteMany({});
});

describe('Matchmaking with Blocklist (US #10)', () => {

    let user1Id, user2Id, user3Id;
    let cookie1, cookie2, cookie3;

    beforeEach(async () => {

        user1Id = new mongoose.Types.ObjectId();
        user2Id = new mongoose.Types.ObjectId();
        user3Id = new mongoose.Types.ObjectId();

        cookie1 = `uid=${user1Id.toHexString()}`;
        cookie2 = `uid=${user2Id.toHexString()}`;
        cookie3 = `uid=${user3Id.toHexString()}`;

        await User.create([
            { _id: user1Id, username: 'user1', blockList: [user3Id] },
            { _id: user2Id, username: 'user2', blockList: [] },
            { _id: user3Id, username: 'user3', blockList: [] },
        ]);

        await ChatSession.deleteMany({});
        await Queue.deleteMany({});
    });

    it('should not match a user with someone on their blocklist', async () => {
        await request(app).post('/api/queue/join').set('Cookie', cookie1);
        
        await request(app).post('/api/queue/join').set('Cookie', cookie3);

        const res = await request(app).get('/api/queue/check').set('Cookie', cookie1);

        expect(res.body.matched).toBe(false);
    });

    it('should not match a user with someone who has blocked them', async () => {
        await request(app).post('/api/queue/join').set('Cookie', cookie3);
        
        await request(app).post('/api/queue/join').set('Cookie', cookie1);

        const res = await request(app).get('/api/queue/check').set('Cookie', cookie3);
        
        expect(res.body.matched).toBe(false);
    });

    it('should successfully match two users who have not blocked each other', async () => {
        await request(app).post('/api/queue/join').set('Cookie', cookie1);
        
        await request(app).post('/api/queue/join').set('Cookie', cookie2);

        const res = await request(app).get('/api/queue/check').set('Cookie', cookie1);

        expect(res.body.matched).toBe(true);
        expect(res.body.chatSession).toBeDefined();
        
        const queueCount = await Queue.countDocuments();
        expect(queueCount).toBe(0);
    });
});
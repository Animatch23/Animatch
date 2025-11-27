import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../server.js';
import ChatSession from '../models/ChatSession.js';
import User from '../models/User.js';
import Queue from '../models/Queue.js';
import { connectTestDB, disconnectTestDB } from '../utils/testDb.js';

beforeAll(async () => {
    await connectTestDB();
});

afterAll(async () => {
    await disconnectTestDB();
});

describe('Block User Feature', () => {
    let user1, user2, user3;
    let token1, token2, token3;
    let chatSession;

    beforeEach(async () => {
        // Create actual users in database
        user1 = await User.create({
            email: 'user1@test.com',
            username: 'user1',
            course: 'Computer Science' // Add course for matching score
        });
        user2 = await User.create({
            email: 'user2@test.com',
            username: 'user2',
            course: 'Computer Science' // Add course for matching score
        });
        user3 = await User.create({
            email: 'user3@test.com',
            username: 'user3',
            course: 'Computer Science' // Add course for matching score
        });

        // Generate JWT tokens for each user
        token1 = jwt.sign(
            { email: user1.email, name: user1.username },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );
        token2 = jwt.sign(
            { email: user2.email, name: user2.username },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );
        token3 = jwt.sign(
            { email: user3.email, name: user3.username },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );

        // Create active chat between user1 and user2
        chatSession = await ChatSession.create({
            participants: [user1._id, user2._id],
            active: true,
            expiresAt: new Date(Date.now() + 3600000)
        });
    });

    afterEach(async () => {
        await ChatSession.deleteMany({});
        await User.deleteMany({});
        await Queue.deleteMany({});
    });

    // --- Test 1: Block User ---
    it('should allow a user to block another user', async () => {
        const res = await request(app)
            .post('/api/chat/block')
            .set('Authorization', `Bearer ${token1}`)
            .send({ userIdToBlock: user2._id });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('User blocked successfully');

        // Verify user1 has user2 in blockedUsers
        const updatedUser1 = await User.findById(user1._id);
        expect(updatedUser1.blockedUsers).toHaveLength(1);
        expect(updatedUser1.blockedUsers[0].toString()).toBe(user2._id.toString());
    });

    // --- Test 2: Blocking ends active chat ---
    it('should end active chat when user is blocked', async () => {
        const res = await request(app)
            .post('/api/chat/block')
            .set('Authorization', `Bearer ${token1}`)
            .send({ userIdToBlock: user2._id });

        expect(res.status).toBe(200);

        // Verify chat is ended
        const updatedChat = await ChatSession.findById(chatSession._id);
        expect(updatedChat.active).toBe(false);
        expect(updatedChat.endedAt).toBeDefined();
    });

    // --- Test 3: Cannot block self ---
    it('should not allow blocking self', async () => {
        const res = await request(app)
            .post('/api/chat/block')
            .set('Authorization', `Bearer ${token1}`)
            .send({ userIdToBlock: user1._id });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Cannot block yourself');
    });

    // --- Test 4: Matchmaking excludes blocked users ---
    it('should exclude blocked users from matchmaking', async () => {
        // Clear active chat first
        await ChatSession.deleteMany({});

        // User 1 blocks User 2
        await User.findByIdAndUpdate(user1._id, {
            $addToSet: { blockedUsers: user2._id }
        });

        // User 2 joins queue
        await request(app)
            .post('/api/chat/queue/join')
            .set('Authorization', `Bearer ${token2}`);

        // User 1 joins queue
        const res = await request(app)
            .post('/api/chat/queue/join')
            .set('Authorization', `Bearer ${token1}`);

        // Should NOT match with User 2
        expect(res.body.matched).toBe(false);
        expect(res.body.queued).toBe(true);

        // User 3 joins queue
        const res3 = await request(app)
            .post('/api/chat/queue/join')
            .set('Authorization', `Bearer ${token3}`);

        // Should match with User 2 (since User 2 was waiting first)
        expect(res3.body.matched).toBe(true);
        
        // Verify match is between User 3 and User 2
        const chat = await ChatSession.findById(res3.body.chatSessionId);
        const participants = chat.participants.map(p => p.toString());
        expect(participants).toContain(user2._id.toString());
        expect(participants).toContain(user3._id.toString());
        expect(participants).not.toContain(user1._id.toString());
    });

    // --- Test 5: Matchmaking excludes users who blocked me ---
    it('should exclude users who blocked me from matchmaking', async () => {
        // Clear active chat first
        await ChatSession.deleteMany({});

        // User 2 blocks User 1
        await User.findByIdAndUpdate(user2._id, {
            $addToSet: { blockedUsers: user1._id }
        });

        // User 2 joins queue
        await request(app)
            .post('/api/chat/queue/join')
            .set('Authorization', `Bearer ${token2}`);

        // User 1 joins queue
        const res = await request(app)
            .post('/api/chat/queue/join')
            .set('Authorization', `Bearer ${token1}`);

        // Should NOT match with User 2
        expect(res.body.matched).toBe(false);
        expect(res.body.queued).toBe(true);
    });
});

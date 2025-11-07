import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import ChatSession from '../models/ChatSession.js';

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL);
});

afterAll(async () => {
    await mongoose.disconnect();
});

describe('POST /api/chat/:sessionId/save', () => {
    let user1Id, user2Id, user3Id;
    let cookie1, cookie2, cookie3;
    let chatSession;

    beforeEach(async () => {
        user1Id = new mongoose.Types.ObjectId().toHexString();
        user2Id = new mongoose.Types.ObjectId().toHexString();
        user3Id = new mongoose.Types.ObjectId().toHexString();

        
        cookie1 = `uid=${user1Id}`;
        cookie2 = `uid=${user2Id}`;
        cookie3 = `uid=${user3Id}`;

        chatSession = await ChatSession.create({
        participants: [user1Id, user2Id],
        active: true,
        });
    });

    afterEach(async () => {
        await ChatSession.deleteMany({});
    });

    // --- Test 1: Happy Path - Mutual Save ---
    it('should allow two users to mutually save a chat', async () => {
        const sessionId = chatSession._id.toHexString();

        // User 1 saves
        const res1 = await request(app)
        .post(`/api/chat/${sessionId}/save`)
        .set('Cookie', cookie1);
        
        // Check User 1's save
        expect(res1.status).toBe(200);
        expect(res1.body.chat.savedBy).toHaveLength(1);
        expect(res1.body.chat.savedBy[0]).toBe(user1Id);
        expect(res1.body.chat.isSaved).toBe(false);

        // User 2 saves
        const res2 = await request(app)
        .post(`/api/chat/${sessionId}/save`)
        .set('Cookie', cookie2);

        // Check User 2's save (mutual)
        expect(res2.status).toBe(200);
        expect(res2.body.chat.savedBy).toHaveLength(2);
        expect(res2.body.chat.savedBy).toContain(user1Id);
        expect(res2.body.chat.savedBy).toContain(user2Id);
        expect(res2.body.chat.isSaved).toBe(true);

        // Final check in DB
        const finalChat = await ChatSession.findById(sessionId);
        expect(finalChat.isSaved).toBe(true);
    });

    // --- Test 2: Failure Case - Not a Participant ---
    it('should return 403 if user is not in the chat', async () => {
        const sessionId = chatSession._id.toHexString();

        // User 3 (who is not a participant) tries to save
        const res = await request(app)
        .post(`/api/chat/${sessionId}/save`)
        .set('Cookie', cookie3);

        expect(res.status).toBe(403);
        expect(res.body.msg).toBe('User not authorized for this chat');
    });

    // --- Test 3: Failure Case - Chat Not Found ---
    it('should return 404 if chat session is not found', async () => {
        const fakeSessionId = new mongoose.Types.ObjectId().toHexString();

        const res = await request(app)
        .post(`/api/chat/${fakeSessionId}/save`)
        .set('Cookie', cookie1);

        expect(res.status).toBe(404);
        expect(res.body.msg).toBe('Chat session not found');
    });

    // --- Test 4: Check if ensureUser creates a cookie (optional but good) ---
    it('should return 404 but still set a cookie if one is not provided', async () => {
        const fakeSessionId = new mongoose.Types.ObjectId().toHexString();

        const res = await request(app)
        .post(`/api/chat/${fakeSessionId}/save`);

        expect(res.status).toBe(404);
        
        // Check if the 'Set-Cookie' header is present
        expect(res.headers['set-cookie']).toBeDefined();
        expect(res.headers['set-cookie'][0]).toContain('uid=');
    });
});
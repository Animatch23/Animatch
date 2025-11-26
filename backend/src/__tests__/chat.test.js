import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../server.js';
import ChatSession from '../models/ChatSession.js';
import User from '../models/User.js';
import { connectTestDB, disconnectTestDB } from '../utils/testDb.js';

beforeAll(async () => {
    await connectTestDB();
});

afterAll(async () => {
    await disconnectTestDB();
});

describe('POST /api/chat/:sessionId/save', () => {
    let user1, user2, user3;
    let token1, token2, token3;
    let chatSession;

    beforeEach(async () => {
        // Create actual users in database
        user1 = await User.create({
            email: 'user1@test.com',
            username: 'user1'
        });
        user2 = await User.create({
            email: 'user2@test.com',
            username: 'user2'
        });
        user3 = await User.create({
            email: 'user3@test.com',
            username: 'user3'
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

        chatSession = await ChatSession.create({
            participants: [user1._id, user2._id],
            active: true,
        });
    });

    afterEach(async () => {
        await ChatSession.deleteMany({});
        await User.deleteMany({});
    });

    // --- Test 1: Happy Path - Mutual Save ---
    it('should allow two users to mutually save a chat', async () => {
        const sessionId = chatSession._id.toHexString();

        // User 1 saves
        const res1 = await request(app)
            .post(`/api/chat/${sessionId}/save`)
            .set('Authorization', `Bearer ${token1}`);
        
        // Check User 1's save
        expect(res1.status).toBe(200);
        expect(res1.body.chat.savedByUsers).toHaveLength(1);
        expect(res1.body.chat.savedByUsers[0].toString()).toBe(user1._id.toString());
        expect(res1.body.chat.isSaved).toBe(false);

        // User 2 saves
        const res2 = await request(app)
            .post(`/api/chat/${sessionId}/save`)
            .set('Authorization', `Bearer ${token2}`);

        // Check User 2's save (mutual)
        expect(res2.status).toBe(200);
        expect(res2.body.chat.savedByUsers).toHaveLength(2);
        expect(res2.body.chat.isSaved).toBe(true);

        // Final check in DB
        const finalChat = await ChatSession.findById(sessionId);
        expect(finalChat.isSaved).toBe(true);
    });

    // --- Test 2: Failure Case - Not a Participant ---
    it('should return 404 if user is not in the chat', async () => {
        const sessionId = chatSession._id.toHexString();

        // User 3 (who is not a participant) tries to save
        const res = await request(app)
            .post(`/api/chat/${sessionId}/save`)
            .set('Authorization', `Bearer ${token3}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Chat session not found');
    });

    // --- Test 3: Failure Case - Chat Not Found ---
    it('should return 404 if chat session is not found', async () => {
        const fakeSessionId = new mongoose.Types.ObjectId().toHexString();

        const res = await request(app)
            .post(`/api/chat/${fakeSessionId}/save`)
            .set('Authorization', `Bearer ${token1}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Chat session not found');
    });

    // --- Test 4: Authentication Required ---
    it('should return 401 if no token is provided', async () => {
        const fakeSessionId = new mongoose.Types.ObjectId().toHexString();

        const res = await request(app)
            .post(`/api/chat/${fakeSessionId}/save`);

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Authentication required');
    });

    // --- Test 5: Idempotency - Same User Saves Twice ---
    it('should not duplicate the save vote if the same user clicks save twice', async () => {
        const sessionId = chatSession._id.toHexString();

        // User 1 saves first time
        await request(app)
            .post(`/api/chat/${sessionId}/save`)
            .set('Authorization', `Bearer ${token1}`);

        // User 1 saves second time
        const res = await request(app)
            .post(`/api/chat/${sessionId}/save`)
            .set('Authorization', `Bearer ${token1}`);

        expect(res.status).toBe(200);
        // Should still only be 1 save, not 2
        expect(res.body.chat.savedByUsers).toHaveLength(1);
        expect(res.body.chat.savedByUsers[0].toString()).toBe(user1._id.toString());
        expect(res.body.chat.isSaved).toBe(false);
    });

    // --- Test 6: Saving Inactive Chat ---
    it('should allow saving even if the chat is no longer active', async () => {
        const sessionId = chatSession._id.toHexString();

        // Manually set chat to inactive in DB
        chatSession.active = false;
        await chatSession.save();

        // Verify chat is inactive
        const inactiveChat = await ChatSession.findById(sessionId);
        expect(inactiveChat.active).toBe(false);

        // User should still be able to save the chat
        const res = await request(app)
            .post(`/api/chat/${sessionId}/save`)
            .set('Authorization', `Bearer ${token1}`);

        expect(res.status).toBe(200);
        expect(res.body.chat.savedByUsers).toHaveLength(1);
    });
});
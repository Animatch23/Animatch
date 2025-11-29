import request from 'supertest';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { connectTestDB, disconnectTestDB, clearDatabase } from '../../utils/testDb.js';
import app from '../../server.js';
import User from '../../models/User.js';
import ChatSession from '../../models/ChatSession.js';
import jwt from 'jsonwebtoken';

// Helper function to generate valid JWT token
const generateToken = (userId, email) => {
    return jwt.sign({ id: userId, email }, process.env.JWT_SECRET || 'test_secret');
};

describe('Chat History and Unmatch API Tests', () => {
    let user1, user2, chatSession;

    beforeAll(async () => {
        await connectTestDB();
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    beforeEach(async () => {
        await clearDatabase();

        // Create test users
        user1 = new User({
            email: 'user1@example.com',
            username: 'user1',
            termsAccepted: true,
            termsAcceptedDate: new Date(),
            termsAcceptedVersion: '1.0'
        });
        await user1.save();

        user2 = new User({
            email: 'user2@example.com',
            username: 'user2',
            termsAccepted: true,
            termsAcceptedDate: new Date(),
            termsAcceptedVersion: '1.0'
        });
        await user2.save();

        // Create a test chat session (must be saved to appear in history)
        chatSession = new ChatSession({
            participants: [user1._id, user2._id],
            active: true,
            isSaved: true,
            savedByUsers: [user1._id, user2._id],
            startedAt: new Date()
        });
        await chatSession.save();
    });

    describe('GET /api/chat/history', () => {
        test('should return saved chats with active status and partner details correctly populated', async () => {
            const token = generateToken(user1._id, user1.email);

            const response = await request(app)
                .get('/api/chat/history')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);

            const chat = response.body[0];
            expect(chat).toHaveProperty('_id', chatSession._id.toString());
            expect(chat).toHaveProperty('active', true);
            expect(chat).toHaveProperty('participants');
            expect(chat.participants).toHaveLength(2);

            // Check that participants are populated with user details
            const participantUsernames = chat.participants.map(p => p.username);
            expect(participantUsernames).toContain('user1');
            expect(participantUsernames).toContain('user2');

            // Should not include messages for performance
            expect(chat).not.toHaveProperty('messages');
        });
    });

    describe('POST /api/chat/:chatSessionId/unmatch', () => {
        test('should verify user is a participant', async () => {
            const nonParticipant = new User({
                email: 'nonparticipant@example.com',
                username: 'nonparticipant',
                termsAccepted: true,
                termsAcceptedDate: new Date(),
                termsAcceptedVersion: '1.0'
            });
            await nonParticipant.save();

            const token = generateToken(nonParticipant._id, nonParticipant.email);

            const response = await request(app)
                .post(`/api/chat/${chatSession._id}/unmatch`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error', 'Not authorized to unmatch this chat');
        });

        test('should set active: false and endedAt', async () => {
            const token = generateToken(user1._id, user1.email);

            const response = await request(app)
                .post(`/api/chat/${chatSession._id}/unmatch`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);

            // Check database
            const updatedChat = await ChatSession.findById(chatSession._id);
            expect(updatedChat.active).toBe(false);
            expect(updatedChat.endedAt).toBeDefined();
            expect(updatedChat.endedAt).toBeInstanceOf(Date);
        });

        test('should set unmatchedBy to the requester\'s ID', async () => {
            const token = generateToken(user1._id, user1.email);

            const response = await request(app)
                .post(`/api/chat/${chatSession._id}/unmatch`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);

            // Check database
            const updatedChat = await ChatSession.findById(chatSession._id);
            expect(updatedChat.unmatchedBy.toString()).toBe(user1._id.toString());
        });

        test('should NOT delete the chat, and keep it visible in history (saved chats preserved)', async () => {
            const token = generateToken(user1._id, user1.email);

            const response = await request(app)
                .post(`/api/chat/${chatSession._id}/unmatch`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);

            // Check that chat still exists in the database (data is preserved)
            const chatExists = await ChatSession.findById(chatSession._id);
            expect(chatExists).toBeTruthy();
            expect(chatExists.active).toBe(false);
            expect(chatExists.unmatchedBy).toBeDefined();

            // The saved chat should still appear in history (saved chats are always preserved)
            const historyToken = generateToken(user1._id, user1.email);
            const historyResponse = await request(app)
                .get('/api/chat/history')
                .set('Authorization', `Bearer ${historyToken}`);

            expect(historyResponse.status).toBe(200);
            // Saved chats remain visible even after unmatching
            expect(historyResponse.body.length).toBe(1);
            expect(historyResponse.body[0]._id).toBe(chatSession._id.toString());
        });
    });
});
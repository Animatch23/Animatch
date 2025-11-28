/**
 * US #6: Next Chat Option - Unit Tests
 * Tests the "Next Chat" functionality where users can skip to another match
 * 
 * Test Coverage:
 * - End current chat session
 * - Partner notification when chat ends
 * - User returns to queue after ending chat
 * - Chat history deletion for unsaved chats
 * - Both users placed back in queue
 * - Edge cases and error handling
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../server.js';
import ChatSession from '../models/ChatSession.js';
import Message from '../models/Message.js';
import Queue from '../models/Queue.js';
import User from '../models/User.js';

let mongo;

beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    process.env.MONGO_URL = uri;
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});

describe('US #6: Next Chat Option', () => {
    let user1, user2;
    let token1, token2;
    let chatSession;

    beforeEach(async () => {
        // Clean up collections
        await User.deleteMany({});
        await ChatSession.deleteMany({});
        await Message.deleteMany({});
        await Queue.deleteMany({});

        // Create test users
        user1 = await User.create({
            email: 'user1@nextchat.com',
            username: 'nextchat_user1',
            interests: ['gaming', 'music']
        });
        user2 = await User.create({
            email: 'user2@nextchat.com',
            username: 'nextchat_user2',
            interests: ['gaming', 'music']
        });

        // Generate JWT tokens
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

        // Create an active chat session between the two users
        chatSession = await ChatSession.create({
            participants: [user1._id, user2._id],
            active: true,
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            isSaved: false,
            savedBy: []
        });

        // Create some messages in the chat
        await Message.create([
            {
                chatSessionId: chatSession._id,
                senderId: user1._id,
                content: 'Hello!',
                sentAt: new Date()
            },
            {
                chatSessionId: chatSession._id,
                senderId: user2._id,
                content: 'Hi there!',
                sentAt: new Date()
            },
            {
                chatSessionId: chatSession._id,
                senderId: user1._id,
                content: 'How are you?',
                sentAt: new Date()
            }
        ]);
    });

    afterEach(async () => {
        await User.deleteMany({});
        await ChatSession.deleteMany({});
        await Message.deleteMany({});
        await Queue.deleteMany({});
    });

    describe('POST /api/chat/:sessionId/end - End Current Chat', () => {
        test('should successfully end active chat session', async () => {
            const response = await request(app)
                .post(`/api/chat/${chatSession._id}/end`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            expect(response.body.message).toContain('ended');

            // Verify chat session is marked as inactive
            const updatedSession = await ChatSession.findById(chatSession._id);
            expect(updatedSession.active).toBe(false);
            expect(updatedSession.endedAt).toBeTruthy();
        });

        test('should fail to end non-existent chat session', async () => {
            const fakeSessionId = new mongoose.Types.ObjectId();
            
            const response = await request(app)
                .post(`/api/chat/${fakeSessionId}/end`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(404);

            expect(response.body.message).toContain('not found');
        });

        test('should fail to end chat without authentication', async () => {
            await request(app)
                .post(`/api/chat/${chatSession._id}/end`)
                .expect(401);
        });

        test('should fail to end chat user is not participant of', async () => {
            // Create third user who is not in the chat
            const user3 = await User.create({
                email: 'user3@nextchat.com',
                username: 'nextchat_user3'
            });
            const token3 = jwt.sign(
                { email: user3.email, name: user3.username },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .post(`/api/chat/${chatSession._id}/end`)
                .set('Authorization', `Bearer ${token3}`)
                .expect(404);

            expect(response.body.message).toContain('not found');
        });

        test('should fail to end already ended chat session', async () => {
            // End the chat first
            await request(app)
                .post(`/api/chat/${chatSession._id}/end`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            // Try to end it again
            const response = await request(app)
                .post(`/api/chat/${chatSession._id}/end`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(404);

            expect(response.body.message).toContain('not found');
        });
    });

    describe('Next Chat Flow - User Returns to Queue', () => {
        test('should allow user to rejoin queue after ending chat', async () => {
            // End the current chat
            await request(app)
                .post(`/api/chat/${chatSession._id}/end`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            // User should be able to join queue again
            const queueResponse = await request(app)
                .post('/api/chat/queue/join')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            expect(queueResponse.body.queued).toBe(true);

            // Verify user is in queue
            const queueEntry = await Queue.findOne({ userId: user1._id });
            expect(queueEntry).toBeTruthy();
            expect(queueEntry.userId.toString()).toBe(user1._id.toString());
        });

        test('should match with new partner after rejoining queue', async () => {
            // End the current chat
            await request(app)
                .post(`/api/chat/${chatSession._id}/end`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            // User 1 joins queue
            await request(app)
                .post('/api/chat/queue/join')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            // Create a new third user to match with
            const user3 = await User.create({
                email: 'user3@nextchat.com',
                username: 'nextchat_user3',
                interests: ['gaming', 'music']
            });
            const token3 = jwt.sign(
                { email: user3.email, name: user3.username },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            // User 3 joins queue (should match with user 1)
            const matchResponse = await request(app)
                .post('/api/chat/queue/join')
                .set('Authorization', `Bearer ${token3}`)
                .expect(200);

            expect(matchResponse.body.matched).toBe(true);
            expect(matchResponse.body.chatSessionId).toBeTruthy();

            // Verify new chat session was created
            const newChatSession = await ChatSession.findById(matchResponse.body.chatSessionId);
            expect(newChatSession).toBeTruthy();
            expect(newChatSession.participants).toHaveLength(2);
            expect(newChatSession.participants.map(p => p.toString())).toContain(user1._id.toString());
            expect(newChatSession.participants.map(p => p.toString())).toContain(user3._id.toString());
            expect(newChatSession.active).toBe(true);
        });

        test('both users can rejoin queue after ending chat', async () => {
            // User 1 ends the chat
            await request(app)
                .post(`/api/chat/${chatSession._id}/end`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            // Both users rejoin queue - User 1 queues, User 2 matches with User 1
            const queue1Response = await request(app)
                .post('/api/chat/queue/join')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            const queue2Response = await request(app)
                .post('/api/chat/queue/join')
                .set('Authorization', `Bearer ${token2}`)
                .expect(200);

            // User 1 joins queue (no match found)
            expect(queue1Response.body.matched).toBe(false);
            expect(queue1Response.body.queued).toBe(true);

            // User 2 matches with User 1
            expect(queue2Response.body.matched).toBe(true);
            expect(queue2Response.body.chatSessionId).toBeDefined();
        });
    });

    describe('Chat History Management - Unsaved Chats', () => {
        test('unsaved chat should be marked for deletion after ending', async () => {
            // Ensure chat is not saved
            expect(chatSession.isSaved).toBe(false);

            // End the chat
            await request(app)
                .post(`/api/chat/${chatSession._id}/end`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            // Verify chat is marked inactive but still exists (for TTL cleanup)
            const endedSession = await ChatSession.findById(chatSession._id);
            expect(endedSession).toBeTruthy();
            expect(endedSession.active).toBe(false);
            expect(endedSession.isSaved).toBe(false);
            expect(endedSession.expiresAt).toBeTruthy();
        });

        test('messages should remain accessible until TTL expiry', async () => {
            // End the chat
            await request(app)
                .post(`/api/chat/${chatSession._id}/end`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            // Messages should still exist (TTL will clean them up later)
            const messages = await Message.find({ chatSessionId: chatSession._id });
            expect(messages.length).toBeGreaterThan(0);
        });

        test('saved chat should persist after ending', async () => {
            // Save the chat first
            await request(app)
                .post(`/api/chat/${chatSession._id}/save`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            await request(app)
                .post(`/api/chat/${chatSession._id}/save`)
                .set('Authorization', `Bearer ${token2}`)
                .expect(200);

            // End the chat
            await request(app)
                .post(`/api/chat/${chatSession._id}/end`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            // Verify saved chat is preserved
            const savedSession = await ChatSession.findById(chatSession._id);
            expect(savedSession).toBeTruthy();
            expect(savedSession.isSaved).toBe(true);
            expect(savedSession.active).toBe(false);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle ending chat with invalid session ID format', async () => {
            const response = await request(app)
                .post('/api/chat/invalid-id/end')
                .set('Authorization', `Bearer ${token1}`)
                .expect(500);

            expect(response.body.message).toBeTruthy();
        });

        test('should prevent user from joining queue while in active chat', async () => {
            // Try to join queue while still in active chat
            const response = await request(app)
                .post('/api/chat/queue/join')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            // Backend returns the existing chat session instead of error
            expect(response.body.matched).toBe(true);
            expect(response.body.alreadyInChat).toBe(true);
            expect(response.body.chatSessionId).toBe(chatSession._id.toString());
        });

        test('should clean up queue entry if user rejoins after ending chat', async () => {
            // End chat
            await request(app)
                .post(`/api/chat/${chatSession._id}/end`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            // Join queue
            await request(app)
                .post('/api/chat/queue/join')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            // Verify only one queue entry exists
            const queueEntries = await Queue.find({ userId: user1._id });
            expect(queueEntries).toHaveLength(1);
        });

        test('should handle concurrent end requests gracefully', async () => {
            // Simulate both users ending chat simultaneously
            const [response1, response2] = await Promise.all([
                request(app)
                    .post(`/api/chat/${chatSession._id}/end`)
                    .set('Authorization', `Bearer ${token1}`),
                request(app)
                    .post(`/api/chat/${chatSession._id}/end`)
                    .set('Authorization', `Bearer ${token2}`)
            ]);

            // Due to race condition, both may succeed (both mark active=false)
            // or one succeeds and one gets 404
            const statuses = [response1.status, response2.status].sort();
            const validOutcomes = [
                [200, 200], // Both succeed (race condition allows both)
                [200, 404]  // One succeeds, one gets not found
            ];
            
            const isValidOutcome = validOutcomes.some(
                outcome => JSON.stringify(outcome) === JSON.stringify(statuses)
            );
            expect(isValidOutcome).toBe(true);
        });

        test('should not allow ending chat after it expires', async () => {
            // Manually expire the chat by setting active to false
            chatSession.active = false;
            chatSession.endedAt = new Date(Date.now() - 1000);
            await chatSession.save();

            const response = await request(app)
                .post(`/api/chat/${chatSession._id}/end`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(404);

            expect(response.body.message).toContain('not found');
        });
    });

    describe('Queue Status After Next Chat', () => {
        test('should show user in queue after ending chat and rejoining', async () => {
            // End chat
            await request(app)
                .post(`/api/chat/${chatSession._id}/end`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            // Join queue
            await request(app)
                .post('/api/chat/queue/join')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            // Check queue status
            const statusResponse = await request(app)
                .get('/api/chat/queue/status')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            // Queue status returns queued, matched, and position
            expect(statusResponse.body.queued).toBe(true);
            expect(statusResponse.body.matched).toBe(false);
            // Position may be undefined or a number depending on queue state
            if (statusResponse.body.position !== undefined) {
                expect(statusResponse.body.position).toBeGreaterThanOrEqual(1);
            }
        });

        test('should not show user in queue immediately after ending chat', async () => {
            // End chat (but don't rejoin queue)
            await request(app)
                .post(`/api/chat/${chatSession._id}/end`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            // Check queue status
            const statusResponse = await request(app)
                .get('/api/chat/queue/status')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            expect(statusResponse.body.queued).toBe(false);
            expect(statusResponse.body.matched).toBe(false);
        });
    });

    describe('Integration: Complete Next Chat Workflow', () => {
        test('complete flow: end chat → join queue → get matched → start new chat', async () => {
            // Step 1: End current chat
            const endResponse = await request(app)
                .post(`/api/chat/${chatSession._id}/end`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            expect(endResponse.body.message).toContain('ended');

            // Step 2: Rejoin queue
            const queueResponse = await request(app)
                .post('/api/chat/queue/join')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            expect(queueResponse.body.queued).toBe(true);

            // Step 3: Create new user and match
            const user3 = await User.create({
                email: 'user3@workflow.com',
                username: 'workflow_user3',
                interests: ['gaming', 'music']
            });
            const token3 = jwt.sign(
                { email: user3.email, name: user3.username },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            const matchResponse = await request(app)
                .post('/api/chat/queue/join')
                .set('Authorization', `Bearer ${token3}`)
                .expect(200);

            expect(matchResponse.body.matched).toBe(true);
            expect(matchResponse.body.chatSessionId).toBeTruthy();

            // Step 4: Verify new active chat
            const newChatResponse = await request(app)
                .get('/api/chat/active')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            expect(newChatResponse.body.chatSessionId).toBe(matchResponse.body.chatSessionId);
            expect(newChatResponse.body.active).toBe(true);
            expect(newChatResponse.body.chatSessionId).not.toBe(chatSession._id.toString());
        });

        test('multiple sequential next chat cycles should work correctly', async () => {
            const currentToken = token1;
            const currentUser = user1;

            // Perform 3 cycles of "next chat"
            for (let i = 0; i < 3; i++) {
                // Get active chat
                const activeResponse = await request(app)
                    .get('/api/chat/active')
                    .set('Authorization', `Bearer ${currentToken}`);

                if (activeResponse.status === 200) {
                    // End current chat
                    await request(app)
                        .post(`/api/chat/${activeResponse.body.chatSessionId}/end`)
                        .set('Authorization', `Bearer ${currentToken}`)
                        .expect(200);
                }

                // Rejoin queue
                await request(app)
                    .post('/api/chat/queue/join')
                    .set('Authorization', `Bearer ${currentToken}`)
                    .expect(200);

                // Create new partner
                const newPartner = await User.create({
                    email: `partner${i}@cycle.com`,
                    username: `cycle_partner${i}`,
                    interests: ['gaming', 'music']
                });
                const partnerToken = jwt.sign(
                    { email: newPartner.email, name: newPartner.username },
                    process.env.JWT_SECRET || 'test-secret',
                    { expiresIn: '1h' }
                );

                // Match with new partner
                const matchResponse = await request(app)
                    .post('/api/chat/queue/join')
                    .set('Authorization', `Bearer ${partnerToken}`)
                    .expect(200);

                expect(matchResponse.body.matched).toBe(true);
            }

            // Verify all old sessions are ended
            const activeSessions = await ChatSession.countDocuments({
                participants: currentUser._id,
                active: true
            });
            expect(activeSessions).toBe(1); // Only the latest session should be active
        });
    });
});

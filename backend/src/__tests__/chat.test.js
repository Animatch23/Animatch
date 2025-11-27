import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../server.js';
import ChatSession from '../models/ChatSession.js';
import User from '../models/User.js';
import Message from '../models/Message.js';

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL);
});

afterAll(async () => {
    await mongoose.disconnect();
});

// Helper function to generate JWT tokens for testing
const generateToken = (userId, email) => {
    return jwt.sign({ id: userId, email }, process.env.JWT_SECRET);
};

describe('POST /api/chat/:sessionId/save', () => {
    let user1, user2, user3;
    let user1Id, user2Id, user3Id;
    let token1, token2, token3;
    let chatSession;

    beforeEach(async () => {
        user1Id = new mongoose.Types.ObjectId().toHexString();
        user2Id = new mongoose.Types.ObjectId().toHexString();
        user3Id = new mongoose.Types.ObjectId().toHexString();

        await User.create([
            { _id: user1Id, username: 'user1', email: 'user1@test.com' },
            { _id: user2Id, username: 'user2', email: 'user2@test.com' },
            { _id: user3Id, username: 'user3', email: 'user3@test.com' },
        ]);

        token1 = generateToken(user1Id, 'user1@test.com');
        token2 = generateToken(user2Id, 'user2@test.com');
        token3 = generateToken(user3Id, 'user3@test.com');

        chatSession = await ChatSession.create({
            participants: [user1Id, user2Id],
            active: true,
        });
    });

    afterEach(async () => {
        await ChatSession.deleteMany({});
        await User.deleteMany({});
        await Message.deleteMany({});
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
        expect(res1.body.chat.savedByUsers[0].toString()).toBe(user1Id.toString());
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
        expect(res.body.chat.savedByUsers[0].toString()).toBe(user1Id.toString());
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

describe('GET /api/chat/history', () => {

    let savedChat1, savedChat2, unsavedChat, inactiveSavedChat;
    let user1Id, user2Id, user3Id;
    let token1, token2, token3;

    beforeEach(async () => {
        user1Id = new mongoose.Types.ObjectId().toHexString();
        user2Id = new mongoose.Types.ObjectId().toHexString();
        user3Id = new mongoose.Types.ObjectId().toHexString();

        await User.create([
            { _id: user1Id, username: 'user1', email: 'user1@test.com' },
            { _id: user2Id, username: 'user2', email: 'user2@test.com' },
            { _id: user3Id, username: 'user3', email: 'user3@test.com' },
        ]);

        token1 = generateToken(user1Id, 'user1@test.com');
        token2 = generateToken(user2Id, 'user2@test.com');
        token3 = generateToken(user3Id, 'user3@test.com');

        // 1. A saved, active chat between User 1 and User 2
        savedChat1 = await ChatSession.create({
            participants: [user1Id, user2Id],
            isSaved: true,
            active: true,
            endedAt: new Date(),
        });

        // 2. An active, *unsaved* chat between User 1 and User 3
        unsavedChat = await ChatSession.create({
            participants: [user1Id, user3Id],
            isSaved: false,
            active: true,
        });

        // 3. Another saved, active chat between User 2 and User 3
        savedChat2 = await ChatSession.create({
            participants: [user2Id, user3Id],
            isSaved: true,
            active: true,
            endedAt: new Date(),
        });

        // 4. A saved but INACTIVE chat (should still show up per US #8)
        inactiveSavedChat = await ChatSession.create({
            participants: [user1Id, user2Id],
            isSaved: true,
            active: false,
            endedAt: new Date(Date.now() - 86400000), // 1 day ago
        });
    });

    afterEach(async () => {
        await ChatSession.deleteMany({});
        await User.deleteMany({});
        await Message.deleteMany({});
    });

    it('should return only saved chats for a user', async () => {
        const res = await request(app)
            .get('/api/chat/history')
            .set('Authorization', `Bearer ${token1}`);

        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThanOrEqual(1);
        // Should include both savedChat1 and inactiveSavedChat
        const chatIds = res.body.map(c => c._id);
        expect(chatIds).toContain(savedChat1._id.toHexString());
        // All returned chats should be saved
        res.body.forEach(chat => {
            expect(chat.isSaved).toBe(true);
        });
    });

    it('should return saved chats regardless of active status', async () => {
        const res = await request(app)
            .get('/api/chat/history')
            .set('Authorization', `Bearer ${token1}`);

        expect(res.status).toBe(200);
        // Should include inactive saved chat
        const chatIds = res.body.map(c => c._id);
        expect(chatIds).toContain(inactiveSavedChat._id.toHexString());
    });

    it('should return all saved chats for a user with multiple', async () => {
        const res = await request(app)
            .get('/api/chat/history')
            .set('Authorization', `Bearer ${token2}`);

        expect(res.status).toBe(200);
        // User2 is in savedChat1, savedChat2, and inactiveSavedChat
        expect(res.body).toHaveLength(3);
    });

    it('should return an empty array for a user with no saved chats', async () => {
        // Create a new user with no saved chats
        const user4Id = new mongoose.Types.ObjectId().toHexString();
        await User.create({ _id: user4Id, username: 'user4', email: 'user4@test.com' });
        const token4 = generateToken(user4Id, 'user4@test.com');

        const res = await request(app)
            .get('/api/chat/history')
            .set('Authorization', `Bearer ${token4}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(0);
    });

    it('should not include the messages array in the history list', async () => {
        const res = await request(app)
            .get('/api/chat/history')
            .set('Authorization', `Bearer ${token1}`);

        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].messages).toBeUndefined();
    });

    // NEW TESTS FOR LAST MESSAGE FEATURE (US #8)
    it('should include lastMessage with text content', async () => {
        // Add messages to savedChat1
        await Message.create({
            chatSessionId: savedChat1._id,
            senderId: user1Id,
            content: 'Hello there!',
            sentAt: new Date(Date.now() - 5000)
        });
        await Message.create({
            chatSessionId: savedChat1._id,
            senderId: user2Id,
            content: 'Hi back!',
            sentAt: new Date()
        });

        const res = await request(app)
            .get('/api/chat/history')
            .set('Authorization', `Bearer ${token1}`);

        expect(res.status).toBe(200);
        const chat = res.body.find(c => c._id === savedChat1._id.toHexString());
        expect(chat).toBeDefined();
        expect(chat.lastMessage).toBeDefined();
        expect(chat.lastMessage.content).toBe('Hi back!');
        expect(chat.lastMessage.senderUsername).toBe('user2');
        expect(chat.lastMessage.isOwn).toBe(false); // user2 sent it, user1 viewing
        expect(chat.lastMessage.type).toBe('text');
        expect(chat.lastMessage.sentAt).toBeTruthy();
    });

    it('should mark lastMessage.isOwn=true when current user sent it', async () => {
        await Message.create({
            chatSessionId: savedChat1._id,
            senderId: user1Id,
            content: 'My message',
            sentAt: new Date()
        });

        const res = await request(app)
            .get('/api/chat/history')
            .set('Authorization', `Bearer ${token1}`);

        expect(res.status).toBe(200);
        const chat = res.body.find(c => c._id === savedChat1._id.toHexString());
        expect(chat.lastMessage.isOwn).toBe(true); // user1 sent it, user1 viewing
    });

    it('should detect attachment type for file paths', async () => {
        await Message.create({
            chatSessionId: savedChat1._id,
            senderId: user1Id,
            content: '/uploads/profiles/image123.jpg',
            sentAt: new Date()
        });

        const res = await request(app)
            .get('/api/chat/history')
            .set('Authorization', `Bearer ${token1}`);

        expect(res.status).toBe(200);
        const chat = res.body.find(c => c._id === savedChat1._id.toHexString());
        expect(chat.lastMessage.type).toBe('attachment');
    });

    it('should detect attachment type for HTTP URLs', async () => {
        await Message.create({
            chatSessionId: savedChat1._id,
            senderId: user2Id,
            content: 'https://example.com/file.pdf',
            sentAt: new Date()
        });

        const res = await request(app)
            .get('/api/chat/history')
            .set('Authorization', `Bearer ${token1}`);

        expect(res.status).toBe(200);
        const chat = res.body.find(c => c._id === savedChat1._id.toHexString());
        expect(chat.lastMessage.type).toBe('attachment');
    });

    it('should handle chats with no messages gracefully', async () => {
        // savedChat2 has no messages
        const res = await request(app)
            .get('/api/chat/history')
            .set('Authorization', `Bearer ${token2}`);

        expect(res.status).toBe(200);
        const chat = res.body.find(c => c._id === savedChat2._id.toHexString());
        expect(chat).toBeDefined();
        expect(chat.lastMessage).toBeUndefined();
    });

    it('should return most recent message when multiple exist', async () => {
        const oldDate = new Date(Date.now() - 10000);
        const newDate = new Date();

        await Message.create({
            chatSessionId: savedChat1._id,
            senderId: user1Id,
            content: 'Old message',
            sentAt: oldDate
        });
        await Message.create({
            chatSessionId: savedChat1._id,
            senderId: user2Id,
            content: 'New message',
            sentAt: newDate
        });

        const res = await request(app)
            .get('/api/chat/history')
            .set('Authorization', `Bearer ${token1}`);

        expect(res.status).toBe(200);
        const chat = res.body.find(c => c._id === savedChat1._id.toHexString());
        expect(chat.lastMessage.content).toBe('New message');
    });
});

describe('GET /api/chat/:sessionId', () => {

    let savedChat, unsavedChat;
    let user1Id, user2Id, user3Id;
    let token1, token2, token3;

    beforeEach(async () => {
        user1Id = new mongoose.Types.ObjectId().toHexString();
        user2Id = new mongoose.Types.ObjectId().toHexString();
        user3Id = new mongoose.Types.ObjectId().toHexString();

        await User.create([
            { _id: user1Id, username: 'user1', email: 'user1@test.com' },
            { _id: user2Id, username: 'user2', email: 'user2@test.com' },
            { _id: user3Id, username: 'user3', email: 'user3@test.com' },
        ]);

        token1 = generateToken(user1Id, 'user1@test.com');
        token2 = generateToken(user2Id, 'user2@test.com');
        token3 = generateToken(user3Id, 'user3@test.com');

        // Create one saved chat and one unsaved chat
        savedChat = await ChatSession.create({
            participants: [user1Id, user2Id],
            isSaved: true,
            active: false,
            messages: [{ sender: user1Id, text: 'Hello' }]
        });

        unsavedChat = await ChatSession.create({
            participants: [user1Id, user3Id],
            isSaved: false,
            active: true,
            messages: [{ sender: user1Id, text: 'Hey' }]
        });
    });

    afterEach(async () => {
        await ChatSession.deleteMany({});
        await User.deleteMany({});
        await Message.deleteMany({});
    });

    it('should return the full chat session if saved and participant', async () => {
        const res = await request(app)
            .get(`/api/chat/${savedChat._id.toHexString()}`)
            .set('Authorization', `Bearer ${token1}`);

        expect(res.status).toBe(200);
        expect(res.body._id).toBe(savedChat._id.toHexString());
        expect(res.body.isSaved).toBe(true);
        expect(res.body.participants).toBeDefined();
        expect(res.body.participants).toHaveLength(2);
        // Note: Messages come from the Message collection via /api/chat/:sessionId/history endpoint
    });

    it('should return 403 if user is not a participant', async () => {
        const res = await request(app)
            .get(`/api/chat/${savedChat._id.toHexString()}`)
            .set('Authorization', `Bearer ${token3}`);

        expect(res.status).toBe(403);
        expect(res.body.msg).toBe('User not authorized for this chat');
    });

    it('should return session data for active unsaved chats (200 OK)', async () => {
        const res = await request(app)
            .get(`/api/chat/${unsavedChat._id.toHexString()}`)
            .set('Authorization', `Bearer ${token1}`);

        expect(res.status).toBe(200);
        expect(res.body._id).toBe(unsavedChat._id.toHexString());
        expect(res.body.isSaved).toBe(false);
        expect(res.body.participants).toBeDefined();
    });

    it('should return 404 if the chat ID does not exist', async () => {
        const fakeId = new mongoose.Types.ObjectId().toHexString();
        const res = await request(app)
            .get(`/api/chat/${fakeId}`)
            .set('Authorization', `Bearer ${token1}`);

        expect(res.status).toBe(404);
    });
});
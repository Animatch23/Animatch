import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import ChatSession from '../models/ChatSession.js';
import User from '../models/User.js'

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

        await User.create([
            { _id: user1Id, username: 'user1' },
            { _id: user2Id, username: 'user2' },
            { _id: user3Id, username: 'user3' },
        ]);

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

describe('GET /api/chat/history', () => {

    let savedChat1, savedChat2, unsavedChat;
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

        await User.create([
            { _id: user1Id, username: 'user1' },
            { _id: user2Id, username: 'user2' },
            { _id: user3Id, username: 'user3' },
        ]);

        // 1. A saved chat between User 1 and User 2
        savedChat1 = await ChatSession.create({
        participants: [user1Id, user2Id],
        isSaved: true,
        active: false,
        endedAt: new Date(),
        messages: [
            { sender: user1Id, text: 'Hello' },
            { sender: user2Id, text: 'Hi' }
        ]
        });

        // 2. An active, *unsaved* chat between User 1 and User 3
        unsavedChat = await ChatSession.create({
        participants: [user1Id, user3Id],
        isSaved: false,
        active: true,
        messages: [{ sender: user1Id, text: 'Hey' }]
        });

        // 3. Another saved chat, between User 2 and User 3
        savedChat2 = await ChatSession.create({
        participants: [user2Id, user3Id],
        isSaved: true,
        active: false,
        endedAt: new Date(),
        messages: [{ sender: user2Id, text: 'Test' }]
        });
    });

    it('should return only saved chats for a user', async () => {
        const res = await request(app)
        .get('/api/chat/history')
        .set('Cookie', cookie1);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]._id).toBe(savedChat1._id.toHexString());
        expect(res.body[0].isSaved).toBe(true);
    });

    it('should return all saved chats for a user with multiple', async () => {
        const res = await request(app)
        .get('/api/chat/history')
        .set('Cookie', cookie2);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    it('should return an empty array for a user with no saved chats', async () => {
        // First, delete all chats
        await ChatSession.deleteMany({});
        
        const res = await request(app)
        .get('/api/chat/history')
        .set('Cookie', cookie1);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(0);
    });

    it('should not include the messages array in the history list', async () => {
        const res = await request(app)
        .get('/api/chat/history')
        .set('Cookie', cookie1);

        expect(res.status).toBe(200);
        expect(res.body[0].messages).toBeUndefined();
    });
});

describe('GET /api/chat/:sessionId', () => {

    let savedChat, unsavedChat;
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

        await User.create([
            { _id: user1Id, username: 'user1' },
            { _id: user2Id, username: 'user2' },
            { _id: user3Id, username: 'user3' },
        ]);

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

    it('should return the full chat session with messages if saved and participant', async () => {
        const res = await request(app)
        .get(`/api/chat/${savedChat._id.toHexString()}`)
        .set('Cookie', cookie1);

        expect(res.status).toBe(200);
        expect(res.body._id).toBe(savedChat._id.toHexString());
        expect(res.body.messages).toBeDefined();
        expect(res.body.messages).toHaveLength(1);
        expect(res.body.messages[0].text).toBe('Hello');
    });

    it('should return 403 if user is not a participant', async () => {
        const res = await request(app)
        .get(`/api/chat/${savedChat._id.toHexString()}`)
        .set('Cookie', cookie3);

        expect(res.status).toBe(403);
        expect(res.body.msg).toBe('User not authorized for this chat');
    });

    it('should return 403 if the chat is not saved', async () => {
        const res = await request(app)
        .get(`/api/chat/${unsavedChat._id.toHexString()}`)
        .set('Cookie', cookie1);

        expect(res.status).toBe(403);
        expect(res.body.msg).toBe('This chat has not been saved');
    });

    it('should return 404 if the chat ID does not exist', async () => {
        const fakeId = new mongoose.Types.ObjectId().toHexString();
        const res = await request(app)
        .get(`/api/chat/${fakeId}`)
        .set('Cookie', cookie1);

        expect(res.status).toBe(404);
    });
});
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

describe('POST /api/users/block/:userId', () => {

    let user1Id, user2Id, user3Id;
    let cookie1, cookie2;
    let activeChat;

    beforeEach(async () => {
        // 1. Create ObjectIds
        user1Id = new mongoose.Types.ObjectId();
        user2Id = new mongoose.Types.ObjectId();
        user3Id = new mongoose.Types.ObjectId();

        // 2. Create cookies
        cookie1 = `uid=${user1Id.toHexString()}`;
        cookie2 = `uid=${user2Id.toHexString()}`;

        // 3. Create the User documents
        await User.create([
            { _id: user1Id, username: 'user1', blockList: [] },
            { _id: user2Id, username: 'user2', blockList: [] },
            { _id: user3Id, username: 'user3', blockList: [] },
        ]);

        // 4. Create an active chat session between User 1 and User 2
        activeChat = await ChatSession.create({
            participants: [user1Id, user2Id],
            active: true,
            isSaved: false
        });
    });

    // --- Test 1: Happy Path ---
    it('should allow a user to block another user', async () => {
        const res = await request(app)
            .post(`/api/users/block/${user2Id.toHexString()}`)
            .set('Cookie', cookie1);

        expect(res.status).toBe(200);
        expect(res.body.msg).toBe('User blocked');

        const user1 = await User.findById(user1Id);
        expect(user1.blockList).toHaveLength(1);
        expect(user1.blockList[0].equals(user2Id)).toBe(true);

        const user2 = await User.findById(user2Id);
        expect(user2.blockList).toHaveLength(0);
    });

    // --- Test 2: Blocking ends an active chat ---
    it('should end any active chat session when a user is blocked', async () => {
        const chatBefore = await ChatSession.findById(activeChat._id);
        expect(chatBefore.active).toBe(true);

        const res = await request(app)
            .post(`/api/users/block/${user2Id.toHexString()}`)
            .set('Cookie', cookie1);

        expect(res.status).toBe(200);

        const chatAfter = await ChatSession.findById(activeChat._id);
        expect(chatAfter.active).toBe(false);
        expect(chatAfter.endedAt).toBeDefined();
    });

  // --- Test 3: Cannot block self ---
    it('should return a 400 error if a user tries to block themselves', async () => {
        const res = await request(app)
            .post(`/api/users/block/${user1Id.toHexString()}`)
            .set('Cookie', cookie1);

        expect(res.status).toBe(400);
        expect(res.body.msg).toBe('You cannot block yourself');

        const user1 = await User.findById(user1Id);
        expect(user1.blockList).toHaveLength(0);
    });

  // --- Test 4: Blocking a user who is already blocked ---
    it('should not add a duplicate user to the blockList', async () => {
        await request(app)
            .post(`/api/users/block/${user2Id.toHexString()}`)
            .set('Cookie', cookie1);
        
        const res = await request(app)
            .post(`/api/users/block/${user2Id.toHexString()}`)
            .set('Cookie', cookie1);
        
        expect(res.status).toBe(200);

        const user1 = await User.findById(user1Id);
        expect(user1.blockList).toHaveLength(1);
    });

  // --- Test 5: Unauthenticated request (new user) ---
    it('should return 404 if the user does not exist in the DB', async () => {
        const newUserIdCookie = `uid=${new mongoose.Types.ObjectId().toHexString()}`;
        
        const res = await request(app)
            .post(`/api/users/block/${user2Id.toHexString()}`)
            .set('Cookie', newUserIdCookie);

        expect(res.status).toBe(404); 
    });
});
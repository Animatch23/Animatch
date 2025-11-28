import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../server.js';
import ChatSession from '../../models/ChatSession.js';
import User from '../../models/User.js';
import Report from '../../models/Report.js';

beforeAll(async () => {
    // Force authMiddleware to use the DB path
    process.env.USE_REAL_DB = 'true';
    
    // Connect to the test database
    // In a Jest environment with @shelf/jest-mongodb, process.env.MONGO_URL is automatically set
    if (process.env.MONGO_URL) {
        await mongoose.connect(process.env.MONGO_URL);
    }
});

afterAll(async () => {
    await mongoose.disconnect();
});

describe('Report Routes', () => {
    let user1, user2;
    let token1, token2;
    let chatSession;

    beforeEach(async () => {
        // Clear collections
        await User.deleteMany({});
        await ChatSession.deleteMany({});
        await Report.deleteMany({});

        // Create users
        user1 = await User.create({
            email: 'reporter@test.com',
            username: 'reporter'
        });
        user2 = await User.create({
            email: 'reported@test.com',
            username: 'reported'
        });
        // user3 removed as it was unused

        // Generate tokens
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

        // Create a chat session between user1 and user2
        chatSession = await ChatSession.create({
            participants: [user1._id, user2._id],
            active: true,
        });
    });

    describe('POST /api/reports', () => {
        it('should successfully create a report', async () => {
            const reportData = {
                chatSessionId: chatSession._id,
                reason: 'Spam',
                description: 'User sent too many messages'
            };

            const res = await request(app)
                .post('/api/reports')
                .set('Authorization', `Bearer ${token1}`)
                .send(reportData);

            expect(res.status).toBe(201);
            expect(res.body.message).toBe('Report submitted successfully.');
            expect(res.body.report).toHaveProperty('_id');
            expect(res.body.report.reporterId).toBe(user1._id.toString());
            expect(res.body.report.reportedUserId).toBe(user2._id.toString());
            expect(res.body.report.reason).toBe('Spam');

            // Verify in DB
            const savedReport = await Report.findById(res.body.report._id);
            expect(savedReport).toBeTruthy();
            expect(savedReport.description).toBe('User sent too many messages');
        });

        it('should fail if chat session ID is missing', async () => {
            const reportData = {
                reason: 'Harassment'
            };

            const res = await request(app)
                .post('/api/reports')
                .set('Authorization', `Bearer ${token1}`)
                .send(reportData);

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Chat session ID and reason are required');
        });

        it('should fail if reason is missing', async () => {
            const reportData = {
                chatSessionId: chatSession._id
            };

            const res = await request(app)
                .post('/api/reports')
                .set('Authorization', `Bearer ${token1}`)
                .send(reportData);

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Chat session ID and reason are required');
        });

        it('should fail if chat session does not exist', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const reportData = {
                chatSessionId: fakeId,
                reason: 'Other'
            };

            const res = await request(app)
                .post('/api/reports')
                .set('Authorization', `Bearer ${token1}`)
                .send(reportData);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Chat session not found.');
        });

        it('should correctly identify the reported user', async () => {
            // User 2 reports User 1
            const reportData = {
                chatSessionId: chatSession._id,
                reason: 'Inappropriate Content'
            };

            const res = await request(app)
                .post('/api/reports')
                .set('Authorization', `Bearer ${token2}`)
                .send(reportData);

            expect(res.status).toBe(201);
            expect(res.body.report.reporterId).toBe(user2._id.toString());
            expect(res.body.report.reportedUserId).toBe(user1._id.toString());
        });
    });

    describe('GET /api/reports', () => {
        it('should return a list of reports', async () => {
            // Create a few reports first
            await Report.create({
                reporterId: user1._id,
                reportedUserId: user2._id,
                chatSessionId: chatSession._id,
                reason: 'Spam'
            });
            
            await Report.create({
                reporterId: user2._id,
                reportedUserId: user1._id,
                chatSessionId: chatSession._id,
                reason: 'Harassment'
            });

            const res = await request(app)
                .get('/api/reports')
                .set('Authorization', `Bearer ${token1}`); // Assuming any auth user can see reports for now

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body).toHaveLength(2);
            
            // Check if populated fields exist
            expect(res.body[0]).toHaveProperty('reporterId');
            expect(res.body[0].reporterId).toHaveProperty('username');
            expect(res.body[0]).toHaveProperty('reportedUserId');
            expect(res.body[0].reportedUserId).toHaveProperty('username');
        });

        it('should return 401 if not authenticated', async () => {
            const res = await request(app).get('/api/reports');
            expect(res.status).toBe(401);
        });
    });
});

import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../../server.js';
import Match from '../../models/Match.js';
import ChatSession from '../../models/ChatSession.js';
import User from '../../models/User.js';
import jwt from 'jsonwebtoken';
import { connectTestDB, disconnectTestDB, clearDatabase } from '../../utils/testDb.js';

describe('Unmatch Routes Integration Tests', () => {
    let user1Token;
    let user2Token;
    let user1;
    let user2;

    beforeAll(async () => {
        await connectTestDB();
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    beforeEach(async () => {
        await clearDatabase();

        // Create test users
        user1 = await User.create({
            email: 'user1@dlsu.edu.ph',
            username: 'testuser1'
        });

        user2 = await User.create({
            email: 'user2@dlsu.edu.ph',
            username: 'testuser2'
        });

        // Generate tokens
        user1Token = jwt.sign(
            { email: user1.email, username: user1.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        user2Token = jwt.sign(
            { email: user2.email, username: user2.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
    });

    describe('POST /api/unmatch', () => {
        it('should successfully unmatch with valid active session', async () => {
            // Create active match
            const match = await Match.create({
                user1: {
                    userId: user1.email,
                    username: user1.username
                },
                user2: {
                    userId: user2.email,
                    username: user2.username
                },
                status: 'active'
            });

            // Create chat session
            await ChatSession.create({
                participants: [user1.email, user2.email],
                active: true
            });

            const response = await request(app)
                .post('/api/unmatch')
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Successfully unmatched');
            expect(response.body.data).toHaveProperty('matchId');
            expect(response.body.data.partnerUsername).toBe('testuser2');

            // Verify match status in database
            const updatedMatch = await Match.findById(match._id);
            expect(updatedMatch.status).toBe('unmatched');
            expect(updatedMatch.unmatchedBy).toBe(user1.email);
        });

        it('should return 401 if user is not authenticated', async () => {
            const response = await request(app)
                .post('/api/unmatch')
                .expect(401);

            expect(response.body.message).toBe('Authentication required');
        });

        it('should return 404 if no active match exists', async () => {
            const response = await request(app)
                .post('/api/unmatch')
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('No active chat session found');
        });

        it('should work for user2 as initiator', async () => {
            await Match.create({
                user1: {
                    userId: user1.email,
                    username: user1.username
                },
                user2: {
                    userId: user2.email,
                    username: user2.username
                },
                status: 'active'
            });

            const response = await request(app)
                .post('/api/unmatch')
                .set('Authorization', `Bearer ${user2Token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.partnerUsername).toBe('testuser1');
        });

        it('should not unmatch already unmatched sessions', async () => {
            // Create already unmatched match
            await Match.create({
                user1: {
                    userId: user1.email,
                    username: user1.username
                },
                user2: {
                    userId: user2.email,
                    username: user2.username
                },
                status: 'unmatched',
                unmatchedBy: user1.email,
                unmatchedAt: new Date()
            });

            const response = await request(app)
                .post('/api/unmatch')
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(404);

            expect(response.body.message).toBe('No active chat session found');
        });
    });

    describe('GET /api/unmatch/history', () => {
        it('should return unmatch history for authenticated user', async () => {
            // Create unmatch history
            await Match.create([
                {
                    user1: { userId: user1.email, username: user1.username },
                    user2: { userId: user2.email, username: user2.username },
                    status: 'unmatched',
                    unmatchedBy: user1.email,
                    unmatchedAt: new Date()
                },
                {
                    user1: { userId: user1.email, username: user1.username },
                    user2: { userId: 'user3@dlsu.edu.ph', username: 'testuser3' },
                    status: 'unmatched',
                    unmatchedBy: 'user3@dlsu.edu.ph',
                    unmatchedAt: new Date()
                }
            ]);

            const response = await request(app)
                .get('/api/unmatch/history')
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.count).toBe(2);
            expect(response.body.history).toHaveLength(2);
            expect(response.body.history[0]).toHaveProperty('partnerUsername');
            expect(response.body.history[0]).toHaveProperty('wasInitiator');
        });

        it('should return 401 if not authenticated', async () => {
            const response = await request(app)
                .get('/api/unmatch/history')
                .expect(401);

            expect(response.body.message).toBe('Authentication required');
        });

        it('should return empty array if user has no unmatch history', async () => {
            const response = await request(app)
                .get('/api/unmatch/history')
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.count).toBe(0);
            expect(response.body.history).toEqual([]);
        });
    });
});

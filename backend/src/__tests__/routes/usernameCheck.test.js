import request from 'supertest';
import { connectTestDB, disconnectTestDB, clearDatabase } from '../../utils/testDb.js';
import app from '../../server.js';
import User from '../../models/User.js';

describe('Username Check API Tests', () => {
    beforeAll(async () => {
        await connectTestDB();
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    beforeEach(async () => {
        await clearDatabase();
    });

    describe('POST /api/upload/check-username', () => {
        test('should return isAvailable: false if username exists (case-insensitive)', async () => {
            // Create a user with username 'testuser'
            const user = new User({
                email: 'test@example.com',
                username: 'testuser',
                termsAccepted: true,
                termsAcceptedDate: new Date(),
                termsAcceptedVersion: '1.0'
            });
            await user.save();

            const response = await request(app)
                .post('/api/upload/check-username')
                .send({ username: 'TESTUSER' }); // Case-insensitive check

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('isAvailable', false);
        });

        test('should return isAvailable: true if username is new', async () => {
            const response = await request(app)
                .post('/api/upload/check-username')
                .send({ username: 'newuser' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('isAvailable', true);
        });

        test('should return 400 if username is missing/empty', async () => {
            const response = await request(app)
                .post('/api/upload/check-username')
                .send({}); // Missing username

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        test('should return 400 if username is empty string', async () => {
            const response = await request(app)
                .post('/api/upload/check-username')
                .send({ username: '' });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });
});
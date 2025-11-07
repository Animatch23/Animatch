import request from 'supertest';
import mongoose from 'mongoose';
import { jest } from '@jest/globals'; 
import { connectTestDB, disconnectTestDB, clearDatabase } from '../../utils/testDb.js';
import app from '../../server.js';
import User from '../../models/User.js';

describe('Terms Routes Integration Tests', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  }, 10000);

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/terms/accept', () => {
    it('should accept terms and conditions for a user', async () => {
      // Create a test user with username
      const user = await User.create({
        email: 'test@example.com',
        username: 'testuser' // Add username
      });

      const response = await request(app)
        .post('/api/terms/accept')
        .send({
          userId: user.email, // Use email, not _id
          version: '1.0'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.termsStatus.accepted).toBe(true);
      expect(response.body.termsStatus.version).toBe('1.0');

      // Verify database was updated
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.termsAccepted).toBe(true);
      expect(updatedUser.termsAcceptedVersion).toBe('1.0');
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .post('/api/terms/accept')
        .send({
          version: '1.0'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("User ID is required");
    });

    it('should return 404 if user not found', async () => {
      const response = await request(app)
        .post('/api/terms/accept')
        .send({
          userId: 'nonexistent@example.com',
          version: '1.0'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/terms/:userId', () => {
    it('should get terms status for a user', async () => {
      const user = await User.create({
        email: 'test@example.com',
        username: 'testuser',
        termsAccepted: true,
        termsAcceptedVersion: '1.0'
      });

      const response = await request(app)
        .get(`/api/terms/${user.email}`);

      expect(response.status).toBe(200);
      expect(response.body.termsAccepted).toBe(true);
      expect(response.body.termsAcceptedVersion).toBe('1.0');
    });

    it('should return 404 if user not found', async () => {
      const response = await request(app)
        .get('/api/terms/nonexistent@example.com');

      expect(response.status).toBe(404);
    });
  });
});
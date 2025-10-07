import request from 'supertest';
import mongoose from 'mongoose';
import { jest } from '@jest/globals'; 
import { connectTestDB, disconnectTestDB, clearDatabase } from '../../utils/testDb.js';
import app from '../../server.js';
import User from '../../models/userModel.js';

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
      // Create a test user
      const user = await User.create({
        email: 'test@example.com',
        // Add other required fields
      });

      const response = await request(app)
        .post('/api/terms/accept')
        .send({
          userId: user._id.toString(),
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

    // More tests...
  });

  describe('GET /api/terms/:userId', () => {
    // Tests for GET endpoint
  });

  afterAll(async () => {
    await disconnectTestDB();
  });
});
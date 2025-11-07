import mongoose from 'mongoose';
import { afterAll, jest } from '@jest/globals';
import { connectTestDB, disconnectTestDB, clearDatabase } from '../../utils/testDb.js';
import User from "./models/User.js";
import { acceptTerms, getTermsStatus } from '../../controllers/termsController.js';

describe('Terms Controller Tests', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('acceptTerms', () => {
    it('should update user with terms acceptance details', async () => {
      // Create a test user
      const user = await User.create({
        email: 'test@example.com',
        // Add other required fields
      });

      const req = {
        body: {
          userId: user._id.toString(),
          version: '1.0'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await acceptTerms(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Terms and conditions accepted",
          termsStatus: expect.objectContaining({
            accepted: true,
            version: '1.0'
          })
        })
      );

      // Verify database was updated
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.termsAccepted).toBe(true);
      expect(updatedUser.termsAcceptedVersion).toBe('1.0');
    });

    it('should return 400 if userId is missing', async () => {
      const req = {
        body: {}
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await acceptTerms(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User ID is required"
        })
      );
    });

    it('should return 404 if user is not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const req = {
        body: {
          userId: nonExistentId.toString()
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await acceptTerms(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getTermsStatus', () => {
    // Tests for getTermsStatus function
    // Similar to above tests
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

});
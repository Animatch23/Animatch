// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';

// For ES modules testing, we need to mock mongoose directly
import { jest } from '@jest/globals';
import mongoose from 'mongoose';

// Mock mongoose connect instead of mocking the module
const originalConnect = mongoose.connect;
mongoose.connect = jest.fn().mockImplementation(() => Promise.resolve());

// Restore original after tests
afterAll(async () => {
  mongoose.connect = originalConnect;
  await new Promise(resolve => setTimeout(resolve, 500)); 
});
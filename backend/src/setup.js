// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';

// For ES modules testing, we need to mock mongoose directly
import { jest } from '@jest/globals';
import mongoose from 'mongoose';

// Mock mongoose connect instead of mocking the module
const originalConnect = mongoose.connect;
mongoose.connect = jest.fn().mockImplementation(() => Promise.resolve());

// Global cleanup after all tests in each file
afterAll(async () => {
  // Restore original mongoose.connect
  mongoose.connect = originalConnect;
  
  // Close all mongoose connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  
  // Close all other mongoose connections if any
  await mongoose.disconnect();
  
  // Give time for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 500));
});
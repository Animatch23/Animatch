// Set environment variables for testing
process.env.NODE_ENV = 'test';

// Note: We don't mock mongoose.connect here because tests use MongoMemoryServer
// and need real database connections for integration testing.
// The testDb.js utility provides connectTestDB() and disconnectTestDB() helpers
// that properly manage the in-memory MongoDB instance.

import { jest } from '@jest/globals';

// Clean up after tests
afterAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 500)); 
});
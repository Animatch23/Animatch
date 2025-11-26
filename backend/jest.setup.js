/**
 * Jest setup file - runs after test environment is set up
 * Ensures all resources are properly closed after tests
 */
import mongoose from 'mongoose';

// Global cleanup after ALL tests in each file
afterAll(async () => {
  try {
    // Close mongoose connection if open
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      await mongoose.disconnect();
    }
  } catch (err) {
    // Ignore errors during cleanup
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error closing mongoose:', err);
    }
  }

  try {
    // Close server started by start.js (if any)
    if (global.__SERVER__ && typeof global.__SERVER__.close === 'function') {
      await new Promise((resolve) => {
        global.__SERVER__.close(() => {
          resolve();
        });
      });
      global.__SERVER__ = null;
    }
  } catch (err) {
    // Ignore errors during cleanup
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error closing server:', err);
    }
  }

  try {
    // Close Socket.IO if present
    if (global.__IO__ && typeof global.__IO__.close === 'function') {
      await new Promise((resolve) => {
        global.__IO__.close(() => {
          resolve();
        });
      });
      global.__IO__ = null;
    }
  } catch (err) {
    // Ignore errors during cleanup
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error closing Socket.IO:', err);
    }
  }

  // Give time for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});

import mongoose from 'mongoose';
import { stopServer } from './server.js';

/**
 * Global teardown - ensures all resources are closed after all tests finish
 */
export default async function globalTeardown() {
  console.log('[TEARDOWN] Cleaning up test resources...');

  try {
    // Stop the server if it's running
    await stopServer();
  } catch (err) {
    console.error('[TEARDOWN] Error stopping server:', err);
  }

  try {
    // Ensure mongoose is disconnected
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[TEARDOWN] MongoDB disconnected');
    }
  } catch (err) {
    console.error('[TEARDOWN] Error disconnecting MongoDB:', err);
  }

  // Give some time for connections to fully close
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('[TEARDOWN] Cleanup complete');
}

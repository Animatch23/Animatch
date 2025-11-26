import { createServer } from 'http';
import { pathToFileURL } from 'url';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import createApp from './app.js';

const PORT = process.env.PORT || 5000;

// Global references for cleanup
let httpServer = null;
let io = null;

/**
 * Start the HTTP server with Socket.IO and connect to database
 * @returns {Promise<Object>} Object containing server and io instances
 */
export async function startServer() {
  try {
    // Connect to database
    await connectDB();
    console.log('Database connected');

    // Create Express app
    const app = createApp();

    // Create HTTP server
    httpServer = createServer(app);

    // Initialize Socket.IO
    io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Socket.IO connection handler
    io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    // Make io accessible to routes
    app.set('io', io);

    // Start HTTP server
    return new Promise((resolve, reject) => {
      httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        
        // Expose server globally for Jest teardown if needed
        if (typeof global !== 'undefined') {
          global.__SERVER__ = httpServer;
          global.__IO__ = io;
        }
        
        resolve({ server: httpServer, io });
      });
      httpServer.on('error', reject);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    throw err;
  }
}

/**
 * Stop the server and disconnect from database
 * @returns {Promise<void>}
 */
export async function stopServer() {
  console.log('Shutting down server...');

  // Close Socket.IO connections
  if (io) {
    await new Promise((resolve) => {
      io.close(() => {
        console.log('Socket.IO closed');
        resolve();
      });
    });
    io = null;
  }

  // Close HTTP server
  if (httpServer) {
    await new Promise((resolve) => {
      httpServer.close(() => {
        console.log('HTTP server closed');
        resolve();
      });
    });
    httpServer = null;
  }

  // Disconnect from MongoDB
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await stopServer();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await stopServer();
  process.exit(0);
});

// Only start server when run directly (not imported by tests)
// For ESM modules, check if this is the main module
const isMainModule = Boolean(
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
);

if (process.env.NODE_ENV !== 'test' && isMainModule) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export { httpServer, io };

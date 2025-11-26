import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import authRoute from './routes/authRoute.js';
import uploadRoute from './routes/uploadRoute.js';
import testRoute from './routes/testRoute.js';
import existRoute from './routes/existRoute.js';
import blurRoute from './routes/blurRoute.js';
import queueRoutes from './routes/queueRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import termsRoutes from './routes/termsRoutes.js';

// Load environment variables
dotenv.config();

// Do NOT connect to database on import - let tests and start function control this

const app = express();

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoute);
app.use('/api/upload', uploadRoute);
app.use('/api/test', testRoute);
app.use('/api/exist', existRoute);
app.use('/api/blur', blurRoute);
app.use('/api/queue', queueRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/terms', termsRoutes);

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Export app, httpServer, and io for tests
export default app;
export { httpServer, io };

// Server lifecycle management
let serverInstance = null;

/**
 * Start the server and connect to database
 * @param {Object} options - Configuration options
 * @param {number} options.port - Port to listen on
 * @param {string} options.mongoUri - MongoDB connection URI
 * @returns {Promise<Server>} The HTTP server instance
 */
export async function startServer({ port = process.env.PORT || 5000, mongoUri = null } = {}) {
  // Connect to database if not in test mode
  if (process.env.NODE_ENV !== 'test') {
    await connectDB();
  } else if (mongoUri) {
    await mongoose.connect(mongoUri);
  }

  return new Promise((resolve, reject) => {
    serverInstance = httpServer.listen(port, () => {
      console.log(`Server running on port ${port}`);
      resolve(serverInstance);
    });
    serverInstance.on('error', reject);
  });
}

/**
 * Stop the server and disconnect from database
 * @returns {Promise<void>}
 */
export async function stopServer() {
  // Close Socket.IO connections
  if (io) {
    await new Promise((resolve) => {
      io.close(() => {
        console.log('Socket.IO closed');
        resolve();
      });
    });
  }

  // Close HTTP server
  if (serverInstance) {
    await new Promise((resolve) => {
      serverInstance.close(() => {
        console.log('HTTP server closed');
        resolve();
      });
    });
    serverInstance = null;
  }

  // Disconnect from MongoDB
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Only start server when run directly (not imported by tests)
if (process.env.NODE_ENV !== 'test' && import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 5000;
  startServer({ port: PORT }).catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

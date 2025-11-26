import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

/**
 * Create and configure Express application
 * No side effects - does NOT connect to DB or start server
 * @returns {Express} Configured Express app
 */
const createApp = () => {
  const app = express();

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

  // Error handling middleware
  app.use((err, req, res, next) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(err.stack);
    }
    res.status(500).json({ message: 'Something went wrong!' });
  });

  return app;
};

export default createApp;

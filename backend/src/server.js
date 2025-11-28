import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import cron from 'node-cron';
import { expireChats } from './controllers/cronController.js';
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import connectDB from "./config/db.js";
import authRoute from "./routes/authRoute.js";
import blurRoute from "./routes/blurRoute.js";
import existRoute from "./routes/existRoute.js";
import testRoute from "./routes/testRoute.js";
import uploadRoutes from "./routes/uploadRoute.js";
import termRoutes from "./routes/termsRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import ChatSession from "./models/ChatSession.js";
import Message from "./models/Message.js";
import User from "./models/User.js";

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

const app = express();
app.set('trust proxy', 1);

const httpServer = createServer(app);

// CORS configuration: allow known origins and any animatch*.vercel.app subdomains.
// If ALLOWED_ORIGINS env var is set, use it; otherwise use default list
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';

const allowedOrigins = allowedOriginsEnv
  ? allowedOriginsEnv.split(',').map(s => s.trim()).filter(Boolean)
  : [
      'http://localhost:3000',
      'https://animatch-dlsus-projects.vercel.app',
      'https://animatch-git-sprint-1-animatch-dlsus-projects.vercel.app/',
    ];

// Socket.IO setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Store io instance in app for use in controllers
app.set('io', io);

app.use(
  cors({
    origin: (origin, callback) => {
      // No origin (server-to-server, curl, Postman) -> allow
      if (!origin) return callback(null, true);

      // Exact allow list
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Allow localhost for development
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }

      // Allow any animatch-* or animatch variant on vercel.app (helps with preview deploys)
      try {
        const lower = origin.toLowerCase();
        if (lower.endsWith('.vercel.app') && lower.includes('animatch')) {
          return callback(null, true);
        }
      } catch {
        // fallthrough to rejection
      }

      console.error('Blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie'],
  })
);
// Guarantee header even if cors() skipped it
app.use((req, res, next) => {
  if (!res.get("Access-Control-Allow-Origin")) {
    res.set("Access-Control-Allow-Origin", "*");
  }
  next();
});

app.use(cookieParser());
app.use(express.json());

// SUPER DETAILED LOGGING MIDDLEWARE (disabled in test mode to avoid noise)
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log('╔════════════════════════════════════════════════════════════');
    console.log(`║ [${timestamp}]`);
    console.log(`║ Method: ${req.method}`);
    console.log(`║ URL: ${req.url}`);
    console.log(`║ Path: ${req.path}`);
    console.log(`║ Origin: ${req.headers.origin || 'No origin header'}`);
    console.log(`║ User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'No user agent'}...`);
    console.log(`║ Content-Type: ${req.headers['content-type'] || 'No content type'}`);
    console.log(`║ Query Params:`, JSON.stringify(req.query));
    
    // Safely handle body logging
    try {
      const bodyStr = req.body ? JSON.stringify(req.body) : '{}';
      console.log(`║ Body Preview:`, bodyStr.substring(0, 100));
    } catch {
      console.log(`║ Body Preview: [Unable to stringify body]`);
    }
    console.log('╚════════════════════════════════════════════════════════════');
    
    // Log response when it finishes
    const originalSend = res.send;
    res.send = function(data) {
      console.log(`║ Response Status: ${res.statusCode}`);
      
      // Safely handle response data logging
      let responsePreview = '';
      if (typeof data === 'string') {
        responsePreview = data.substring(0, 100);
      } else if (data) {
        try {
          responsePreview = JSON.stringify(data).substring(0, 100);
        } catch {
          responsePreview = '[Unable to stringify response]';
        }
      }
      
      console.log(`║ Response Preview:`, responsePreview);
      console.log('╚════════════════════════════════════════════════════════════\n');
      originalSend.call(this, data);
    };
    
    next();
  });
}

// Root route - test if server is running
app.get("/", (req, res) => {
  res.json({ 
    message: "AniMatch Backend API", 
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// Ping route at root level
app.get("/ping", (req, res) => res.json({ pong: true, timestamp: new Date().toISOString() }));

// API routes
app.use("/api/auth", authRoute);
app.use("/api/blur", blurRoute);
app.use("/api/exist", existRoute);
app.use("/api/test", testRoute);
app.use("/api/upload", uploadRoutes);
app.use('/api/uploads', express.static('uploads'));
app.use('/api/test-uploads', express.static('test-uploads'));
app.use("/api/terms", termRoutes);
app.use("/api", matchRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reports", reportRoutes);

// API ping route
app.get("/api/ping", (req, res) => res.json({ pong: true, api: true, timestamp: new Date().toISOString() }));

// 404 handler - must be last
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    message: "Route not found",
    path: req.url,
    method: req.method
  });
});

// Error handler
app.use((err, req, res) => {
  console.error("Error:", err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user._id.toString();
    socket.userEmail = user.email;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Invalid token'));
  }
});

// Socket.IO Connection Handler
io.on('connection', async (socket) => {
  console.log(`[SOCKET] User connected: ${socket.userId}`);
  
  // Store userId on socket for easy access
  socket.socketUserId = socket.userId;

  // Handle explicit chat room joining
  socket.on('chat:join', async ({ chatSessionId }) => {
    try {
      console.log(`[SOCKET] User ${socket.userId} attempting to join room ${chatSessionId}`);
      
      // Verify user is participant in this chat
      const chatSession = await ChatSession.findOne({
        _id: chatSessionId,
        participants: socket.userId,
        active: true
      });

      if (!chatSession) {
        socket.emit('chat:error', { message: 'Chat session not found or inactive' });
        return;
      }

      // Join the room
      socket.join(chatSessionId);
      socket.chatSessionId = chatSessionId;
      console.log(`[SOCKET] User ${socket.userId} successfully joined room ${chatSessionId}`);
      
      socket.emit('chat:joined', { 
        chatSessionId,
        message: 'Successfully joined chat room'
      });
    } catch (error) {
      console.error('[SOCKET] Error joining chat:', error);
      socket.emit('chat:error', { message: 'Failed to join chat room' });
    }
  });

  // Handle sending messages
  socket.on('chat:send-message', async (data) => {
    try {
      const { content, chatSessionId } = data;

      if (!content || !chatSessionId) {
        socket.emit('chat:error', { message: 'Invalid message data' });
        return;
      }

      // Verify user is participant
      const chatSession = await ChatSession.findOne({
        _id: chatSessionId,
        participants: socket.userId,
        active: true
      });

      if (!chatSession) {
        socket.emit('chat:error', { message: 'Chat session not found or inactive' });
        return;
      }

      // Create and save message
      const message = new Message({
        chatSessionId,
        senderId: socket.userId,
        content: content.trim().substring(0, 1000) // Enforce max length
      });

      await message.save();

      // Emit to room (both participants) - use 'chat:message' to match frontend
      const messagePayload = {
        _id: message._id,
        content: message.content,
        sentAt: message.sentAt,
        senderId: socket.userId.toString()
      };
      
      io.to(chatSessionId).emit('chat:message', messagePayload);

      console.log(`[SOCKET] Message sent in room ${chatSessionId} by ${socket.userId}`);
    } catch (error) {
      console.error('[SOCKET] Error sending message:', error);
      socket.emit('chat:error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicator
  socket.on('chat:typing', (data) => {
    if (socket.chatSessionId) {
      // Emit to partner only (not to self)
      socket.to(socket.chatSessionId).emit('chat:typing', {
        isTyping: data.isTyping
      });
      console.log(`[SOCKET] Typing indicator: ${data.isTyping} in room ${socket.chatSessionId}`);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`[SOCKET] User disconnected: ${socket.userId}`);
    // Don't emit partner-disconnected on normal disconnect
    // Users may just be navigating away temporarily (e.g., checking profile)
    // The frontend will handle reconnection automatically
  });
});

cron.schedule('0 * * * *', () => {
  console.log('Running scheduled hourly check for chat expiry...');
  expireChats();
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║              🚀 ANIMATCH BACKEND STARTING 🚀                      ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
    
    console.log('\n📋 ENVIRONMENT VARIABLES:');
    console.log('  NODE_ENV:', process.env.NODE_ENV || '❌ NOT SET');
    console.log('  PORT:', PORT);
    console.log('  MONGO_URI:', process.env.MONGO_URI ? '✅ Set' : '❌ NOT SET');
    console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ NOT SET');
    console.log('  GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ NOT SET');
    console.log('  GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ NOT SET');
    console.log('  GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || '❌ NOT SET');
    
    console.log('\n🔌 CONNECTING TO DATABASE...');
    await connectDB();
    console.log('✅ Database connected successfully!');
    
    console.log('\n🌐 CORS CONFIGURATION:');
    console.log(`  Allowed Origins (${allowedOrigins.length}):`);
    allowedOrigins.forEach(origin => console.log(`    - ${origin}`));
    
    console.log('\n📍 REGISTERED API ROUTES:');
    console.log('  GET  /                          → Root health check');
    console.log('  GET  /ping                      → Simple ping');
    console.log('  GET  /api/ping                  → API ping');
    console.log('  POST /api/auth/google           → Google OAuth login');
    console.log('  GET  /api/auth/test             → Auth route test');
    console.log('  GET  /api/auth/check            → Check auth status');
    console.log('  POST /api/blur                  → Blur image');
    console.log('  POST /api/exist                 → Check if user exists');
    console.log('  POST /api/upload/profile-pic    → Upload profile picture');
    console.log('  POST /api/terms/accept          → Accept terms');
    console.log('  GET  /api/terms/:userId         → Get terms for user');
    console.log('  POST /api/queue/join            → Join matching queue');
    console.log('  POST /api/queue/leave           → Leave queue');
    console.log('  POST /api/match                 → Create match');
    
    if (process.env.NODE_ENV !== 'test') {
      httpServer.listen(PORT, '0.0.0.0', () => {
        console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
        console.log(`║  ✅ SERVER IS LIVE ON PORT ${PORT}                               ║`);
        console.log('║  🌐 Listening on 0.0.0.0 (accepting all connections)              ║');
        console.log(`║  🕐 Started at: ${new Date().toISOString()}                  ║`);
        console.log('╚═══════════════════════════════════════════════════════════════════╝');
        console.log('\n👀 Waiting for incoming requests...\n');
      });
    }
  } catch (err) {
    console.error('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ FATAL ERROR - SERVER FAILED TO START                          ║');
    console.error('╚═══════════════════════════════════════════════════════════════════');
    console.error('Error Message:', err.message);
    console.error('Stack Trace:', err.stack);
    process.exit(1);
  }
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\n💥 UNCAUGHT EXCEPTION:');
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n💥 UNHANDLED PROMISE REJECTION:');
  console.error('Reason:', reason);
  process.exit(1);
});

// Always start server (Render needs this)
start();

export default app;
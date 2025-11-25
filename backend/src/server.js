import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import connectDB from "./config/db.js";

// Routes
import testRoutes from "./routes/testRoute.js";
import authRoutes from "./routes/authRoute.js";
import queueRoutes from "./routes/queueRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import blurRoute from "./routes/blurRoute.js";
import existRoute from "./routes/existRoute.js";
import uploadRoutes from "./routes/uploadRoute.js";
import termRoutes from "./routes/termsRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import ChatSession from "./models/ChatSession.js";
import Message from "./models/Message.js";
import User from "./models/User.js";

// Load environment variables
if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test" });
} else {
  dotenv.config();
}

const app = express();
app.set("trust proxy", 1);

// CORS configuration
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || "";
const allowedOrigins = allowedOriginsEnv
  ? allowedOriginsEnv.split(",").map((s) => s.trim()).filter(Boolean)
  : [
      "http://localhost:3000",
      "https://animatch-dlsus-projects.vercel.app",
      "https://animatch-git-sprint-1-animatch-dlsus-projects.vercel.app",
    ];

// HTTP server
const httpServer = createServer(app);

// Socket.IO setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST']
  }
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
        return callback(null, true);
      }
      try {
        const lower = origin.toLowerCase();
        if (lower.endsWith(".vercel.app") && lower.includes("animatch")) {
          return callback(null, true);
        }
      } catch (e) {
        // Ignore parsing errors
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["set-cookie"],
  })
);

// Fallback CORS header
app.use((req, res, next) => {
  if (!res.get("Access-Control-Allow-Origin")) {
    res.set("Access-Control-Allow-Origin", "*");
  }
  next();
});

app.use(express.json());
app.use(cookieParser());

// Route registration
app.use("/api/test", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/blur", blurRoute);
app.use("/api/exist", existRoute);
app.use("/api/upload", uploadRoutes);
app.use("/api/terms", termRoutes);
app.use("/api", matchRoutes);
app.use("/api/uploads", express.static("uploads"));
app.use("/api/test-uploads", express.static("test-uploads"));

// Health check endpoints
app.get("/", (req, res) => 
  res.json({ 
    message: "AniMatch Backend API", 
    status: "running", 
    timestamp: new Date().toISOString() 
  })
);

app.get("/ping", (req, res) => 
  res.json({ 
    pong: true, 
    timestamp: new Date().toISOString() 
  })
);

app.get("/api/ping", (req, res) => 
  res.json({ 
    pong: true, 
    api: true, 
    timestamp: new Date().toISOString() 
  })
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: "Route not found", 
    path: req.url, 
    method: req.method 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  const status = err.status || 500;
  res.status(status).json({ 
    error: err.message || "Internal Server Error" 
  });
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
      // Note: Using 'status' instead of 'active' based on merged model
      const chatSession = await ChatSession.findOne({
        _id: chatSessionId,
        participants: socket.userId,
        status: 'active' 
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
        status: 'active'
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
    if (socket.chatSessionId) {
      socket.to(socket.chatSessionId).emit('chat:partner-disconnected');
    }
  });
});

// Server startup function
export const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5000;
    
    const server = httpServer.listen(PORT, '0.0.0.0', () => {
      console.log('\n');
      console.log('╔═══════════════════════════════════════════════════════════════════╗');
      console.log('║              🚀 ANIMATCH BACKEND STARTING 🚀                      ║');
      console.log('╚═══════════════════════════════════════════════════════════════════╝');
      console.log(`║  ✅ SERVER IS LIVE ON PORT ${PORT}                               ║`);
      console.log('╚═══════════════════════════════════════════════════════════════════╝');
    });
    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Start server if not in test mode
if (process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;
export { httpServer, io };
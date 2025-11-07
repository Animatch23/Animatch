import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
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
import ChatSession from "./models/ChatSession.js";
import Message from "./models/Message.js";
import User from "./models/User.js";

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  'https://animatch-git-us-3-animatch-dlsus-projects.vercel.app',
  'https://animatch-dlsus-projects.vercel.app',
];

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
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(cookieParser());
app.use(express.json());

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

app.get("/api/ping", (req, res) => res.json({ pong: true }));

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
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
    if (socket.chatSessionId) {
      socket.to(socket.chatSessionId).emit('chat:partner-disconnected');
    }
  });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    if (process.env.NODE_ENV !== 'test') {
      httpServer.listen(PORT, () => console.log(`Server with Socket.IO running on port ${PORT}`));
    }
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();

export default app;
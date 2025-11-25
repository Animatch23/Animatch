import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
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

// HTTP server with Socket.IO
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
  socket.on("join_room", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });
  
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Server startup function
export const startServer = async () => {
  await connectDB();
  const PORT = process.env.PORT || 5000;
  return httpServer.listen(PORT, () => 
    console.log(`Server running on port ${PORT}`)
  );
};

// Start server if not in test mode
if (process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}

export default app;
export { httpServer };
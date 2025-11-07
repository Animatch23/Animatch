import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoute from "./routes/authRoute.js";
import blurRoute from "./routes/blurRoute.js";
import existRoute from "./routes/existRoute.js";
import testRoute from "./routes/testRoute.js";
import uploadRoutes from "./routes/uploadRoute.js";
import termRoutes from "./routes/termsRoutes.js";
// Remove this line: import queueRoutes from "./routes/queueRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://animatch-git-us-3-animatch-dlsus-projects.vercel.app',
  'https://animatch-dlsus-projects.vercel.app',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, or tests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('Blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie'],
  })
);

app.use(cookieParser());
app.use(express.json());

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use("/api/auth", authRoute);
app.use("/api/blur", blurRoute);
app.use("/api/exist", existRoute);
app.use("/api/test", testRoute);
app.use("/api/upload", uploadRoutes);
app.use('/api/uploads', express.static('uploads'));
app.use('/api/test-uploads', express.static('test-uploads'));
app.use("/api/terms", termRoutes);
app.use("/api", matchRoutes); // This handles /api/queue/* and /api/match/*

app.get("/api/ping", (req, res) => res.json({ pong: true }));

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    console.log("Starting server...");
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log("PORT:", PORT);
    console.log("MONGO_URI:", process.env.MONGO_URI ? "Set" : "Not set");
    console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "Set" : "Not set");
    console.log("GOOGLE_REDIRECT_URI:", process.env.GOOGLE_REDIRECT_URI);
    
    await connectDB();
    console.log("Database connected successfully");
    
    // Always start server, even in test mode for Render
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
      console.log("Routes registered:");
      console.log("  - /api/auth");
      console.log("  - /api/blur");
      console.log("  - /api/exist");
      console.log("  - /api/test");
      console.log("  - /api/upload");
      console.log("  - /api/terms");
      console.log("  - /api/match");
      console.log("  - /api/queue");
      console.log("  - /api/ping");
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

export default app;
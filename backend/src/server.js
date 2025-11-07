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
import queueRoutes from "./routes/queueRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";


// Load appropriate .env file based on NODE_ENV
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

const app = express();

// CORS configuration - allow both local and production frontends
const allowedOrigins = [
  'http://localhost:3000',
  'https://animatch-git-us-3-animatch-dlsus-projects.vercel.app',
  'https://animatch-dlsus-projects.vercel.app', // Add your main Vercel domain too
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
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

// Handle preflight requests
app.options('*', cors());

app.use(cookieParser());
app.use(express.json());

// Routes
app.use("/api/auth", authRoute);
app.use("/api/blur", blurRoute);
app.use("/api/exist", existRoute);
app.use("/api/test", testRoute);
app.use("/api/upload", uploadRoutes);
app.use('/api/uploads', express.static('uploads'));
app.use('/api/test-uploads', express.static('test-uploads'));
app.use("/api/terms", termRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api", matchRoutes);

app.get("/api/ping", (req, res) => res.json({ pong: true }));

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
};

// Only start the server when NOT in test mode
if (process.env.NODE_ENV !== 'test') {
    start();
}

export default app;
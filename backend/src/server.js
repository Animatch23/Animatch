import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import testRoutes from "./routes/testRoute.js";
import queueRoutes from "./routes/queueRoutes.js";
import cookieParser from "cookie-parser";
import { ensureUser } from "./middleware/authMiddleware.js";

dotenv.config();
connectDB();

const app = express();

// CORS configuration: allow known origins and any animatch*.vercel.app subdomains.
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = allowedOriginsEnv
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

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
      } catch (e) {
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
app.use(ensureUser);

app.use("/api/test", testRoutes);
app.use("/api/queue", queueRoutes);

app.get("/api/ping", (req, res) => res.json({ pong: true }));

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
if (!process.env.JEST_WORKER_ID) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
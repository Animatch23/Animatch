import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoute from "./routes/authRoute.js";
import testRoute from "./routes/testRoute.js";
import queueRoutes from "./routes/queueRoutes.js";
import { ensureUser } from "./middleware/authMiddleware.js";

const app = express();

// Basic health check (no DB required)
app.get("/api/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development" });
});

app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(ensureUser);

// Routes
app.use("/api/auth", authRoute);
app.use("/api/test", testRoute);
app.use("/api/queue", queueRoutes);

// 404 JSON
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global JSON error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

async function start() {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error("Startup error:", e.message || e);
    process.exit(1);
  }
}

start();

export default app;
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

app.use(
  cors({
    origin: true, // reflect request origin
    credentials: true,
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
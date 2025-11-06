import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ensureUser } from "./middleware/authMiddleware.js";
import authRoute from "./routes/authRoute.js";
import testRoute from "./routes/testRoute.js";
import queueRoutes from "./routes/queueRoutes.js";

const app = express();

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
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

app.use("/api/auth", authRoute);
app.use("/api/test", testRoute);
app.use("/api/queue", queueRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

export default app;
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import testRoutes from "./routes/testRoute.js";
import queueRoutes from "./routes/queueRoutes.js";
import cookieParser from "cookie-parser";
import { ensureUser } from "./middleware/authMiddleware.js";
import { createServer } from "http";
import { Server } from "socket.io";
import chatRoutes from "./routes/chatRoutes.js";


dotenv.config();
connectDB();

const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/test", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/chat", chatRoutes);

// WebSocket connection handling
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

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
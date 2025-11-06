import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoute from "./routes/authRoute.js"
import connectDB from "./config/db.js";
import testRoute from "./routes/testRoute.js";
import blurRoute from "./routes/blurRoute.js"
import existRoute from "./routes/existRoute.js"
import uploadRoutes from "./routes/uploadRoute.js"

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoute);
app.use("/api/blur", blurRoute);
app.use("/api/exist", existRoute);
app.use("/api/test", testRoute);
app.use("/api/upload", uploadRoutes);
app.use('/api/uploads', express.static('uploads'));
app.use('/api/test-uploads', express.static('test-uploads'));
const PORT = process.env.PORT || 3000;

const start = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
};

start();

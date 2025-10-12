import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoute from "./routes/authRoute.js";
import testRoute from "./routes/testRoute.js";

dotenv.config();
const app = express();

app.use(express.json());

// Routes
app.use("/api/auth", authRoute);
app.use("/api/test", testRoute);

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB connected");
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.error("MongoDB connection error:", err));

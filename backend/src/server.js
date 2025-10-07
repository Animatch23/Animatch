import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoute from "./routes/authRoute.js";
import testRoute from "./routes/testRoute.js";
import queueRoutes from "./routes/queueRoutes.js";

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());

// Routes
app.use("/api/auth", authRoute);
app.use("/api/test", testRoute);
app.use("/api/queue", queueRoutes);

app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 3000;

if(process.env.NODE_ENV !== 'test'){
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log("MongoDB connected");
            app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
        })
        .catch(err => console.error("MongoDB connection error:", err));
}

export default app;
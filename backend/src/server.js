import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import testRoutes from "./routes/testRoute.js";
import termRoutes from "./routes/termsRoutes.js";

dotenv.config();

if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

const app = express();
app.use(cors());
app.use(express.json());


app.use("/api/test", testRoutes);
app.use("/api/terms", termRoutes);

if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;

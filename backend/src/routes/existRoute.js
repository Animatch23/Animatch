import express from "express";
import User from "../models/User.js";

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "email required" });
        } 
        const found = await User.exists({ email });
        res.json({ exists: !!found });
    } catch (err) {
        console.error("user exists error:", err);
        res.status(500).json({ error: "server error" });
    }
});

export default router;
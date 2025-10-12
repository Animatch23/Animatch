import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/public", (req, res) => {
    res.json({ message: "This is a public endpoint. No token needed." });
});

router.get("/protected", authMiddleware, (req, res) => {
    res.json({
        message: "This is a protected endpoint. You are authenticated!",
        user: req.user,
    });
});

export default router;

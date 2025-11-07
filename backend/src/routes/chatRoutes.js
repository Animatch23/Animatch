import express from "express";
import { nextChat, getActiveChat } from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/chat/next - End current chat and return to queue
router.post("/next", protect, nextChat);

// GET /api/chat/active - Get current active chat session
router.get("/active", protect, getActiveChat);

export default router;
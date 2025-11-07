import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  joinQueue,
  leaveQueue,
  queueStatus,      // Change: getQueueStatus → queueStatus
  checkQueueStatus  // Add this if you want to use it
} from "../controllers/queueController.js";

const router = express.Router();

// All routes require authentication
router.post("/join", authMiddleware, joinQueue);
router.post("/leave", authMiddleware, leaveQueue);
router.get("/status", authMiddleware, queueStatus);        
router.get("/check", authMiddleware, checkQueueStatus);     

export default router;
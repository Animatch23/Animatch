import { Router } from "express";
import {
  joinQueue,
  queueStatus,
  leaveQueue,
  // checkQueueStatus, // do not use this legacy handler
} from "../controllers/queueController.js";

const router = Router();

router.post("/join", joinQueue);
router.get("/status", queueStatus); // correct handler uses req.userId
router.post("/leave", leaveQueue);

export default router;
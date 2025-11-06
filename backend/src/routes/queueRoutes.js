import { Router } from "express";
import {
  joinQueue,
  queueStatus,
  leaveQueue,
  // checkQueueStatus, // do not use this legacy handler
} from "../controllers/queueController.js";

const router = Router();

router.post("/join", requireAuth, joinQueue);
router.get("/status", requireAuth, queueStatus);
router.post("/leave", requireAuth, leaveQueue);


export default router;
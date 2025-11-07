import { Router } from "express";
import { joinQueue, queueStatus, leaveQueue, checkQueueStatus } from "../controllers/queueController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/join", joinQueue);
router.get("/status", queueStatus);
router.post("/leave", leaveQueue);
router.get("/check", checkQueueStatus);

export default router;
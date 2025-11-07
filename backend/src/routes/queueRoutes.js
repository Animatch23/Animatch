import { Router } from "express";
import { joinQueue, queueStatus, leaveQueue } from "../controllers/queueController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/join", requireAuth, joinQueue);
router.get("/status", requireAuth, queueStatus);
router.post("/leave", requireAuth, leaveQueue);

export default router;
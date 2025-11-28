import express from "express";
import { createReport, getReports } from "../controllers/reportController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Submit a report
router.post("/", authMiddleware, createReport);

// Get all reports (Admin)
// Ideally, we should have an admin middleware, but reusing authMiddleware for now
router.get("/", authMiddleware, getReports);

export default router;

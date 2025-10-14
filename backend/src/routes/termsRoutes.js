import express from "express";
import { acceptTerms, getTermsStatus } from "../controllers/termsController.js";

const router = express.Router();

// Route to accept terms and conditions
router.post("/accept", acceptTerms);

// Route to get terms acceptance status
router.get("/:userId", getTermsStatus);

export default router;
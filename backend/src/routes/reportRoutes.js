import express from 'express';
import {
  submitReport,
  getReports,
  getReportById,
  getMyReports,
} from '../controllers/reportController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Submit a new report
router.post('/', submitReport);

// Get all reports (admin view - mocked)
router.get('/', getReports);

// Get current user's reports
router.get('/my-reports', getMyReports);

// Get specific report by ID
router.get('/:id', getReportById);

export default router;

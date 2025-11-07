import express from 'express';
import { blockUser } from '../controllers/userController.js';

const router = express.Router();
router.post('/block/:userId', blockUser);

export default router;
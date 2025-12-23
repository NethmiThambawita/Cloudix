import express from 'express';
import * as debugController from '../controllers/debug.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Debug routes (only for development/testing)
router.get('/database', protect, debugController.debugDatabase);
router.post('/sample-data', protect, debugController.createSampleData);

export default router;
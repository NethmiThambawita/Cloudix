import express from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ✅ Admin only: dashboard contains sensitive company-wide analytics
router.use(authorize('admin'));

// Dashboard stats
router.get('/stats', dashboardController.getStats);

// Dashboard metrics (detailed analytics)
router.get('/metrics', dashboardController.getMetrics);

export default router;
import express from 'express';
import {
  getAllPOs,
  getPOById,
  createPO,
  updatePO,
  approvePO,
  sendPO,
  completePO,
  cancelPO,
  convertPOToGRN,
  deletePO,
  getPOReports,
  generatePOPDF
} from '../controllers/purchaseOrder.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public routes (all authenticated users)
router.get('/', getAllPOs);
router.get('/reports', getPOReports);
router.get('/:id', getPOById);
router.get('/:id/pdf', generatePOPDF);
router.post('/', createPO);
router.put('/:id', updatePO);

// Status update routes
router.post('/:id/approve', approvePO);
router.post('/:id/send', sendPO);
router.post('/:id/complete', completePO);
router.post('/:id/cancel', cancelPO);

// Conversion route (critical operation)
router.post('/:id/convert-to-grn', convertPOToGRN);

// Admin-only routes
router.delete('/:id', authorize('admin'), deletePO);

export default router;

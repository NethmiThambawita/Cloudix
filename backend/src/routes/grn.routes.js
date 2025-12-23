import express from 'express';
import {
  getAllGRNs,
  getGRNById,
  createGRN,
  updateGRN,
  inspectGRN,
  approveGRN,
  updateStockFromGRN,
  matchInvoice,
  deleteGRN,
  getGRNReports
} from '../controllers/grn.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all GRNs - All authenticated users
router.get('/', getAllGRNs);

// Get GRN reports/statistics - All authenticated users
router.get('/reports', getGRNReports);

// Get single GRN by ID - All authenticated users
router.get('/:id', getGRNById);

// Create new GRN - All authenticated users
router.post('/', createGRN);

// Update GRN - All authenticated users
router.put('/:id', updateGRN);

// Perform quality inspection - All authenticated users
router.post('/:id/inspect', inspectGRN);

// Approve GRN - All authenticated users
router.post('/:id/approve', approveGRN);

// Update stock from GRN - All authenticated users
router.post('/:id/update-stock', updateStockFromGRN);

// Match invoice with GRN - All authenticated users
router.post('/:id/match-invoice', matchInvoice);

// Delete GRN (admin only)
router.delete('/:id', authorize('admin'), deleteGRN);

export default router;
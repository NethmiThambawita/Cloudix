import express from 'express';
import {
  getAllSupplierPayments,
  getSupplierPaymentById,
  createSupplierPayment,
  updateSupplierPayment,
  approveSupplierPayment,
  markAsPaid,
  deleteSupplierPayment,
  getPaymentsByGRN
} from '../controllers/SupplierPayment.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get payments by GRN (before :id routes to avoid conflict)
router.get('/by-grn/:grnId', getPaymentsByGRN);

// CRUD routes
router.get('/', getAllSupplierPayments);
router.get('/:id', getSupplierPaymentById);
router.post('/', authorize('admin'), createSupplierPayment);
router.put('/:id', authorize('admin'), updateSupplierPayment);
router.patch('/:id', authorize('admin'), updateSupplierPayment);

// Workflow routes
router.post('/:id/approve', authorize('admin'), approveSupplierPayment);
router.post('/:id/mark-paid', authorize('admin'), markAsPaid);

// Delete route
router.delete('/:id', authorize('admin'), deleteSupplierPayment);

export default router;

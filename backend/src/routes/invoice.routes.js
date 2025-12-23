// backend/src/routes/invoice.routes.js
// REPLACE ENTIRE FILE

import express from 'express';
import * as invoiceController from '../controllers/invoice.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ✅ Admin-only routes
router.patch('/:id/approval', authorize('admin'), invoiceController.updateInvoiceApproval);

// ✅ Routes accessible by all authenticated users
router.get('/', invoiceController.getAllInvoices); // Filtered by user inside controller
router.post('/', invoiceController.createInvoice);
router.get('/:id', invoiceController.getInvoiceById);
router.put('/:id', invoiceController.updateInvoice);
router.patch('/:id/status', invoiceController.updateInvoiceStatus);
router.delete('/:id', authorize('admin'), invoiceController.deleteInvoice); // Admin only
router.get('/:id/pdf', invoiceController.generateInvoicePDF);

export default router;
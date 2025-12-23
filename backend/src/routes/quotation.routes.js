// backend/src/routes/quotation.routes.js
// REPLACE ENTIRE FILE

import express from 'express';
import * as quotationController from '../controllers/quotation.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ✅ Admin-only: Convert to invoice and update status
router.post('/:id/convert', authorize('admin'), quotationController.convertToInvoice);
router.patch('/:id/status', authorize('admin'), quotationController.updateQuotationStatus);

// ✅ Routes accessible by all authenticated users
router.get('/', quotationController.getAllQuotations); // Filtered by user inside controller
router.post('/', quotationController.createQuotation);
router.get('/:id', quotationController.getQuotationById);
router.put('/:id', quotationController.updateQuotation);
router.delete('/:id', authorize('admin'), quotationController.deleteQuotation); // Admin only
router.get('/:id/pdf', quotationController.generateQuotationPDF);

export default router;
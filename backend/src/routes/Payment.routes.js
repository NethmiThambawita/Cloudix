import express from 'express';
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment
} from '../controllers/Payment.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Payment routes
router.get('/', getAllPayments);           // GET /api/v1/payments
router.get('/:id', getPaymentById);        // GET /api/v1/payments/:id
router.post('/', createPayment);           // POST /api/v1/payments
router.put('/:id', updatePayment);         // PUT /api/v1/payments/:id
router.patch('/:id', updatePayment);       // PATCH /api/v1/payments/:id
router.delete('/:id', deletePayment);      // DELETE /api/v1/payments/:id

export default router;

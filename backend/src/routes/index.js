import express from 'express';

// Import all route modules
import authRoutes from './auth.routes.js';
import customerRoutes from './customer.routes.js';
import supplierRoutes from './supplier.routes.js';
import productRoutes from './product.routes.js';
import quotationRoutes from './quotation.routes.js';
import invoiceRoutes from './invoice.routes.js';
import settingsRoutes from './settings.routes.js';
// NOTE: file is case-sensitive on Linux
import paymentRoutes from './Payment.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import taxRoutes from './tax.routes.js';
import debugRoutes from './debug.routes.js';
import userRoutes from './users.routes.js';
// New routes for Stock Management and GRN
import stockRoutes from './stock.routes.js';
import grnRoutes from './grn.routes.js';

const router = express.Router();

// Register routes
router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/products', productRoutes);
router.use('/quotations', quotationRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/settings', settingsRoutes);
router.use('/payments', paymentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/taxes', taxRoutes);
router.use('/users', userRoutes);

// Stock Management and GRN routes
router.use('/stock', stockRoutes);
router.use('/grn', grnRoutes);

// Debug routes (enable in development only)
if (process.env.NODE_ENV !== 'production') {
  router.use('/debug', debugRoutes);
}

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy - IDURAR Complete System with Stock & GRN' });
});

export default router;
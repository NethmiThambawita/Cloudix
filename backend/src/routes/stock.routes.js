import express from 'express';
import {
  getAllStock,
  getStockByProduct,
  getStockById,
  createStock,
  updateStock,
  adjustStock,
  transferStock,
  getStockTransactions,
  getLowStockAlerts,
  getStockBalance
} from '../controllers/stock.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// All stock routes restricted to admin/manager only
router.use(authorize('admin', 'manager'));

// Get all stock items
router.get('/', getAllStock);

// Get low stock alerts
router.get('/alerts', getLowStockAlerts);

// Get stock transactions/history
router.get('/transactions', getStockTransactions);

// Get stock by product ID
router.get('/product/:productId', getStockByProduct);

// Get stock balance for a product
router.get('/balance/:productId', getStockBalance);

// Get stock by ID (must be after specific routes to avoid conflicts)
router.get('/:id', getStockById);

// Create new stock entry
router.post('/', createStock);

// Update stock settings
router.put('/:id', updateStock);

// Stock adjustment
router.post('/adjust', adjustStock);

// Stock transfer
router.post('/transfer', transferStock);

export default router;
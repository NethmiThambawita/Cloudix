import express from 'express';
import { getAll, create, getOne, update, remove } from '../controllers/product.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// Basic pagination guard to prevent abusive limits
const clampPagination = (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  req.query.page = page;
  req.query.limit = limit;
  next();
};

router.use(protect);

router.get('/', clampPagination, getAll);
router.post('/', authorize('admin'), create);
router.get('/:id', getOne);
router.put('/:id', authorize('admin'), update);
router.delete('/:id', authorize('admin'), remove);

export default router;
import express from 'express';
import { getAll, create, getOne, update, remove } from '../controllers/product.controller.js';
import { importProducts } from '../controllers/importProducts.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Only accept Excel files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

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
router.post('/import/excel', authorize('admin'), upload.single('file'), importProducts);
router.post('/', authorize('admin'), create);
router.get('/:id', getOne);
router.put('/:id', authorize('admin'), update);
router.delete('/:id', authorize('admin'), remove);

export default router;
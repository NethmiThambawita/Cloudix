import express from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// ✅ Settings are admin-only
router.use(protect);
router.use(authorize('admin'));

// ✅ IMPORTANT: templates endpoint expected by frontend
router.get('/templates', settingsController.getTemplates);

// Get company settings
router.get('/', settingsController.getSettings);

// Update company settings
router.put('/', settingsController.updateSettings);

// Upload company logo
router.post('/upload-logo', settingsController.uploadLogo);

// Delete company logo
router.delete('/logo', settingsController.deleteLogo);

// Get default terms and conditions
router.get('/terms', settingsController.getDefaultTerms);

// Update default terms and conditions
router.put('/terms', settingsController.updateDefaultTerms);

export default router;

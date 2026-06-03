import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  listOrder,
  saveOrder,
  resetOrder,
} from '../controllers/packageOrderController.js';

const router = Router();

// Public — storefront uses this to sort packages
router.get('/package-order', listOrder);

// Admin — bulk save / reset
router.post('/admin/package-order', authenticate, requireAdmin, saveOrder);
router.delete('/admin/package-order', authenticate, requireAdmin, resetOrder);

export default router;

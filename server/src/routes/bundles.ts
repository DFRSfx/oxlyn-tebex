import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  listAllBundleContents,
  getBundleContents,
  saveBundleContents,
  clearBundleContents,
} from '../controllers/bundlesController.js';

const router = Router();

// Public — storefront uses these to render bundle contents
router.get('/bundles', listAllBundleContents);
router.get('/bundles/:bundleId', getBundleContents);

// Admin — replace / clear contents for one bundle
router.put('/admin/bundles/:bundleId', authenticate, requireAdmin, saveBundleContents);
router.delete('/admin/bundles/:bundleId', authenticate, requireAdmin, clearBundleContents);

export default router;

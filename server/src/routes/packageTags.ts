import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  listEnabledTags,
  listAllTags,
  createTag,
  updateTag,
  deleteTag,
} from '../controllers/packageTagsController.js';

const router = Router();

// Public — used by package cards across the storefront
router.get('/tags', listEnabledTags);

// Admin — full CRUD
router.get('/admin/tags', authenticate, requireAdmin, listAllTags);
router.post('/admin/tags', authenticate, requireAdmin, createTag);
router.put('/admin/tags/:id', authenticate, requireAdmin, updateTag);
router.delete('/admin/tags/:id', authenticate, requireAdmin, deleteTag);

export default router;

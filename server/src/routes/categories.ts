import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  listPublicCategories,
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  setCategoryPackages,
} from '../controllers/categoriesController.js';

const router = Router();

// Public — used by the storefront /scripts page
router.get('/categories', listPublicCategories);

// Admin — full CRUD + assignment
router.get('/admin/categories', authenticate, requireAdmin, listAdminCategories);
router.post('/admin/categories', authenticate, requireAdmin, createCategory);
router.put('/admin/categories/:id', authenticate, requireAdmin, updateCategory);
router.delete('/admin/categories/:id', authenticate, requireAdmin, deleteCategory);
router.put('/admin/categories/:id/packages', authenticate, requireAdmin, setCategoryPackages);

export default router;

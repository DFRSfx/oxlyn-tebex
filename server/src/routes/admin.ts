import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { getDashboardStats, listDownloadFiles } from '../controllers/adminController.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

router.get('/dashboard/stats', getDashboardStats);
router.get('/files/list', listDownloadFiles);

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { getAllOrders, createOrder, deleteOrder, recordPackageView, recordAddToCart, recordCfxLogin } from '../controllers/ordersController.js';

const router = Router();

// 📊 Public Statistics endpoints (no auth required for recording stats)
router.post('/stats/record-view', recordPackageView);
router.post('/stats/record-cart', recordAddToCart);
router.post('/stats/record-cfx-login', recordCfxLogin);

// Protected admin routes
router.use(authenticate);
router.use(requireAdmin);

router.get('/list', getAllOrders);
router.post('/create', createOrder);
router.delete('/:id', deleteOrder);

export default router;

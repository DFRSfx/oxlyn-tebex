import { Router } from 'express';
import { tebexController } from '../controllers/tebexController.js';

const router = Router();

// Storefront catalog (public, cached upstream)
router.get('/packages', tebexController.listPackages);
router.get('/categories', tebexController.listCategories);

// Basket lifecycle
router.post('/baskets', tebexController.createBasket);
router.get('/baskets/:ident', tebexController.getBasket);
router.get('/baskets/:ident/auth', tebexController.getAuthUrl);
router.post('/baskets/:ident/packages', tebexController.addPackage);
router.post('/baskets/:ident/packages/remove', tebexController.removePackage);
router.post('/baskets/:ident/coupons', tebexController.applyCoupon);
router.post('/baskets/:ident/coupons/remove', tebexController.removeCoupon);

export default router;

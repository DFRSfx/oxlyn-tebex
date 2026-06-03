import { Router } from 'express';
import { tebexClaimController } from '../controllers/tebexClaimController.js';

const router = Router();

router.get('/packages', tebexClaimController.listPackages);
router.post('/baskets', tebexClaimController.createBasket);
router.get('/baskets/:ident/auth', tebexClaimController.getAuthUrl);

export default router;

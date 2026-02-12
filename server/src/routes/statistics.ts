import express from 'express';
import { StatisticsController } from '../controllers/statisticsController';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';

const router = express.Router();

// Todas as rotas de estatísticas requerem autenticação e privilégio de admin

// Obter resumo das estatísticas
router.get('/summary', authenticate, requireAdmin, StatisticsController.getSummary);

// Obter estatísticas de logins
router.get('/logins', authenticate, requireAdmin, StatisticsController.getLoginStats);

// Obter estatísticas de pacotes
router.get('/packages', authenticate, requireAdmin, StatisticsController.getPackageStats);

// Obter estatísticas de um pacote específico
router.get('/packages/:packageName', authenticate, requireAdmin, StatisticsController.getPackageDetail);

// Obter top pacotes por visualizações
router.get('/packages/views/top', authenticate, requireAdmin, StatisticsController.getTopPackagesByViews);

// Obter top pacotes por carrinho
router.get('/packages/cart/top', authenticate, requireAdmin, StatisticsController.getTopPackagesByCart);

export default router;

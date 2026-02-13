import express from 'express';
import { DownloadController } from '../controllers/downloadController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = express.Router();

// Rotas protegidas - requerem autenticação Discord
router.use(authenticate);

// User routes
router.get('/available', DownloadController.checkAvailableTokens);
router.post('/claim', DownloadController.claimToken);
router.get('/my-downloads', DownloadController.myDownloads);
router.get('/file/:token', DownloadController.downloadFile);
router.post('/cancel/:token', DownloadController.cancelDownload);
router.post('/mark-scripts-claimed/:token', DownloadController.markScriptsClaimed);

// Admin routes
router.post('/admin/create', requireAdmin, DownloadController.createToken);
router.get('/admin/list', requireAdmin, DownloadController.listAllTokens);
router.delete('/admin/:id', requireAdmin, DownloadController.deleteToken);

export default router;

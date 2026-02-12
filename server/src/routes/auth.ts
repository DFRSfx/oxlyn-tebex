import { Router } from 'express';
import {
  logout,
  getCurrentUser,
  discordAuth,
  discordCallback,
  linkCfxLogin,
  getAllDownloadUsers,
  getLoginStatistics
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

// Auth routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

// Discord OAuth routes (public - no auth required)
router.get('/discord', discordAuth);
router.get('/discord/callback', discordCallback);

// Link CFX to Discord login (requires auth)
router.post('/link-cfx', authenticate, linkCfxLogin);

// Admin routes
router.get('/admin/download-users', authenticate, requireAdmin, getAllDownloadUsers);
router.get('/admin/login-stats', authenticate, requireAdmin, getLoginStatistics);

export default router;

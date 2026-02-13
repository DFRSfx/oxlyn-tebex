import express from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';

const router = express.Router();

// ==================== TRACKING ROUTES (PUBLIC) ====================
// These endpoints are public to allow client-side tracking

// Batch track events
router.post('/events', AnalyticsController.trackEvents);

// Track page view
router.post('/page-view', AnalyticsController.trackPageView);

// Track conversion (view, cart, purchase)
router.post('/conversion', AnalyticsController.trackConversion);

// Start session
router.post('/session/start', AnalyticsController.startSession);

// Session heartbeat
router.post('/session/heartbeat', AnalyticsController.sessionHeartbeat);

// ==================== ANALYTICS ROUTES (ADMIN) ====================
// These endpoints require authentication and admin privileges

// Get dashboard stats
router.get('/dashboard-stats', authenticate, requireAdmin, AnalyticsController.getDashboardStats);

// Get time-series data for charts
router.get('/time-series', authenticate, requireAdmin, AnalyticsController.getTimeSeries);

// Get conversion funnel data
router.get('/conversion-funnel', authenticate, requireAdmin, AnalyticsController.getConversionFunnel);

// Get geographic distribution
router.get('/geographic', authenticate, requireAdmin, AnalyticsController.getGeographicData);

// Get device breakdown
router.get('/devices', authenticate, requireAdmin, AnalyticsController.getDeviceData);

// Get top pages
router.get('/top-pages', authenticate, requireAdmin, AnalyticsController.getTopPages);

// Get session details
router.get('/session/:sessionId', authenticate, requireAdmin, AnalyticsController.getSessionDetails);

export default router;

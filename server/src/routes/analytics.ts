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

// =========================================================================
// VANGUARD-SCOPED ANALYTICS — restricts the same shapes to traffic that
// touched /vanguardscripts or /vanguardbundles. Powers the dedicated
// "Vanguard Analytics" admin tab.
// =========================================================================
router.get('/vanguard/dashboard-stats', authenticate, requireAdmin, AnalyticsController.getVanguardDashboardStats);
router.get('/vanguard/time-series',      authenticate, requireAdmin, AnalyticsController.getVanguardTimeSeries);
router.get('/vanguard/geographic',       authenticate, requireAdmin, AnalyticsController.getVanguardGeographicData);
router.get('/vanguard/devices',          authenticate, requireAdmin, AnalyticsController.getVanguardDeviceData);
router.get('/vanguard/top-pages',        authenticate, requireAdmin, AnalyticsController.getVanguardTopPages);

export default router;

import { Request, Response } from 'express';
import {
  AnalyticsEventsModel,
  AnalyticsSessionsModel,
  AnalyticsPageViewsModel,
  AnalyticsConversionsModel,
  AnalyticsDashboardModel,
} from '../models/analytics';
import { enrichEvent, enrichSessionInfo, calculatePeriod } from '../services/analyticsService';
import { analyticsLogger } from '../utils/analyticsLogger';

export class AnalyticsController {
  // ==================== TRACKING ENDPOINTS (PUBLIC) ====================

  // Batch track events
  static async trackEvents(req: Request, res: Response) {
    try {
      const { events } = req.body;

      if (!events || !Array.isArray(events)) {
        return res.status(400).json({
          success: false,
          message: 'Events array is required',
        });
      }

      // Log raw incoming events to file
      analyticsLogger.log('📥 [Analytics] Raw incoming events:', events);

      // Enrich each event with server-side data
      const enrichedEvents = events.map((event) => {
        analyticsLogger.log('📥 [Analytics] Processing event:', event);
        const enriched = enrichEvent(event, req);
        analyticsLogger.log('✨ [Analytics] Enriched event:', enriched);
        return enriched;
      });

      analyticsLogger.log('📤 [Analytics] Final enriched events to insert:', enrichedEvents);

      // Batch insert into database
      await AnalyticsEventsModel.batchInsertEvents(enrichedEvents);

      res.json({
        success: true,
        message: `Tracked ${enrichedEvents.length} events`,
      });
    } catch (error) {
      console.error('Error tracking events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track events',
      });
    }
  }

  // Track page view
  static async trackPageView(req: Request, res: Response) {
    try {
      const { sessionId, pageUrl, timeOnPage } = req.body;

      if (!sessionId || !pageUrl) {
        return res.status(400).json({
          success: false,
          message: 'sessionId and pageUrl are required',
        });
      }

      await AnalyticsPageViewsModel.trackPageView(sessionId, pageUrl, timeOnPage || 0);

      res.json({
        success: true,
        message: 'Page view tracked',
      });
    } catch (error) {
      console.error('Error tracking page view:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track page view',
      });
    }
  }

  // Start session
  static async startSession(req: Request, res: Response) {
    try {
      const sessionInfo = req.body;

      if (!sessionInfo.sessionId) {
        return res.status(400).json({
          success: false,
          message: 'sessionId is required',
        });
      }

      const enrichedSession = enrichSessionInfo(sessionInfo, req);

      // Debug logging to file
      analyticsLogger.log('📍 [Session Start Debug]', {
        ip: req.ip,
        headers: {
          'x-forwarded-for': req.headers['x-forwarded-for'],
          'x-real-ip': req.headers['x-real-ip'],
        },
        enrichedSession,
      });

      await AnalyticsSessionsModel.upsertSession({
        session_id: enrichedSession.sessionId,
        user_id: enrichedSession.userId,
        started_at: new Date(),
        device_type: enrichedSession.deviceType,
        country: enrichedSession.country,
        ip_address: enrichedSession.ipAddress,
      });

      res.json({
        success: true,
        message: 'Session started',
        sessionId: enrichedSession.sessionId,
        debug: {
          country: enrichedSession.country,
          deviceType: enrichedSession.deviceType,
        },
      });
    } catch (error) {
      console.error('Error starting session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start session',
      });
    }
  }

  // Session heartbeat (update last activity)
  static async sessionHeartbeat(req: Request, res: Response) {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'sessionId is required',
        });
      }

      await AnalyticsSessionsModel.updateSessionHeartbeat(sessionId);

      res.json({
        success: true,
        message: 'Session heartbeat updated',
      });
    } catch (error) {
      console.error('Error updating session heartbeat:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update session',
      });
    }
  }

  // Track conversion (view, cart, purchase)
  static async trackConversion(req: Request, res: Response) {
    try {
      const { sessionId, packageName, funnelStage, price } = req.body;

      if (!sessionId || !packageName || !funnelStage) {
        return res.status(400).json({
          success: false,
          message: 'sessionId, packageName, and funnelStage are required',
        });
      }

      const conversion: any = {
        session_id: sessionId,
        package_name: packageName,
        funnel_stage: funnelStage,
        price: price || null,
      };

      // Set timestamp based on stage
      const now = new Date();
      if (funnelStage === 'view') {
        conversion.viewed_at = now;
      } else if (funnelStage === 'cart') {
        conversion.added_to_cart_at = now;
        await AnalyticsSessionsModel.incrementCartAdditions(sessionId);
      } else if (funnelStage === 'purchase') {
        conversion.purchased_at = now;
      }

      await AnalyticsConversionsModel.trackConversion(conversion);

      res.json({
        success: true,
        message: 'Conversion tracked',
      });
    } catch (error) {
      console.error('Error tracking conversion:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track conversion',
      });
    }
  }

  // ==================== ANALYTICS ENDPOINTS (ADMIN) ====================

  // Get dashboard stats
  // Accepts either ?period=7d/30d/90d OR explicit ?from=ISO&to=ISO.
  // The from/to form lets the client compute previous-period comparisons
  // without requiring a separate endpoint.
  static async getDashboardStats(req: Request, res: Response) {
    try {
      const fromRaw = req.query.from as string | undefined;
      const toRaw = req.query.to as string | undefined;

      let startDate: Date;
      let endDate: Date;

      if (fromRaw && toRaw) {
        const from = new Date(fromRaw);
        const to = new Date(toRaw);
        if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) {
          res.status(400).json({
            success: false,
            message: 'Invalid from/to range',
          });
          return;
        }
        startDate = from;
        endDate = to;
      } else {
        const period = (req.query.period as string) || '7d';
        ({ startDate, endDate } = calculatePeriod(period));
      }

      const stats = await AnalyticsDashboardModel.getDashboardStats(startDate, endDate);

      res.json({
        success: true,
        data: stats,
        period: {
          start: startDate,
          end: endDate,
        },
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard stats',
      });
    }
  }

  // Get time-series data for charts
  static async getTimeSeries(req: Request, res: Response) {
    try {
      const metric = (req.query.metric as string) || 'sessions';
      const period = (req.query.period as string) || '7d';
      const { startDate, endDate } = calculatePeriod(period);

      const data = await AnalyticsDashboardModel.getTimeSeries(metric, startDate, endDate);

      res.json({
        success: true,
        data,
        metric,
        period: {
          start: startDate,
          end: endDate,
        },
      });
    } catch (error) {
      console.error('Error fetching time-series data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch time-series data',
      });
    }
  }

  // Get conversion funnel data
  static async getConversionFunnel(req: Request, res: Response) {
    try {
      const period = (req.query.period as string) || '7d';
      const { startDate, endDate } = calculatePeriod(period);

      const data = await AnalyticsConversionsModel.getConversionFunnel(startDate, endDate);

      res.json({
        success: true,
        data,
        period: {
          start: startDate,
          end: endDate,
        },
      });
    } catch (error) {
      console.error('Error fetching conversion funnel:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conversion funnel',
      });
    }
  }

  // Get geographic distribution
  static async getGeographicData(req: Request, res: Response) {
    try {
      const period = (req.query.period as string) || '7d';
      const { startDate, endDate } = calculatePeriod(period);

      const data = await AnalyticsDashboardModel.getGeographicData(startDate, endDate);

      res.json({
        success: true,
        data,
        period: {
          start: startDate,
          end: endDate,
        },
      });
    } catch (error) {
      console.error('Error fetching geographic data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch geographic data',
      });
    }
  }

  // Get device breakdown
  static async getDeviceData(req: Request, res: Response) {
    try {
      const period = (req.query.period as string) || '7d';
      const { startDate, endDate } = calculatePeriod(period);

      const data = await AnalyticsDashboardModel.getDeviceData(startDate, endDate);

      res.json({
        success: true,
        data,
        period: {
          start: startDate,
          end: endDate,
        },
      });
    } catch (error) {
      console.error('Error fetching device data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch device data',
      });
    }
  }

  // Get top pages
  static async getTopPages(req: Request, res: Response) {
    try {
      const period = (req.query.period as string) || '7d';
      const limit = parseInt(req.query.limit as string) || 10;
      const { startDate, endDate } = calculatePeriod(period);

      const data = await AnalyticsDashboardModel.getTopPages(startDate, endDate, limit);

      res.json({
        success: true,
        data,
        period: {
          start: startDate,
          end: endDate,
        },
      });
    } catch (error) {
      console.error('Error fetching top pages:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch top pages',
      });
    }
  }

  // =========================================================================
  // VANGUARD-SCOPED ANALYTICS — admin endpoints
  // =========================================================================
  // Same shape as the OXLYN-wide endpoints above, but restricted to traffic
  // that touched a /vanguardscripts or /vanguardbundles page (or any future
  // vanguard sub-route). Lets the admin measure the impact of the dedicated
  // shortlinks (e.g. YouTube descriptions pointing at /vanguardscripts).

  private static resolvePeriod(req: Request): { startDate: Date; endDate: Date } | null {
    const fromRaw = req.query.from as string | undefined;
    const toRaw = req.query.to as string | undefined;
    if (fromRaw && toRaw) {
      const from = new Date(fromRaw);
      const to = new Date(toRaw);
      if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) return null;
      return { startDate: from, endDate: to };
    }
    const period = (req.query.period as string) || '7d';
    return calculatePeriod(period);
  }

  static async getVanguardDashboardStats(req: Request, res: Response) {
    try {
      const window = AnalyticsController.resolvePeriod(req);
      if (!window) {
        return res.status(400).json({ success: false, message: 'Invalid from/to range' });
      }
      const stats = await AnalyticsDashboardModel.getVanguardDashboardStats(
        window.startDate,
        window.endDate
      );
      res.json({ success: true, data: stats, period: window });
    } catch (error) {
      console.error('Error fetching vanguard dashboard stats:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch vanguard dashboard stats' });
    }
  }

  static async getVanguardTimeSeries(req: Request, res: Response) {
    try {
      const metric = (req.query.metric as string) || 'sessions';
      const window = AnalyticsController.resolvePeriod(req);
      if (!window) {
        return res.status(400).json({ success: false, message: 'Invalid from/to range' });
      }
      const data = await AnalyticsDashboardModel.getVanguardTimeSeries(
        metric,
        window.startDate,
        window.endDate
      );
      res.json({ success: true, data, metric, period: window });
    } catch (error) {
      console.error('Error fetching vanguard time-series:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch vanguard time-series' });
    }
  }

  static async getVanguardGeographicData(req: Request, res: Response) {
    try {
      const window = AnalyticsController.resolvePeriod(req);
      if (!window) {
        return res.status(400).json({ success: false, message: 'Invalid from/to range' });
      }
      const data = await AnalyticsDashboardModel.getVanguardGeographicData(
        window.startDate,
        window.endDate
      );
      res.json({ success: true, data, period: window });
    } catch (error) {
      console.error('Error fetching vanguard geo data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch vanguard geo data' });
    }
  }

  static async getVanguardDeviceData(req: Request, res: Response) {
    try {
      const window = AnalyticsController.resolvePeriod(req);
      if (!window) {
        return res.status(400).json({ success: false, message: 'Invalid from/to range' });
      }
      const data = await AnalyticsDashboardModel.getVanguardDeviceData(
        window.startDate,
        window.endDate
      );
      res.json({ success: true, data, period: window });
    } catch (error) {
      console.error('Error fetching vanguard device data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch vanguard device data' });
    }
  }

  static async getVanguardTopPages(req: Request, res: Response) {
    try {
      const window = AnalyticsController.resolvePeriod(req);
      if (!window) {
        return res.status(400).json({ success: false, message: 'Invalid from/to range' });
      }
      const limit = parseInt(req.query.limit as string) || 10;
      const data = await AnalyticsDashboardModel.getVanguardTopPages(
        window.startDate,
        window.endDate,
        limit
      );
      res.json({ success: true, data, period: window });
    } catch (error) {
      console.error('Error fetching vanguard top pages:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch vanguard top pages' });
    }
  }

  // Get session details
  static async getSessionDetails(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'sessionId is required',
        });
      }

      const session = await AnalyticsSessionsModel.getSession(sessionId);
      const events = await AnalyticsEventsModel.getEventsBySession(sessionId);
      const pageViews = await AnalyticsPageViewsModel.getPageViewsBySession(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found',
        });
      }

      res.json({
        success: true,
        data: {
          session,
          events,
          pageViews,
        },
      });
    } catch (error) {
      console.error('Error fetching session details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch session details',
      });
    }
  }
}

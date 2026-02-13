import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'oxlyn_tebex',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ==================== ANALYTICS EVENTS ====================

export interface AnalyticsEvent {
  id?: number;
  event_id: string;
  event_type: string;
  session_id: string;
  user_id?: number;
  discord_id?: string;
  page_url: string;
  package_name?: string;
  device_type?: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  country?: string;
  ip_address?: string;
  event_data?: any;
  created_at?: Date;
}

export class AnalyticsEventsModel {
  // Batch insert events (optimized for performance)
  static async batchInsertEvents(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;

    const connection = await pool.getConnection();
    try {
      const values = events.map((event) => [
        event.eventId,
        event.eventType,
        event.sessionId,
        event.userId || null,
        event.discordId || null,
        event.pageUrl,
        event.packageName || null,
        event.deviceType || null,
        event.browser || null,
        event.country || null,
        event.ipAddress || null,
        event.eventData ? JSON.stringify(event.eventData) : null,
      ]);

      await connection.query(
        `INSERT INTO analytics_events
        (event_id, event_type, session_id, user_id, discord_id, page_url,
         package_name, device_type, browser, country, ip_address, event_data)
        VALUES ?
        ON DUPLICATE KEY UPDATE event_id = event_id`,
        [values]
      );
    } finally {
      connection.release();
    }
  }

  // Get events by session
  static async getEventsBySession(sessionId: string): Promise<AnalyticsEvent[]> {
    const [rows] = await pool.query(
      `SELECT * FROM analytics_events
       WHERE session_id = ?
       ORDER BY created_at ASC`,
      [sessionId]
    );
    return rows as AnalyticsEvent[];
  }

  // Get events by type within period
  static async getEventsByType(
    eventType: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsEvent[]> {
    const [rows] = await pool.query(
      `SELECT * FROM analytics_events
       WHERE event_type = ?
       AND created_at >= ?
       AND created_at <= ?
       ORDER BY created_at DESC`,
      [eventType, startDate, endDate]
    );
    return rows as AnalyticsEvent[];
  }
}

// ==================== ANALYTICS SESSIONS ====================

export interface AnalyticsSession {
  id?: number;
  session_id: string;
  user_id?: number;
  started_at: Date;
  ended_at?: Date;
  duration_seconds: number;
  page_views: number;
  cart_additions: number;
  is_bounce: boolean;
  is_converted: boolean;
  device_type?: 'mobile' | 'tablet' | 'desktop';
  country?: string;
}

export class AnalyticsSessionsModel {
  // Create or update session
  static async upsertSession(session: Partial<AnalyticsSession>): Promise<void> {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `INSERT INTO analytics_sessions
        (session_id, user_id, started_at, device_type, country)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          ended_at = IFNULL(VALUES(ended_at), ended_at),
          duration_seconds = IFNULL(VALUES(duration_seconds), duration_seconds),
          page_views = IFNULL(VALUES(page_views), page_views),
          cart_additions = IFNULL(VALUES(cart_additions), cart_additions),
          is_bounce = IFNULL(VALUES(is_bounce), is_bounce),
          is_converted = IFNULL(VALUES(is_converted), is_converted)`,
        [
          session.session_id,
          session.user_id || null,
          session.started_at || new Date(),
          session.device_type || null,
          session.country || null,
        ]
      );
    } finally {
      connection.release();
    }
  }

  // Update session heartbeat
  static async updateSessionHeartbeat(sessionId: string): Promise<void> {
    await pool.query(
      `UPDATE analytics_sessions
       SET ended_at = CURRENT_TIMESTAMP,
           duration_seconds = TIMESTAMPDIFF(SECOND, started_at, CURRENT_TIMESTAMP)
       WHERE session_id = ?`,
      [sessionId]
    );
  }

  // Increment page views for session
  static async incrementPageViews(sessionId: string): Promise<void> {
    await pool.query(
      `UPDATE analytics_sessions
       SET page_views = page_views + 1
       WHERE session_id = ?`,
      [sessionId]
    );
  }

  // Increment cart additions for session
  static async incrementCartAdditions(sessionId: string): Promise<void> {
    await pool.query(
      `UPDATE analytics_sessions
       SET cart_additions = cart_additions + 1
       WHERE session_id = ?`,
      [sessionId]
    );
  }

  // Mark session as bounce (only 1 page view)
  static async markSessionAsBounce(sessionId: string): Promise<void> {
    await pool.query(
      `UPDATE analytics_sessions
       SET is_bounce = 1
       WHERE session_id = ? AND page_views = 1`,
      [sessionId]
    );
  }

  // Mark session as converted
  static async markSessionAsConverted(sessionId: string): Promise<void> {
    await pool.query(
      `UPDATE analytics_sessions
       SET is_converted = 1
       WHERE session_id = ?`,
      [sessionId]
    );
  }

  // Get session by ID
  static async getSession(sessionId: string): Promise<AnalyticsSession | null> {
    const [rows] = await pool.query(
      'SELECT * FROM analytics_sessions WHERE session_id = ?',
      [sessionId]
    );
    return (rows as any[])[0] || null;
  }
}

// ==================== ANALYTICS PAGE VIEWS ====================

export interface AnalyticsPageView {
  id?: number;
  session_id: string;
  page_url: string;
  time_on_page_seconds: number;
  view_count: number;
  viewed_at: Date;
  last_viewed_at?: Date;
}

export class AnalyticsPageViewsModel {
  // Track page view - Uses UPSERT to increment count instead of duplicating
  static async trackPageView(
    sessionId: string,
    pageUrl: string,
    timeOnPage: number = 0
  ): Promise<void> {
    await pool.query(
      `INSERT INTO analytics_page_views
      (session_id, page_url, time_on_page_seconds, view_count, viewed_at, last_viewed_at)
      VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        view_count = view_count + 1,
        time_on_page_seconds = time_on_page_seconds + VALUES(time_on_page_seconds),
        last_viewed_at = CURRENT_TIMESTAMP`,
      [sessionId, pageUrl, timeOnPage]
    );

    // Increment session page views only on first view
    // Check if this is the first view by seeing if we just inserted
    const [result] = await pool.query(
      'SELECT view_count FROM analytics_page_views WHERE session_id = ? AND page_url = ?',
      [sessionId, pageUrl]
    );

    if ((result as any[])[0]?.view_count === 1) {
      await AnalyticsSessionsModel.incrementPageViews(sessionId);
    }
  }

  // Get page views by session
  static async getPageViewsBySession(sessionId: string): Promise<AnalyticsPageView[]> {
    const [rows] = await pool.query(
      `SELECT * FROM analytics_page_views
       WHERE session_id = ?
       ORDER BY viewed_at ASC`,
      [sessionId]
    );
    return rows as AnalyticsPageView[];
  }
}

// ==================== ANALYTICS CONVERSIONS ====================

export interface AnalyticsConversion {
  id?: number;
  session_id: string;
  package_name: string;
  viewed_at?: Date;
  added_to_cart_at?: Date;
  purchased_at?: Date;
  funnel_stage: 'view' | 'cart' | 'purchase';
  price?: number;
}

export class AnalyticsConversionsModel {
  // Track conversion (view, cart, purchase)
  static async trackConversion(conversion: AnalyticsConversion): Promise<void> {
    await pool.query(
      `INSERT INTO analytics_conversions
      (session_id, package_name, viewed_at, added_to_cart_at, purchased_at, funnel_stage, price)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        conversion.session_id,
        conversion.package_name,
        conversion.viewed_at || null,
        conversion.added_to_cart_at || null,
        conversion.purchased_at || null,
        conversion.funnel_stage,
        conversion.price || null,
      ]
    );

    // If purchase, mark session as converted
    if (conversion.funnel_stage === 'purchase') {
      await AnalyticsSessionsModel.markSessionAsConverted(conversion.session_id);
    }
  }

  // Get conversion funnel data for a period
  static async getConversionFunnel(startDate: Date, endDate: Date): Promise<any> {
    const [rows] = await pool.query(
      `SELECT
        funnel_stage,
        COUNT(*) as count,
        COUNT(DISTINCT session_id) as unique_sessions
       FROM analytics_conversions
       WHERE (viewed_at >= ? AND viewed_at <= ?)
          OR (added_to_cart_at >= ? AND added_to_cart_at <= ?)
          OR (purchased_at >= ? AND purchased_at <= ?)
       GROUP BY funnel_stage
       ORDER BY FIELD(funnel_stage, 'view', 'cart', 'purchase')`,
      [startDate, endDate, startDate, endDate, startDate, endDate]
    );
    return rows;
  }
}

// ==================== ANALYTICS DASHBOARD ====================

export interface DashboardStats {
  total_sessions: number;
  total_page_views: number;
  total_events: number;
  avg_session_duration: number;
  bounce_rate: number;
  conversion_rate: number;
  unique_visitors: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface GeographicData {
  country: string;
  sessions: number;
  conversions: number;
}

export interface DeviceData {
  device_type: string;
  count: number;
  percentage: number;
}

export class AnalyticsDashboardModel {
  // Get dashboard stats for a period
  static async getDashboardStats(startDate: Date, endDate: Date): Promise<DashboardStats> {
    const [sessionStats] = await pool.query(
      `SELECT
        COUNT(*) as total_sessions,
        COUNT(DISTINCT user_id) as unique_visitors,
        SUM(page_views) as total_page_views,
        AVG(duration_seconds) as avg_duration,
        SUM(is_bounce) as bounces,
        SUM(is_converted) as conversions
       FROM analytics_sessions
       WHERE started_at >= ? AND started_at <= ?`,
      [startDate, endDate]
    );

    const [eventStats] = await pool.query(
      `SELECT COUNT(*) as total_events
       FROM analytics_events
       WHERE created_at >= ? AND created_at <= ?`,
      [startDate, endDate]
    );

    const stats = (sessionStats as any[])[0];
    const events = (eventStats as any[])[0];

    const totalSessions = stats?.total_sessions || 0;
    const bounces = stats?.bounces || 0;
    const conversions = stats?.conversions || 0;

    return {
      total_sessions: totalSessions,
      total_page_views: stats?.total_page_views || 0,
      total_events: events?.total_events || 0,
      avg_session_duration: Math.round(stats?.avg_duration || 0),
      bounce_rate: totalSessions > 0 ? (bounces / totalSessions) * 100 : 0,
      conversion_rate: totalSessions > 0 ? (conversions / totalSessions) * 100 : 0,
      unique_visitors: stats?.unique_visitors || 0,
    };
  }

  // Get time-series data for charts
  static async getTimeSeries(
    metric: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesData[]> {
    let query = '';

    switch (metric) {
      case 'sessions':
        query = `
          SELECT DATE(started_at) as date, COUNT(*) as value
          FROM analytics_sessions
          WHERE started_at >= ? AND started_at <= ?
          GROUP BY DATE(started_at)
          ORDER BY date ASC
        `;
        break;

      case 'page_views':
        query = `
          SELECT DATE(viewed_at) as date, COUNT(*) as value
          FROM analytics_page_views
          WHERE viewed_at >= ? AND viewed_at <= ?
          GROUP BY DATE(viewed_at)
          ORDER BY date ASC
        `;
        break;

      case 'events':
        query = `
          SELECT DATE(created_at) as date, COUNT(*) as value
          FROM analytics_events
          WHERE created_at >= ? AND created_at <= ?
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `;
        break;

      default:
        throw new Error(`Invalid metric: ${metric}`);
    }

    const [rows] = await pool.query(query, [startDate, endDate]);
    return rows as TimeSeriesData[];
  }

  // Get geographic distribution
  static async getGeographicData(startDate: Date, endDate: Date): Promise<GeographicData[]> {
    const [rows] = await pool.query(
      `SELECT
        country,
        COUNT(*) as sessions,
        SUM(is_converted) as conversions
       FROM analytics_sessions
       WHERE started_at >= ?
         AND started_at <= ?
         AND country IS NOT NULL
       GROUP BY country
       ORDER BY sessions DESC
       LIMIT 10`,
      [startDate, endDate]
    );
    return rows as GeographicData[];
  }

  // Get device breakdown
  static async getDeviceData(startDate: Date, endDate: Date): Promise<DeviceData[]> {
    const [rows] = await pool.query(
      `SELECT
        device_type,
        COUNT(*) as count
       FROM analytics_sessions
       WHERE started_at >= ?
         AND started_at <= ?
         AND device_type IS NOT NULL
       GROUP BY device_type`,
      [startDate, endDate]
    );

    const data = rows as any[];
    const total = data.reduce((sum, item) => sum + item.count, 0);

    return data.map((item) => ({
      device_type: item.device_type,
      count: item.count,
      percentage: total > 0 ? (item.count / total) * 100 : 0,
    }));
  }

  // Get top pages by views
  static async getTopPages(startDate: Date, endDate: Date, limit: number = 10): Promise<any> {
    const [rows] = await pool.query(
      `SELECT
        page_url,
        COUNT(*) as views,
        AVG(time_on_page_seconds) as avg_time
       FROM analytics_page_views
       WHERE viewed_at >= ? AND viewed_at <= ?
       GROUP BY page_url
       ORDER BY views DESC
       LIMIT ?`,
      [startDate, endDate, limit]
    );
    return rows;
  }
}

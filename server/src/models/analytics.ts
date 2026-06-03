import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import type { AnalyticsEvent } from '../services/analyticsService';

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

// Raw DB row shape (snake_case columns, includes generated id + created_at).
// The application uses the camelCase `AnalyticsEvent` from analyticsService
// as the input type — this row shape is only what reads return.
export interface AnalyticsEventRow {
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
  static async getEventsBySession(sessionId: string): Promise<AnalyticsEventRow[]> {
    const [rows] = await pool.query(
      `SELECT * FROM analytics_events
       WHERE session_id = ?
       ORDER BY created_at ASC`,
      [sessionId]
    );
    return rows as AnalyticsEventRow[];
  }

  // Get events by type within period
  static async getEventsByType(
    eventType: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsEventRow[]> {
    const [rows] = await pool.query(
      `SELECT * FROM analytics_events
       WHERE event_type = ?
       AND created_at >= ?
       AND created_at <= ?
       ORDER BY created_at DESC`,
      [eventType, startDate, endDate]
    );
    return rows as AnalyticsEventRow[];
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
  ip_address?: string;
}

// Tracks whether the optional `ip_address` column exists so we don't try to
// write to it on databases that haven't run the idempotent migration yet.
// Resolved once per process by `ensureAnalyticsSchema()`.
let sessionsHaveIpColumn = false;

/**
 * Idempotent schema top-up for the analytics tables. Adds the
 * `ip_address` column to `analytics_sessions` if it's missing — needed for
 * the unique-visitor count (dedupe by IP). Safe to call on every boot;
 * uses INFORMATION_SCHEMA so it works on both MySQL and MariaDB.
 */
export async function ensureAnalyticsSchema(): Promise<void> {
  try {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'analytics_sessions'
          AND COLUMN_NAME = 'ip_address'`
    );
    if ((cols as any[]).length === 0) {
      await pool.query(
        `ALTER TABLE analytics_sessions
           ADD COLUMN ip_address VARCHAR(45) DEFAULT NULL`
      );
    }
    sessionsHaveIpColumn = true;
  } catch (err) {
    // Non-fatal: if the ALTER fails (e.g. permissions), unique visitors just
    // falls back to per-session counting via COALESCE(ip_address, session_id).
    console.error('[Analytics] ensureAnalyticsSchema failed:', err);
    sessionsHaveIpColumn = false;
  }
}

export class AnalyticsSessionsModel {
  // Create or update session
  static async upsertSession(session: Partial<AnalyticsSession>): Promise<void> {
    const connection = await pool.getConnection();
    try {
      if (sessionsHaveIpColumn) {
        await connection.query(
          `INSERT INTO analytics_sessions
          (session_id, user_id, started_at, device_type, country, ip_address)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            ended_at = IFNULL(VALUES(ended_at), ended_at),
            duration_seconds = IFNULL(VALUES(duration_seconds), duration_seconds),
            page_views = IFNULL(VALUES(page_views), page_views),
            cart_additions = IFNULL(VALUES(cart_additions), cart_additions),
            is_bounce = IFNULL(VALUES(is_bounce), is_bounce),
            is_converted = IFNULL(VALUES(is_converted), is_converted),
            ip_address = IFNULL(VALUES(ip_address), ip_address)`,
          [
            session.session_id,
            session.user_id || null,
            session.started_at || new Date(),
            session.device_type || null,
            session.country || null,
            session.ip_address || null,
          ]
        );
      } else {
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
      }
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

  // Get conversion funnel data for a period. Returns one row per stage with
  // both the raw event count and the distinct-session count (the latter is
  // what the funnel rates should use so a single user adding 3 items to cart
  // doesn't inflate the cart stage). Counts are Number-coerced for safety.
  static async getConversionFunnel(startDate: Date, endDate: Date): Promise<any> {
    const [rows] = await pool.query(
      `SELECT
        funnel_stage,
        COUNT(*) AS count,
        COUNT(DISTINCT session_id) AS unique_sessions
       FROM analytics_conversions
       WHERE (viewed_at >= ? AND viewed_at <= ?)
          OR (added_to_cart_at >= ? AND added_to_cart_at <= ?)
          OR (purchased_at >= ? AND purchased_at <= ?)
       GROUP BY funnel_stage
       ORDER BY FIELD(funnel_stage, 'view', 'cart', 'purchase')`,
      [startDate, endDate, startDate, endDate, startDate, endDate]
    );
    return (rows as any[]).map((r) => ({
      funnel_stage: r.funnel_stage,
      count: Number(r.count) || 0,
      unique_sessions: Number(r.unique_sessions) || 0,
    }));
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
    // Unique-visitor expression depends on whether the optional ip_address
    // column exists (added by ensureAnalyticsSchema). Referencing a missing
    // column would error and break the whole endpoint, so guard it.
    const uniqueExpr = sessionsHaveIpColumn
      ? 'COUNT(DISTINCT COALESCE(ip_address, session_id))'
      : 'COUNT(DISTINCT session_id)';

    const [sessionStats] = await pool.query(
      `SELECT
        COUNT(*) AS total_sessions,
        -- Unique visitors: dedupe by IP when we have it, else fall back to the
        -- session id (so historical rows captured before IP tracking still
        -- count once each). Converges to true unique-by-IP as coverage grows.
        ${uniqueExpr} AS unique_visitors,
        COALESCE(SUM(page_views), 0)       AS total_page_views,
        COALESCE(AVG(duration_seconds), 0) AS avg_duration,
        -- Bounce = a session that saw at most one page. Computed live from
        -- page_views instead of the is_bounce flag (which was never being
        -- set by the tracker, so it always read 0).
        SUM(CASE WHEN page_views <= 1 THEN 1 ELSE 0 END) AS bounces,
        SUM(CASE WHEN is_converted = 1 THEN 1 ELSE 0 END) AS conversions
       FROM analytics_sessions
       WHERE started_at >= ? AND started_at <= ?`,
      [startDate, endDate]
    );

    const [eventStats] = await pool.query(
      `SELECT COUNT(*) AS total_events
       FROM analytics_events
       WHERE created_at >= ? AND created_at <= ?`,
      [startDate, endDate]
    );

    const stats = (sessionStats as any[])[0] || {};
    const events = (eventStats as any[])[0] || {};

    // mysql2 returns COUNT() as a JS number but SUM()/AVG() as DECIMAL
    // strings — coerce everything through Number() so downstream arithmetic
    // (and the client's `reduce`) never accidentally string-concatenates
    // (that was the "Conversões 00000000000" bug on the geographic card).
    const totalSessions = Number(stats.total_sessions) || 0;
    const bounces = Number(stats.bounces) || 0;
    const conversions = Number(stats.conversions) || 0;

    return {
      total_sessions: totalSessions,
      total_page_views: Number(stats.total_page_views) || 0,
      total_events: Number(events.total_events) || 0,
      avg_session_duration: Math.round(Number(stats.avg_duration) || 0),
      bounce_rate: totalSessions > 0 ? (bounces / totalSessions) * 100 : 0,
      conversion_rate: totalSessions > 0 ? (conversions / totalSessions) * 100 : 0,
      unique_visitors: Number(stats.unique_visitors) || 0,
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
    // Coerce `value` (COUNT/SUM) to a number so the chart's math is numeric.
    return (rows as any[]).map((r) => ({
      date: r.date,
      value: Number(r.value) || 0,
    })) as TimeSeriesData[];
  }

  // Get geographic distribution
  static async getGeographicData(startDate: Date, endDate: Date): Promise<GeographicData[]> {
    const [rows] = await pool.query(
      `SELECT
        country,
        COUNT(*) AS sessions,
        SUM(CASE WHEN is_converted = 1 THEN 1 ELSE 0 END) AS conversions
       FROM analytics_sessions
       WHERE started_at >= ?
         AND started_at <= ?
         AND country IS NOT NULL
         AND country <> ''
       GROUP BY country
       ORDER BY sessions DESC
       LIMIT 10`,
      [startDate, endDate]
    );
    // Number-coerce both columns — `conversions` is a DECIMAL string from
    // SUM(), which was being concatenated into "00000000000" on the client.
    return (rows as any[]).map((r) => ({
      country: r.country,
      sessions: Number(r.sessions) || 0,
      conversions: Number(r.conversions) || 0,
    })) as GeographicData[];
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

    const data = (rows as any[]).map((item) => ({
      device_type: item.device_type,
      count: Number(item.count) || 0,
    }));
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
    return (rows as any[]).map((r) => ({
      page_url: r.page_url,
      views: Number(r.views) || 0,
      avg_time: Number(r.avg_time) || 0,
    }));
  }

  // =========================================================================
  // VANGUARD-SCOPED ANALYTICS
  // =========================================================================
  // Same dashboard shapes as the OXLYN-wide methods above, but restricted to
  // traffic that touched at least one /vanguardscripts or /vanguardbundles
  // page. Useful for measuring the impact of the legacy catalogue shortlink
  // (e.g. YouTube descriptions pointing at /vanguardscripts). The LIKE
  // pattern `%vanguard%` covers top-level pages plus any future Vanguard
  // sub-routes (e.g. specific product pages under /product/<vanguard-slug>).

  static async getVanguardDashboardStats(startDate: Date, endDate: Date): Promise<DashboardStats> {
    const [sessionStats] = await pool.query(
      `SELECT
         COUNT(DISTINCT s.session_id) AS total_sessions,
         COUNT(DISTINCT s.user_id)    AS unique_visitors,
         AVG(s.duration_seconds)      AS avg_duration,
         SUM(s.is_bounce)             AS bounces,
         SUM(s.is_converted)          AS conversions
       FROM analytics_sessions s
       WHERE s.started_at >= ? AND s.started_at <= ?
         AND EXISTS (
           SELECT 1 FROM analytics_page_views pv
            WHERE pv.session_id = s.session_id
              AND pv.page_url LIKE '%vanguard%'
         )`,
      [startDate, endDate]
    );

    const [pageViewStats] = await pool.query(
      `SELECT COALESCE(SUM(view_count), 0) AS total_page_views
       FROM analytics_page_views
       WHERE viewed_at >= ? AND viewed_at <= ?
         AND page_url LIKE '%vanguard%'`,
      [startDate, endDate]
    );

    const [eventStats] = await pool.query(
      `SELECT COUNT(*) AS total_events
       FROM analytics_events
       WHERE created_at >= ? AND created_at <= ?
         AND page_url LIKE '%vanguard%'`,
      [startDate, endDate]
    );

    const stats = (sessionStats as any[])[0];
    const pageViews = (pageViewStats as any[])[0];
    const events = (eventStats as any[])[0];

    const totalSessions = Number(stats?.total_sessions || 0);
    const bounces = Number(stats?.bounces || 0);
    const conversions = Number(stats?.conversions || 0);

    return {
      total_sessions: totalSessions,
      total_page_views: Number(pageViews?.total_page_views || 0),
      total_events: Number(events?.total_events || 0),
      avg_session_duration: Math.round(Number(stats?.avg_duration || 0)),
      bounce_rate: totalSessions > 0 ? (bounces / totalSessions) * 100 : 0,
      conversion_rate: totalSessions > 0 ? (conversions / totalSessions) * 100 : 0,
      unique_visitors: Number(stats?.unique_visitors || 0),
    };
  }

  static async getVanguardTimeSeries(
    metric: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesData[]> {
    let query = '';
    switch (metric) {
      case 'sessions':
        query = `
          SELECT DATE(pv.viewed_at) AS date,
                 COUNT(DISTINCT pv.session_id) AS value
          FROM analytics_page_views pv
          WHERE pv.viewed_at >= ? AND pv.viewed_at <= ?
            AND pv.page_url LIKE '%vanguard%'
          GROUP BY DATE(pv.viewed_at)
          ORDER BY date ASC
        `;
        break;
      case 'page_views':
        query = `
          SELECT DATE(viewed_at) AS date,
                 SUM(view_count) AS value
          FROM analytics_page_views
          WHERE viewed_at >= ? AND viewed_at <= ?
            AND page_url LIKE '%vanguard%'
          GROUP BY DATE(viewed_at)
          ORDER BY date ASC
        `;
        break;
      case 'events':
        query = `
          SELECT DATE(created_at) AS date, COUNT(*) AS value
          FROM analytics_events
          WHERE created_at >= ? AND created_at <= ?
            AND page_url LIKE '%vanguard%'
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `;
        break;
      default:
        throw new Error(`Invalid metric: ${metric}`);
    }
    const [rows] = await pool.query(query, [startDate, endDate]);
    return (rows as any[]).map((r) => ({
      date: r.date,
      value: Number(r.value) || 0,
    })) as TimeSeriesData[];
  }

  static async getVanguardGeographicData(startDate: Date, endDate: Date): Promise<GeographicData[]> {
    const [rows] = await pool.query(
      `SELECT
         s.country,
         COUNT(DISTINCT s.session_id) AS sessions,
         SUM(CASE WHEN s.is_converted = 1 THEN 1 ELSE 0 END) AS conversions
       FROM analytics_sessions s
       WHERE s.started_at >= ? AND s.started_at <= ?
         AND s.country IS NOT NULL
         AND s.country <> ''
         AND EXISTS (
           SELECT 1 FROM analytics_page_views pv
            WHERE pv.session_id = s.session_id
              AND pv.page_url LIKE '%vanguard%'
         )
       GROUP BY s.country
       ORDER BY sessions DESC
       LIMIT 10`,
      [startDate, endDate]
    );
    return (rows as any[]).map((r) => ({
      country: r.country,
      sessions: Number(r.sessions) || 0,
      conversions: Number(r.conversions) || 0,
    })) as GeographicData[];
  }

  static async getVanguardDeviceData(startDate: Date, endDate: Date): Promise<DeviceData[]> {
    const [rows] = await pool.query(
      `SELECT
         s.device_type,
         COUNT(DISTINCT s.session_id) AS count
       FROM analytics_sessions s
       WHERE s.started_at >= ? AND s.started_at <= ?
         AND s.device_type IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM analytics_page_views pv
            WHERE pv.session_id = s.session_id
              AND pv.page_url LIKE '%vanguard%'
         )
       GROUP BY s.device_type`,
      [startDate, endDate]
    );
    const data = rows as any[];
    const total = data.reduce((sum, item) => sum + Number(item.count), 0);
    return data.map((item) => ({
      device_type: item.device_type,
      count: Number(item.count),
      percentage: total > 0 ? (Number(item.count) / total) * 100 : 0,
    }));
  }

  static async getVanguardTopPages(startDate: Date, endDate: Date, limit: number = 10): Promise<any> {
    const [rows] = await pool.query(
      `SELECT
         page_url,
         SUM(view_count) AS views,
         AVG(time_on_page_seconds) AS avg_time
       FROM analytics_page_views
       WHERE viewed_at >= ? AND viewed_at <= ?
         AND page_url LIKE '%vanguard%'
       GROUP BY page_url
       ORDER BY views DESC
       LIMIT ?`,
      [startDate, endDate, limit]
    );
    return rows;
  }
}

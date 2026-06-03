import { v4 as uuidv4 } from 'uuid';
import { getGeoLocationFromIP, extractIPFromRequest } from './geoService';
import { parseUserAgent, extractUserAgent } from './deviceDetectionService';

export interface AnalyticsEvent {
  eventId: string;
  eventType: string;
  sessionId: string;
  userId?: number;
  discordId?: string;
  pageUrl: string;
  packageName?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  country?: string;
  ipAddress?: string;
  eventData?: any;
}

export interface SessionInfo {
  sessionId: string;
  userId?: number;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  country?: string;
  ipAddress?: string;
}

/**
 * Enrich event with server-side data (IP, geo, device info)
 * @param event - Base event from client
 * @param req - Express request object
 * @returns Enriched event
 */
export function enrichEvent(event: Partial<AnalyticsEvent>, req: any): AnalyticsEvent {
  // Extract IP and geo data
  const ipAddress = extractIPFromRequest(req);
  const geo = getGeoLocationFromIP(ipAddress);

  // Extract device info from user agent
  const userAgent = extractUserAgent(req);
  const deviceInfo = parseUserAgent(userAgent);

  // Merge with client-provided data, server data takes precedence for security
  return {
    eventId: event.eventId || uuidv4(),
    eventType: event.eventType || 'unknown',
    sessionId: event.sessionId || uuidv4(),
    userId: event.userId,
    discordId: event.discordId,
    pageUrl: event.pageUrl || '',
    packageName: event.packageName,
    deviceType: event.deviceType || deviceInfo.deviceType,
    browser: event.browser || deviceInfo.browser || undefined,
    country: geo.country || undefined,
    ipAddress: ipAddress || undefined,
    eventData: event.eventData,
  };
}

/**
 * Enrich session info with server-side data
 * @param session - Base session from client
 * @param req - Express request object
 * @returns Enriched session
 */
export function enrichSessionInfo(session: Partial<SessionInfo>, req: any): SessionInfo {
  const ipAddress = extractIPFromRequest(req);
  const geo = getGeoLocationFromIP(ipAddress);
  const userAgent = extractUserAgent(req);
  const deviceInfo = parseUserAgent(userAgent);

  return {
    sessionId: session.sessionId || uuidv4(),
    userId: session.userId,
    deviceType: session.deviceType || deviceInfo.deviceType,
    country: geo.country || undefined,
    ipAddress: ipAddress || undefined,
  };
}

/**
 * Calculate period boundaries for analytics queries
 * @param period - Period string (e.g., '7d', '30d', '90d')
 * @returns Start and end dates
 */
export function calculatePeriod(period: string = '7d'): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  const match = period.match(/^(\d+)([dwmy])$/);
  if (!match) {
    // Default to 7 days
    startDate.setDate(startDate.getDate() - 7);
    return { startDate, endDate };
  }

  const [, amount, unit] = match;
  const value = parseInt(amount, 10);

  switch (unit) {
    case 'd':
      startDate.setDate(startDate.getDate() - value);
      break;
    case 'w':
      startDate.setDate(startDate.getDate() - value * 7);
      break;
    case 'm':
      startDate.setMonth(startDate.getMonth() - value);
      break;
    case 'y':
      startDate.setFullYear(startDate.getFullYear() - value);
      break;
  }

  return { startDate, endDate };
}

/**
 * Validate event type
 * @param eventType - Event type string
 * @returns Boolean indicating if valid
 */
export function isValidEventType(eventType: string): boolean {
  const validTypes = [
    'page_view',
    'package_view',
    'cart_add',
    'cart_remove',
    'checkout_start',
    'purchase',
    'search',
    'click',
    'scroll',
    'session_start',
    'session_end',
  ];

  return validTypes.includes(eventType);
}

/**
 * Sanitize page URL to prevent storing sensitive data
 * @param url - Page URL
 * @returns Sanitized URL
 */
export function sanitizePageUrl(url: string): string {
  try {
    const urlObj = new URL(url, 'https://dummy.com');
    // Remove sensitive query parameters
    const sensitiveParams = ['token', 'key', 'password', 'secret', 'auth'];
    sensitiveParams.forEach((param) => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });
    return urlObj.pathname + urlObj.search;
  } catch {
    // If URL parsing fails, just return the pathname part
    return url.split('?')[0];
  }
}

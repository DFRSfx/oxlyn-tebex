import geoip from 'geoip-lite';
import { analyticsLogger } from '../utils/analyticsLogger';

export interface GeoLocation {
  country: string | null;
  region: string | null;
  city: string | null;
  ll: [number, number] | null; // latitude, longitude
  timezone: string | null;
}

/**
 * Get geographic location from IP address using geoip-lite
 * @param ipAddress - IP address to lookup (IPv4 or IPv6)
 * @returns GeoLocation object with country, region, city, coordinates, and timezone
 */
export function getGeoLocationFromIP(ipAddress: string): GeoLocation {
  analyticsLogger.log('🌍 [GeoIP] Lookup for IP: ' + ipAddress);

  // Handle localhost and private IPs
  if (
    !ipAddress ||
    ipAddress === '::1' ||
    ipAddress === '127.0.0.1' ||
    ipAddress.startsWith('192.168.') ||
    ipAddress.startsWith('10.') ||
    ipAddress.startsWith('172.')
  ) {
    analyticsLogger.log('🌍 [GeoIP] Private/Local IP detected, returning null');
    return {
      country: null,
      region: null,
      city: null,
      ll: null,
      timezone: null,
    };
  }

  // Remove IPv6 prefix if present (e.g., ::ffff:192.168.1.1)
  const cleanIP = ipAddress.replace(/^::ffff:/, '');
  analyticsLogger.log('🌍 [GeoIP] Clean IP: ' + cleanIP);

  const geo = geoip.lookup(cleanIP);
  analyticsLogger.log('🌍 [GeoIP] Result:', geo);

  if (!geo) {
    analyticsLogger.log('🌍 [GeoIP] No geolocation data found');
    return {
      country: null,
      region: null,
      city: null,
      ll: null,
      timezone: null,
    };
  }

  return {
    country: geo.country || null,
    region: geo.region || null,
    city: geo.city || null,
    ll: geo.ll || null,
    timezone: geo.timezone || null,
  };
}

/**
 * Extract real IP from request, handling proxies and load balancers
 * @param req - Express request object
 * @returns IP address string
 */
export function extractIPFromRequest(req: any): string {
  // Check common headers for proxied requests
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, get the first one
    const ips = forwarded.split(',').map((ip: string) => ip.trim());
    return ips[0];
  }

  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return realIP as string;
  }

  // Fallback to socket IP
  let ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';

  // DEVELOPMENT ONLY: Simulate public IP for testing
  if (process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true') {
    const isPrivateIP =
      !ip ||
      ip === '::1' ||
      ip === '127.0.0.1' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.') ||
      ip.startsWith('::ffff:127.') ||
      ip.startsWith('::ffff:192.168.');

    if (isPrivateIP) {
      // Use Google's public DNS IP as test (US-based)
      // You can change this to any public IP for testing
      const testIP = process.env.TEST_IP || '8.8.8.8';
      analyticsLogger.log(`🧪 [DEV] Simulating public IP: ${testIP} (real: ${ip})`);
      return testIP;
    }
  }

  return ip;
}

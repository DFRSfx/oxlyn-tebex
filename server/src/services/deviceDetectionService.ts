export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceInfo {
  deviceType: DeviceType;
  browser: string | null;
  os: string | null;
}

/**
 * Parse user agent string to detect device type and browser
 * @param userAgent - User agent string from request headers
 * @returns DeviceInfo object with device type, browser, and OS
 */
export function parseUserAgent(userAgent: string | undefined): DeviceInfo {
  if (!userAgent) {
    return {
      deviceType: 'desktop',
      browser: null,
      os: null,
    };
  }

  const ua = userAgent.toLowerCase();

  // Detect device type
  let deviceType: DeviceType = 'desktop';

  // Check for tablet first (more specific)
  if (
    ua.includes('ipad') ||
    (ua.includes('android') && !ua.includes('mobile')) ||
    ua.includes('tablet') ||
    ua.includes('kindle') ||
    ua.includes('silk') ||
    ua.includes('playbook')
  ) {
    deviceType = 'tablet';
  }
  // Then check for mobile
  else if (
    ua.includes('mobile') ||
    ua.includes('iphone') ||
    ua.includes('ipod') ||
    ua.includes('android') ||
    ua.includes('blackberry') ||
    ua.includes('windows phone') ||
    ua.includes('webos')
  ) {
    deviceType = 'mobile';
  }

  // Detect browser
  let browser: string | null = null;

  if (ua.includes('edg/') || ua.includes('edge/')) {
    browser = 'Edge';
  } else if (ua.includes('chrome/') && !ua.includes('edg')) {
    browser = 'Chrome';
  } else if (ua.includes('safari/') && !ua.includes('chrome')) {
    browser = 'Safari';
  } else if (ua.includes('firefox/')) {
    browser = 'Firefox';
  } else if (ua.includes('opera/') || ua.includes('opr/')) {
    browser = 'Opera';
  } else if (ua.includes('msie') || ua.includes('trident/')) {
    browser = 'IE';
  }

  // Detect OS
  let os: string | null = null;

  if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('mac os x') || ua.includes('macos')) {
    os = 'macOS';
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    os = 'iOS';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  }

  return {
    deviceType,
    browser,
    os,
  };
}

/**
 * Extract user agent from request
 * @param req - Express request object
 * @returns User agent string or undefined
 */
export function extractUserAgent(req: any): string | undefined {
  return req.headers['user-agent'];
}

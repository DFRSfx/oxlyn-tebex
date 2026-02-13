export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceInfo {
  deviceType: DeviceType;
  browser: string | null;
  os: string | null;
  screenWidth: number;
  screenHeight: number;
}

/**
 * Detect device information from browser
 */
export class DeviceDetector {
  static detect(): DeviceInfo {
    const ua = navigator.userAgent.toLowerCase();

    return {
      deviceType: this.detectDeviceType(ua),
      browser: this.detectBrowser(ua),
      os: this.detectOS(ua),
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    };
  }

  private static detectDeviceType(ua: string): DeviceType {
    // Check for tablet first (more specific)
    if (
      ua.includes('ipad') ||
      (ua.includes('android') && !ua.includes('mobile')) ||
      ua.includes('tablet') ||
      ua.includes('kindle') ||
      ua.includes('silk') ||
      ua.includes('playbook')
    ) {
      return 'tablet';
    }

    // Then check for mobile
    if (
      ua.includes('mobile') ||
      ua.includes('iphone') ||
      ua.includes('ipod') ||
      ua.includes('android') ||
      ua.includes('blackberry') ||
      ua.includes('windows phone') ||
      ua.includes('webos')
    ) {
      return 'mobile';
    }

    return 'desktop';
  }

  private static detectBrowser(ua: string): string | null {
    if (ua.includes('edg/') || ua.includes('edge/')) {
      return 'Edge';
    } else if (ua.includes('chrome/') && !ua.includes('edg')) {
      return 'Chrome';
    } else if (ua.includes('safari/') && !ua.includes('chrome')) {
      return 'Safari';
    } else if (ua.includes('firefox/')) {
      return 'Firefox';
    } else if (ua.includes('opera/') || ua.includes('opr/')) {
      return 'Opera';
    } else if (ua.includes('msie') || ua.includes('trident/')) {
      return 'IE';
    }

    return null;
  }

  private static detectOS(ua: string): string | null {
    if (ua.includes('windows')) {
      return 'Windows';
    } else if (ua.includes('mac os x') || ua.includes('macos')) {
      return 'macOS';
    } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
      return 'iOS';
    } else if (ua.includes('android')) {
      return 'Android';
    } else if (ua.includes('linux')) {
      return 'Linux';
    }

    return null;
  }
}

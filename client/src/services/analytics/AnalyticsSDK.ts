import { v4 as uuidv4 } from 'uuid';
import { DeviceDetector } from './DeviceDetector';
import { SessionManager } from './SessionManager';
import { EventQueue, QueuedEvent } from './EventQueue';

export interface AnalyticsConfig {
  apiUrl: string;
  userId?: number;
  discordId?: string;
  debug?: boolean;
}

/**
 * Analytics SDK for tracking user behavior
 */
// Persisted across loads so a logged-in admin is suppressed from the very
// first byte on repeat visits (the SDK constructor reads this synchronously,
// before the first session-start fires).
const SUPPRESS_KEY = 'analytics_suppressed';

export class AnalyticsSDK {
  private config: AnalyticsConfig;
  private sessionManager: SessionManager;
  private eventQueue: EventQueue;
  private deviceInfo: ReturnType<typeof DeviceDetector.detect>;
  private isInitialized: boolean = false;
  private lastPageView: string | null = null;
  private pageViewDebounceTimer: NodeJS.Timeout | null = null;
  // When true, every outbound tracking call is a no-op. Used to keep admin
  // accounts (james, oxlyn, soares, …) out of the analytics entirely — their
  // sessions, page views, clicks, cart adds and purchases must never pollute
  // the storefront metrics.
  private suppressed: boolean = false;

  constructor(config: AnalyticsConfig) {
    this.config = {
      debug: false,
      ...config,
    };

    this.suppressed = AnalyticsSDK.readSuppressHint();
    this.deviceInfo = DeviceDetector.detect();
    this.sessionManager = new SessionManager();
    this.eventQueue = new EventQueue(this.sendEvents.bind(this));

    this.init();
  }

  private static readSuppressHint(): boolean {
    try {
      return localStorage.getItem(SUPPRESS_KEY) === '1';
    } catch {
      return false;
    }
  }

  /**
   * Enable/disable analytics suppression. Persists the choice so it survives
   * reloads. Called from the app whenever auth resolves the visitor's role.
   */
  setSuppressed(value: boolean): void {
    this.suppressed = value;
    try {
      localStorage.setItem(SUPPRESS_KEY, value ? '1' : '0');
    } catch {
      /* private mode — in-memory flag still applies for this session */
    }
    // If we just turned tracking back on and never started a session
    // (e.g. admin logged out), start one now so the visitor is counted.
    if (!value && !this.isInitialized) {
      this.init();
    }
  }

  /**
   * Initialize SDK
   */
  private async init(): Promise<void> {
    if (this.isInitialized || this.suppressed) {
      return;
    }

    try {
      await this.startSession();
      this.isInitialized = true;
    } catch (error) {
      console.error('[Analytics] Failed to initialize:', error);
    }
  }

  /**
   * Start analytics session
   */
  private async startSession(): Promise<void> {
    if (this.suppressed) return;
    const baseUrl = this.config.apiUrl.replace(/\/$/, '');
    const url = `${baseUrl}/analytics/session/start`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include', // ✅ FIX: needed for CORS with backend that expects credentials
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionManager.getSessionId(),
          userId: this.config.userId,
          deviceType: this.deviceInfo.deviceType,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to start session: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('[Analytics] Failed to start session:', error);
    }
  }

  /**
   * Track generic event
   */
  trackEvent(
    eventType: string,
    data?: {
      packageName?: string;
      eventData?: any;
    }
  ): void {
    if (this.suppressed) return;
    const event: QueuedEvent = {
      eventId: uuidv4(),
      eventType,
      sessionId: this.sessionManager.getSessionId(),
      userId: this.config.userId,
      discordId: this.config.discordId,
      pageUrl: window.location.pathname,
      packageName: data?.packageName,
      deviceType: this.deviceInfo.deviceType,
      browser: this.deviceInfo.browser || undefined,
      eventData: data?.eventData,
      timestamp: Date.now(),
    };
    this.eventQueue.add(event);
  }

  /**
   * Track page view (with debounce to prevent duplicates)
   */
  trackPageView(pageUrl?: string): void {
    if (this.suppressed) return;
    const url = pageUrl || window.location.pathname;

    if (this.lastPageView === url) {
      return;
    }

    if (this.pageViewDebounceTimer) {
      clearTimeout(this.pageViewDebounceTimer);
    }

    this.lastPageView = url;

    this.pageViewDebounceTimer = setTimeout(() => {
      this.lastPageView = null;
    }, 2000);

    this.trackEvent('page_view', {
      eventData: {
        url,
        title: document.title,
        referrer: document.referrer,
      },
    });

    const baseUrl = this.config.apiUrl.replace(/\/$/, '');
    fetch(`${baseUrl}/analytics/page-view`, {
      method: 'POST',
      credentials: 'include', // ✅ FIX
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionManager.getSessionId(),
        pageUrl: url,
        timeOnPage: 0,
      }),
    }).catch((err) => {
      console.error('[Analytics] Failed to track page view:', err);
    });
  }

  /**
   * Track package view
   */
  trackPackageView(packageName: string): void {
    this.trackEvent('package_view', { packageName });
    this.trackConversion(packageName, 'view');
  }

  /**
   * Track add to cart
   */
  trackCartAdd(packageName: string, price?: number): void {
    this.trackEvent('cart_add', { packageName, eventData: { price } });
    this.trackConversion(packageName, 'cart', price);
  }

  /**
   * Track purchase
   */
  trackPurchase(packageName: string, price: number): void {
    this.trackEvent('purchase', { packageName, eventData: { price } });
    this.trackConversion(packageName, 'purchase', price);
  }

  /**
   * Track conversion funnel stage
   */
  private trackConversion(
    packageName: string,
    funnelStage: 'view' | 'cart' | 'purchase',
    price?: number
  ): void {
    if (this.suppressed) return;
    const baseUrl = this.config.apiUrl.replace(/\/$/, '');
    fetch(`${baseUrl}/analytics/conversion`, {
      method: 'POST',
      credentials: 'include', // ✅ FIX
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionManager.getSessionId(),
        packageName,
        funnelStage,
        price,
      }),
    }).catch((err) => {
      console.error('[Analytics] Failed to track conversion:', err);
    });
  }

  /**
   * Send session heartbeat
   */
  async sendHeartbeat(): Promise<void> {
    if (this.suppressed) return;
    try {
      const baseUrl = this.config.apiUrl.replace(/\/$/, '');
      await fetch(`${baseUrl}/analytics/session/heartbeat`, {
        method: 'POST',
        credentials: 'include', // ✅ FIX
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionManager.getSessionId() }),
      });
    } catch {
      // best-effort
    }
  }

  /**
   * Send events to backend
   */
  private async sendEvents(events: QueuedEvent[]): Promise<void> {
    const baseUrl = this.config.apiUrl.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/analytics/events`, {
      method: 'POST',
      credentials: 'include', // ✅ FIX
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send events: ${response.statusText}`);
    }
  }

  /**
   * Update user info
   */
  setUser(userId?: number, discordId?: string): void {
    this.config.userId = userId;
    this.config.discordId = discordId;
  }

  getSessionId(): string {
    return this.sessionManager.getSessionId();
  }

  getDeviceInfo() {
    return this.deviceInfo;
  }

  async flush(): Promise<void> {
    await this.eventQueue.flush();
  }

  destroy(): void {
    this.eventQueue.destroy();
  }
}

// Singleton instance
let analyticsInstance: AnalyticsSDK | null = null;

export function initAnalytics(config: AnalyticsConfig): AnalyticsSDK {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsSDK(config);
  }
  return analyticsInstance;
}

export function getAnalytics(): AnalyticsSDK | null {
  return analyticsInstance;
}
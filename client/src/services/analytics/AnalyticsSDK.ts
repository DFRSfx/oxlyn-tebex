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
export class AnalyticsSDK {
  private config: AnalyticsConfig;
  private sessionManager: SessionManager;
  private eventQueue: EventQueue;
  private deviceInfo: ReturnType<typeof DeviceDetector.detect>;
  private isInitialized: boolean = false;
  private lastPageView: string | null = null;
  private pageViewDebounceTimer: NodeJS.Timeout | null = null;

  constructor(config: AnalyticsConfig) {
    this.config = {
      debug: false,
      ...config,
    };

    this.deviceInfo = DeviceDetector.detect();
    this.sessionManager = new SessionManager();
    this.eventQueue = new EventQueue(this.sendEvents.bind(this));

    this.init();
  }

  /**
   * Initialize SDK
   */
  private async init(): Promise<void> {
    if (this.isInitialized) {
      console.log('[Analytics] Already initialized, skipping');
      return;
    }

    console.log('[Analytics] Initializing SDK...', {
      apiUrl: this.config.apiUrl,
      debug: this.config.debug,
    });

    try {
      // Start session
      await this.startSession();

      this.isInitialized = true;

      console.log('[Analytics] SDK initialized successfully', {
        sessionId: this.sessionManager.getSessionId(),
        deviceType: this.deviceInfo.deviceType,
        browser: this.deviceInfo.browser,
      });
    } catch (error) {
      console.error('[Analytics] Failed to initialize:', error);
    }
  }

  /**
   * Start analytics session
   */
  private async startSession(): Promise<void> {
    // Remove trailing slash from apiUrl if present
    const baseUrl = this.config.apiUrl.replace(/\/$/, '');
    const url = `${baseUrl}/analytics/session/start`;
    console.log('[Analytics] Starting session...', { url });

    try {
      const response = await fetch(url, {
        method: 'POST',
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

      console.log('[Analytics] Session started successfully');
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

    console.log('[Analytics] 🎯 Event created:', JSON.stringify(event, null, 2));
    this.eventQueue.add(event);

    console.log('[Analytics] Event tracked:', {
      eventType,
      packageName: data?.packageName,
      queueSize: this.eventQueue.size(),
    });
  }

  /**
   * Track page view (with debounce to prevent duplicates)
   */
  trackPageView(pageUrl?: string): void {
    const url = pageUrl || window.location.pathname;

    // Debounce: Don't track if same page was just tracked
    if (this.lastPageView === url) {
      console.log('[Analytics] Page view debounced:', url);
      return;
    }

    // Clear previous debounce timer
    if (this.pageViewDebounceTimer) {
      clearTimeout(this.pageViewDebounceTimer);
    }

    this.lastPageView = url;

    // Reset debounce after 2 seconds
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

    // Also send to dedicated page view endpoint
    const baseUrl = this.config.apiUrl.replace(/\/$/, '');
    fetch(`${baseUrl}/analytics/page-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionManager.getSessionId(),
        pageUrl: url,
        timeOnPage: 0,
      }),
    }).catch((error) => {
      if (this.config.debug) {
        console.error('[Analytics] Failed to track page view:', error);
      }
    });
  }

  /**
   * Track package view
   */
  trackPackageView(packageName: string): void {
    this.trackEvent('package_view', {
      packageName,
    });

    // Track conversion funnel
    this.trackConversion(packageName, 'view');
  }

  /**
   * Track add to cart
   */
  trackCartAdd(packageName: string, price?: number): void {
    this.trackEvent('cart_add', {
      packageName,
      eventData: { price },
    });

    // Track conversion funnel
    this.trackConversion(packageName, 'cart', price);
  }

  /**
   * Track purchase
   */
  trackPurchase(packageName: string, price: number): void {
    this.trackEvent('purchase', {
      packageName,
      eventData: { price },
    });

    // Track conversion funnel
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
    const baseUrl = this.config.apiUrl.replace(/\/$/, '');
    fetch(`${baseUrl}/analytics/conversion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionManager.getSessionId(),
        packageName,
        funnelStage,
        price,
      }),
    }).catch((error) => {
      if (this.config.debug) {
        console.error('[Analytics] Failed to track conversion:', error);
      }
    });
  }

  /**
   * Send session heartbeat
   */
  async sendHeartbeat(): Promise<void> {
    try {
      const baseUrl = this.config.apiUrl.replace(/\/$/, '');
      await fetch(`${baseUrl}/analytics/session/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionManager.getSessionId(),
        }),
      });
    } catch (error) {
      if (this.config.debug) {
        console.error('[Analytics] Failed to send heartbeat:', error);
      }
    }
  }

  /**
   * Send events to backend
   */
  private async sendEvents(events: QueuedEvent[]): Promise<void> {
    const baseUrl = this.config.apiUrl.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/analytics/events`, {
      method: 'POST',
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

    if (this.config.debug) {
      console.log('[Analytics] User updated:', { userId, discordId });
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionManager.getSessionId();
  }

  /**
   * Get device info
   */
  getDeviceInfo() {
    return this.deviceInfo;
  }

  /**
   * Flush all pending events
   */
  async flush(): Promise<void> {
    await this.eventQueue.flush();
  }

  /**
   * Destroy SDK and cleanup
   */
  destroy(): void {
    this.eventQueue.destroy();
  }
}

// Singleton instance
let analyticsInstance: AnalyticsSDK | null = null;

/**
 * Initialize analytics SDK
 */
export function initAnalytics(config: AnalyticsConfig): AnalyticsSDK {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsSDK(config);
  }
  return analyticsInstance;
}

/**
 * Get analytics instance
 */
export function getAnalytics(): AnalyticsSDK | null {
  return analyticsInstance;
}

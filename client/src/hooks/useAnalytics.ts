import { useEffect, useCallback, useRef } from 'react';
import { initAnalytics, getAnalytics } from '../services/analytics/AnalyticsSDK';

/**
 * React hook for analytics tracking
 */
export function useAnalytics() {
  const analyticsRef = useRef(getAnalytics());

  useEffect(() => {
    // Initialize analytics if not already initialized
    if (!analyticsRef.current) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      console.log('[useAnalytics] Initializing analytics SDK...', {
        apiUrl,
        debug: import.meta.env.DEV,
      });

      analyticsRef.current = initAnalytics({
        apiUrl,
        debug: import.meta.env.DEV,
      });

      console.log('[useAnalytics] Analytics SDK initialized:', analyticsRef.current);
    } else {
      console.log('[useAnalytics] Using existing analytics instance');
    }

    // Setup heartbeat every 5 minutes
    const heartbeatInterval = setInterval(() => {
      analyticsRef.current?.sendHeartbeat();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, []);

  const trackPageView = useCallback((pageUrl?: string) => {
    analyticsRef.current?.trackPageView(pageUrl);
  }, []);

  const trackEvent = useCallback(
    (eventType: string, data?: { packageName?: string; eventData?: any }) => {
      analyticsRef.current?.trackEvent(eventType, data);
    },
    []
  );

  const trackPackageView = useCallback((packageName: string) => {
    analyticsRef.current?.trackPackageView(packageName);
  }, []);

  const trackCartAdd = useCallback((packageName: string, price?: number) => {
    analyticsRef.current?.trackCartAdd(packageName, price);
  }, []);

  const trackPurchase = useCallback((packageName: string, price: number) => {
    analyticsRef.current?.trackPurchase(packageName, price);
  }, []);

  const setUser = useCallback((userId?: number, discordId?: string) => {
    analyticsRef.current?.setUser(userId, discordId);
  }, []);

  const flush = useCallback(async () => {
    await analyticsRef.current?.flush();
  }, []);

  return {
    trackPageView,
    trackEvent,
    trackPackageView,
    trackCartAdd,
    trackPurchase,
    setUser,
    flush,
    analytics: analyticsRef.current,
  };
}

import Tebex from '@tebexio/tebex.js';
import { getAnalytics } from '../services/analytics/AnalyticsSDK';

const COLORS = [
  { name: 'primary' as const, color: '#FF9500' },
  { name: 'secondary' as const, color: '#FF3B30' },
];

export interface CheckoutItem {
  name: string;
  price: number;
}

export interface CheckoutCallbacks {
  /** Called when the popup opens */
  onOpen?: () => void;
  /** Called when the popup is closed/dismissed */
  onClose?: () => void;
  /** Called on successful payment */
  onComplete?: (event?: any) => void;
  /** Called on payment error */
  onError?: (event?: any) => void;
}

/**
 * Launch the Tebex.js checkout popup AND wire up analytics + lifecycle callbacks.
 *
 * The `items` parameter is the basket snapshot at the moment of launch — it is
 * used to (a) emit a `checkout_started` event and (b) emit `trackPurchase` for
 * each item once `payment:complete` fires.
 *
 * Listeners are registered once per launch. Tebex.checkout.on() persists across
 * launches, so we de-dupe via the module-level `listenersBound` flag below.
 */
let listenersBound = false;

export function launchTebexCheckout(
  ident: string,
  items: CheckoutItem[] = [],
  callbacks: CheckoutCallbacks = {}
) {
  Tebex.checkout.init({ ident, theme: 'dark', colors: COLORS });

  // Bind global lifecycle listeners only once. Each launch updates the snapshot
  // of items via the closure on `currentItems` below.
  bindLifecycleListeners(callbacks, items);

  // Track checkout_started before launching
  const analytics = getAnalytics();
  if (analytics) {
    const totalValue = items.reduce((sum, i) => sum + (i.price || 0), 0);
    analytics.trackEvent('checkout_started', {
      eventData: {
        ident,
        itemCount: items.length,
        totalValue,
        items: items.map((i) => ({ name: i.name, price: i.price })),
      },
    });
  }

  Tebex.checkout.launch();
}

// We keep the latest items + callbacks in module-level refs so the bound
// listeners always see the current launch's data.
let currentItems: CheckoutItem[] = [];
let currentCallbacks: CheckoutCallbacks = {};

function bindLifecycleListeners(
  callbacks: CheckoutCallbacks,
  items: CheckoutItem[]
) {
  currentItems = items;
  currentCallbacks = callbacks;

  if (listenersBound) return;
  listenersBound = true;

  Tebex.checkout.on('open', () => {
    const analytics = getAnalytics();
    analytics?.trackEvent('checkout_opened');
    currentCallbacks.onOpen?.();
  });

  Tebex.checkout.on('close', () => {
    const analytics = getAnalytics();
    analytics?.trackEvent('checkout_closed');
    currentCallbacks.onClose?.();
  });

  Tebex.checkout.on('payment:complete', (event: any) => {
    const analytics = getAnalytics();
    if (analytics) {
      // Fire trackPurchase for each item — this is what populates the
      // `purchase` stage of the conversion funnel.
      currentItems.forEach((item) => {
        analytics.trackPurchase(item.name, item.price);
      });
      // Flush immediately — the user might navigate away after a successful
      // payment and we don't want to lose the events.
      analytics.flush().catch(() => {
        /* swallow — best-effort */
      });
      // Set idempotency key so the /checkout/success fallback page knows
      // not to double-count this purchase.
      try {
        sessionStorage.setItem(
          'analytics_last_purchase_tracked',
          Date.now().toString()
        );
      } catch {
        /* sessionStorage may be unavailable — fine */
      }
    }
    currentCallbacks.onComplete?.(event);
  });

  Tebex.checkout.on('payment:error', (event: any) => {
    const analytics = getAnalytics();
    analytics?.trackEvent('payment_error', {
      eventData: { error: event?.message || 'unknown' },
    });
    currentCallbacks.onError?.(event);
  });
}

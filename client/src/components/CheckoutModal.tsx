import { useEffect } from 'react';
import { launchTebexCheckout, CheckoutItem } from '../utils/tebexCheckout';
import { useAnalytics } from '../hooks/useAnalytics';

interface CheckoutModalProps {
  isOpen: boolean;
  ident: string;
  /**
   * Items in the basket at launch time. Required for the analytics funnel —
   * without this, trackPurchase() can't be fired with the correct package
   * names/prices when payment:complete arrives from Tebex.
   */
  items?: CheckoutItem[];
  onClose: () => void;
  /** Optional callback fired when Tebex reports a successful payment */
  onPaymentComplete?: () => void;
  /** Optional callback fired on Tebex payment error */
  onPaymentError?: (error: any) => void;
}

export default function CheckoutModal({
  isOpen,
  ident,
  items = [],
  onClose,
  onPaymentComplete,
  onPaymentError,
}: CheckoutModalProps) {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    if (!isOpen || !ident) return;

    launchTebexCheckout(ident, items, {
      onComplete: () => {
        trackEvent('checkout_modal_payment_complete', {
          eventData: { ident, itemCount: items.length },
        });
        onPaymentComplete?.();
      },
      onError: (event) => {
        trackEvent('checkout_modal_payment_error', {
          eventData: { ident, error: event?.message || 'unknown' },
        });
        onPaymentError?.(event);
      },
    });

    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ident]);

  return null;
}
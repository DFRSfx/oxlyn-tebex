import { memo, useEffect, useMemo, useState } from 'react';
import { API_URL } from '../config/api';
import { useCurrency } from '../context/CurrencyContext';

interface RecentPayment {
  id: number;
  buyerName: string;
  avatarFilename: string;
  amount: number;
  minutesAgo: number;
  enabled: boolean;
}

/**
 * "Recent Payments" — marquee of fake-but-realistic recent purchases,
 * styled like CustomerReviews. The data (names, avatars, amounts) is
 * admin-managed and identical for every visitor; only the "Today at HH:MM"
 * timestamp adapts to the viewer's local clock, computed client-side as
 *   `new Date(Date.now() - minutesAgo * 60_000)`
 * which automatically picks up the visitor's timezone.
 */
export default function RecentPaymentsSection() {
  const [payments, setPayments] = useState<RecentPayment[]>([]);
  const { format: formatPrice } = useCurrency();

  useEffect(() => {
    const fetchPayments = () => {
      fetch(`${API_URL}/recent-payments`)
        .then((r) => r.json())
        .then((data) => Array.isArray(data) && setPayments(data))
        .catch(() => setPayments([]));
    };
    fetchPayments();
    // Server rotates the visible set every 10 minutes; poll a bit more
    // frequently so users on long sessions catch the new buyers without
    // refreshing manually. The refetch implicitly refreshes the displayed
    // wall-clock too, so we don't need a separate per-minute tick.
    const id = setInterval(fetchPayments, 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  // Duplicate the list so the marquee loop is seamless. Same trick as the
  // CustomerReviews marquee.
  const loop = useMemo(() => [...payments, ...payments], [payments]);

  if (payments.length === 0) return null;

  return (
    <section className="relative py-16 sm:py-20" id="recent-payments">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
            <span className="text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.20)]">Recent </span>
            <span className="gradient-text-brand">Payments</span>
          </h2>
          <p className="text-sm text-gray-500 mt-4 font-light">
            Trusted by thousands of customers with over{' '}
            <b className="text-white">12.482+</b> successful sales worldwide.
          </p>
        </div>

        <div className="reviews-marquee">
          <div className="reviews-marquee-track">
            {loop.map((p, i) => {
              const isDuplicate = i >= payments.length;
              return (
                <div
                  key={i}
                  className="payment-marquee-slot"
                  ref={isDuplicate ? (el) => el?.setAttribute('inert', '') : undefined}
                >
                  <PaymentRow payment={p} formatPrice={formatPrice} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// Generative-avatar palette. Buyers without a photo render as a coloured
// square with the first letter of their name in white — like the default
// Discord / Gmail tiles. Colour is picked deterministically by hashing the
// buyer name so the same person always gets the same colour across visits.
const LETTER_AVATAR_COLORS = [
  '#d4253b', // brand rose-red
  '#6366f1', // indigo
  '#a64fff', // violet
  '#22c55e', // emerald
  '#f59e0b', // amber
  '#0ea5e9', // sky
  '#ec4899', // pink
  '#14b8a6', // teal
];
function pickAvatarColor(name: string): string {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h + name.charCodeAt(i)) | 0;
  return LETTER_AVATAR_COLORS[Math.abs(h) % LETTER_AVATAR_COLORS.length];
}

const PaymentRow = memo(function PaymentRow({ payment, formatPrice }: { payment: RecentPayment; formatPrice: (eur: number) => string }) {
  // Visitor's local clock minus the server-computed offset. When the gap
  // pushes the timestamp across midnight (e.g. someone browsing at 1 AM with
  // a 6h-old card) we switch the prefix to "Yesterday" so the label doesn't
  // lie about the calendar day.
  const now = new Date();
  const time = new Date(Date.now() - payment.minutesAgo * 60_000);
  const localTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dayLabel = time.toDateString() === now.toDateString() ? 'Today' : 'Yesterday';

  // Empty avatarFilename → generative letter avatar (coloured square with
  // first initial in white). Same dimensions as the photo avatar so the
  // marquee row layout stays identical.
  const hasPhoto = payment.avatarFilename && payment.avatarFilename.trim().length > 0;
  const initial = (payment.buyerName.trim().charAt(0) || '?').toUpperCase();

  return (
    <div className="payment-row">
      {hasPhoto ? (
        <img
          src={`/recentpayments/${payment.avatarFilename}`}
          alt=""
          loading="lazy"
          decoding="async"
          width={44}
          height={44}
          className="payment-row-avatar"
        />
      ) : (
        <div
          className="payment-row-avatar payment-row-avatar-letter"
          style={{ backgroundColor: pickAvatarColor(payment.buyerName) }}
          aria-hidden="true"
        >
          {initial}
        </div>
      )}
      <div className="payment-row-meta">
        <div className="payment-row-name">{payment.buyerName}</div>
        <div className="payment-row-time">{dayLabel} {localTime}</div>
      </div>
      <div className="payment-row-amount">
        {formatPrice(payment.amount)}
      </div>
    </div>
  );
});

import { memo, useMemo } from 'react';
import { Star, ShoppingCart } from 'lucide-react';

interface CustomerReview {
  name: string;
  date: string;
  stars: number;
  text: string;
  product: string;
  /** Filename inside /public/recentpayments/ (same folder as Recent Payments
   *  avatars). Keeping the avatar pool in one place avoids managing two
   *  separate image directories. */
  avatar: string;
}

// Seeded reviews — admin editing can come later via a `customer_reviews`
// table. Each review uses a distinct avatar from /public/recentpayments/ so
// no face repeats inside the carousel.
const REVIEWS: CustomerReview[] = [
  {
    name: 'Sarah Miller',
    date: 'Oct 5, 2025',
    stars: 5,
    text: 'Absolutely amazing quality! Drivers can finally roleplay full trucking shifts without any desync. Best purchase I\'ve made for my server.',
    product: 'Truck Job System',
    avatar: 'loner.jpg',
  },
  {
    name: 'Mike Chen',
    date: 'Oct 8, 2025',
    stars: 5,
    text: 'Very satisfied with the product. Support team responded quickly and helped with setup. The boss menu UI is exactly what we needed.',
    product: 'Boss Menu System',
    avatar: 'joshua.jpg',
  },
  {
    name: 'Emma Davis',
    date: 'Oct 12, 2025',
    stars: 5,
    text: 'Switched our entire dispatch flow. The MDT UI is unreal — players actually want to do PD now. Resmon dropped from 1.4ms to 0.04ms.',
    product: 'MDT & Dispatch System',
    avatar: 'cassandra.jpg',
  },
  {
    name: 'Lucas Pereira',
    date: 'Oct 18, 2025',
    stars: 5,
    text: 'We tried every backpack on Tebex — OXLYN V3 is the only one that doesn\'t desync inventories under load. If you run 100+ players, this is the one.',
    product: 'Backpack V3 System',
    avatar: 'meregali.jpg',
  },
  {
    name: 'Anna Schmidt',
    date: 'Oct 22, 2025',
    stars: 5,
    text: 'Dropped the admin menu in and configured permissions in 10 minutes. Worth every cent. Support replied on Discord at midnight on a Sunday. Who does that?',
    product: 'Admin Menu System',
    avatar: 'casie.jpg',
  },
  {
    name: 'James Wilson',
    date: 'Oct 27, 2025',
    stars: 5,
    text: 'Report queue + history is gold. We finally stopped losing tickets in Discord DMs. Staff workflow is night and day.',
    product: 'Reports Menu System',
    avatar: 'stuart.jpg',
  },
  {
    name: 'Daniel Ortiz',
    date: 'Nov 2, 2025',
    stars: 5,
    text: 'Player restrictions saved our whitelisting flow. Granular control with one config file, no spaghetti. Exactly what we expected.',
    product: 'Player Restriction System',
    avatar: 'calib.jpg',
  },
];

export default function CustomerReviewsSection() {
  // Marketing-curated rating snapshot — the seeded REVIEWS array is just the
  // marquee content, not the source of the headline number. Admin can edit
  // the rating + total here as their public Trustpilot/G2 number changes.
  const RATING_AVERAGE = '4.8';
  const RATING_TOTAL = '8.548';

  // Duplicate the list so the marquee loop is seamless — when the first copy
  // scrolls past, the second copy is already in position to continue.
  const loop = useMemo(() => [...REVIEWS, ...REVIEWS], []);

  return (
    <section className="relative py-20 sm:py-24" id="reviews">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10">
        {/* Title — pill sits on its own row below the heading */}
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
            <span className="text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.20)]">Customer </span>
            <span className="gradient-text-brand">Reviews</span>
          </h2>

          <div className="mt-6 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full glass-luxury text-sm">
            <span className="text-gray-400">Average</span>
            <span className="text-white font-bold">{RATING_AVERAGE}</span>
            <span className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star
                  key={i}
                  className="w-4 h-4 text-red-400 fill-red-400"
                  strokeWidth={0}
                />
              ))}
            </span>
            <span className="text-gray-500 text-[12px]">Based on {RATING_TOTAL} reviews</span>
          </div>

          <p className="text-sm text-gray-500 mt-4 font-light">
            Real feedback from our community after installing and using our{' '}
            <b className="text-white">FiveM</b> resources.
          </p>
        </div>

        {/* Infinite marquee — always scrolling, pauses on hover */}
        <div className="reviews-marquee">
          <div className="reviews-marquee-track">
            {loop.map((r, i) => {
              const isDuplicate = i >= REVIEWS.length;
              return (
                <div
                  key={i}
                  className="reviews-marquee-slot"
                  // `inert` on the duplicated half removes its descendants
                  // from the focus + accessibility tree without flagging the
                  // "aria-hidden + focusable" audit. See Top Scripts marquee
                  // for the same pattern.
                  ref={isDuplicate ? (el) => el?.setAttribute('inert', '') : undefined}
                >
                  <ReviewCard review={r} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

const ReviewCard = memo(function ReviewCard({ review }: { review: CustomerReview }) {
  return (
    <div className="review-card">
      <div className="review-card-header">
        <img
          src={`/recentpayments/${review.avatar}`}
          alt=""
          loading="lazy"
          decoding="async"
          width={42}
          height={42}
          className="review-card-avatar"
        />
        <div>
          <p className="review-card-name">{review.name}</p>
          <p className="review-card-date">{review.date}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 my-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < review.stars ? 'text-red-400 fill-red-400' : 'text-zinc-700'}`}
            strokeWidth={0}
          />
        ))}
      </div>
      <p className="review-card-text">{review.text}</p>
      <div className="review-card-product">
        <ShoppingCart className="w-3.5 h-3.5" />
        <span>{review.product}</span>
      </div>
    </div>
  );
});

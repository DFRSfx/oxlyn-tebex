import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShoppingCart,
  Trash2,
  Shield,
  Zap,
  Star,
  Tag,
  AlertTriangle,
  Crown,
  ArrowRight,
  X,
  CheckCircle2,
  ChevronRight,
  Lock,
  Sparkles,
  Check,
  RefreshCw,
  Headphones,
  Wrench,
  Info,
} from 'lucide-react';
import { useTebex } from '../context/TebexContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { formatCategoryName } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { tebexService } from '../services/tebexService';
import { deduplicatePackages } from '../utils/packageDedupe';
import { mapTebexPackageToPackage } from '../utils/packageMapper';
import { Package } from '../types';
import { useAnalytics } from '../hooks/useAnalytics';
import { launchTebexCheckout } from '../utils/tebexCheckout';
import { useSEO } from '../hooks/useSEO';
import OptimizedImage from '../components/OptimizedImage';
import {
  findSubscriptionPackage,
  isVanguard,
  isInstallationAddon,
  INSTALL_ADDON_TEBEX_ID,
} from '../utils/isBundle';

const DiscordIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

// ---------------------------------------------------------------------------
// Subscription tiers — mirrors /subscription so cart upsell and dedicated page
// stay in lockstep. Change values here and on SubscriptionPage.
// ---------------------------------------------------------------------------
type CartTier = {
  id: 'monthly' | 'quarterly' | 'yearly';
  name: string;
  price: number;
  period: string;
  monthlyEquivalent: number;
  highlight?: boolean;
  badge?: string;
  description: string;
  cta: string;
};

const CART_TIERS: CartTier[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 19.99,
    period: '/month',
    monthlyEquivalent: 19.99,
    description: 'Try the full catalog. Cancel anytime.',
    cta: 'Start monthly',
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: 199,
    period: '/year',
    monthlyEquivalent: 16.58,
    highlight: true,
    badge: 'Best value',
    description: 'Save 17% — equivalent to 2 months free.',
    cta: 'Start yearly',
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    price: 54.99,
    period: '/3 months',
    monthlyEquivalent: 18.33,
    description: 'A quarter at a time. Cancel anytime.',
    cta: 'Start quarterly',
  },
];

const CartPage: React.FC = () => {
  const {
    cartItems,
    addToCart,
    removeFromCart,
    basketIdent,
    isLoggedIn,
    applyCoupon,
    removeCoupon,
    appliedCoupon,
    login,
    isInCart,
  } = useTebex();
  const { isAuthenticated: isDiscordConnected, getDiscordAuthUrl } = useAuth();
  const { format: formatPrice } = useCurrency();
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();

  // Cart pages must NOT be indexed (transactional, user-specific) — landing-page skill
  // Description still useful for OG / share previews.
  useSEO({
    title: 'Your Cart · Secure Checkout — Oxlyn Software',
    description:
      'Review your FiveM scripts and subscriptions, apply OXLYN-10 for 10% off, and check out securely via Tebex. Instant delivery, 7-day refund, lifetime updates.',
    canonical: '/cart',
    index: false,
  });

  const handleDiscordConnect = async () => {
    try {
      const authUrl = await getDiscordAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Discord connect failed:', error);
    }
  };

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isRemovingCoupon, setIsRemovingCoupon] = useState(false);
  const [suggestionPool, setSuggestionPool] = useState<Package[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const suggestionPausedRef = useRef(false);
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  const [pendingTier, setPendingTier] = useState<CartTier['id'] | null>(null);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [addonPending, setAddonPending] = useState(false);

  // The real script line items (everything except the install add-on, which is
  // surfaced only as the order-bump toggle — never as a normal cart row).
  const scriptItems = useMemo(
    () => cartItems.filter((item) => !isInstallationAddon(item)),
    [cartItems]
  );
  // The "Oxlyn Installation" package (CartPage's allPackages fetch is NOT
  // catalog-filtered, so we can still resolve it here to add it).
  const addonPkg = useMemo(
    () => allPackages.find((p) => isInstallationAddon(p)),
    [allPackages]
  );
  const addonPrice = addonPkg?.price ?? 9.99;
  const addonInCart = isInCart(INSTALL_ADDON_TEBEX_ID);
  // Dynamic copy: name the script when there's exactly one, else stay generic.
  const installTargetName = scriptItems.length === 1 ? scriptItems[0].name : 'your scripts';

  // Toggle the install add-on as a REAL Tebex basket line so its price flows
  // into checkout (not just the UI). Default OFF, never pre-selected.
  const handleToggleAddon = async () => {
    if (addonPending) return;
    setAddonPending(true);
    try {
      if (addonInCart) {
        await removeFromCart(INSTALL_ADDON_TEBEX_ID);
        trackEvent('cart_addon_removed', { packageName: 'Oxlyn Installation' });
      } else {
        await addToCart({
          id: INSTALL_ADDON_TEBEX_ID,
          name: addonPkg?.name || 'Oxlyn Installation',
          price: addonPrice,
          image: addonPkg?.image || '',
          qty: 1,
          currency: 'EUR',
          category: addonPkg?.category,
        });
        trackEvent('cart_addon_added', {
          packageName: 'Oxlyn Installation',
          eventData: { price: addonPrice },
        });
      }
    } finally {
      setAddonPending(false);
    }
  };

  // Never leave an add-on-only basket: if every script is removed while the
  // install add-on is still in the cart, drop the add-on too.
  useEffect(() => {
    if (addonInCart && scriptItems.length === 0) {
      removeFromCart(INSTALL_ADDON_TEBEX_ID);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptItems.length, addonInCart]);

  // Resolve each subscription tier to its real Tebex SKU. When a SKU is
  // missing (catalog still loading or admin removed it) the tier card falls
  // back to the /subscription page so users still have a path to subscribe.
  const tierPackages = useMemo(
    () => ({
      monthly: findSubscriptionPackage('monthly', allPackages),
      quarterly: findSubscriptionPackage('quarterly', allPackages),
      yearly: findSubscriptionPackage('yearly', allPackages),
    }),
    [allPackages]
  );

  // True when the cart already contains one of the subscription SKUs — we
  // hide the upsell in that case so users don't accidentally double-add.
  const hasSubscriptionInCart = useMemo(() => {
    if (!allPackages.length) return false;
    const subIds = new Set(
      Object.values(tierPackages)
        .filter((p): p is Package => !!p)
        .map((p) => String(p.tebexPackageId))
    );
    return cartItems.some((item) => subIds.has(String(item.id)));
  }, [cartItems, tierPackages, allPackages.length]);

  const handleTierClick = async (tierId: CartTier['id']) => {
    const pkg = tierPackages[tierId];
    if (!pkg || !pkg.tebexPackageId) {
      navigate('/subscription');
      return;
    }
    setPendingTier(tierId);
    try {
      const ok = await addToCart({
        id: pkg.tebexPackageId,
        name: pkg.name,
        price: pkg.price,
        image: pkg.image,
        qty: 1,
        currency: 'EUR',
        category: pkg.category,
      });
      if (ok) {
        trackEvent('cart_subscription_added', {
          packageName: pkg.name,
          eventData: { tier: tierId, price: pkg.price },
        });
      }
    } finally {
      setPendingTier(null);
    }
  };

  // Track cart view on mount
  useEffect(() => {
    if (isLoggedIn && cartItems.length > 0) {
      trackEvent('cart_viewed', {
        eventData: {
          items_count: cartItems.length,
          total_value: cartItems.reduce((sum, item) => sum + item.price * item.qty, 0),
          has_coupon: !!appliedCoupon,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch packages once on mount so subscription tier lookups (used by the
  // upsell) and featured-scripts (used by the "You might also like" section)
  // share the same source of truth.
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const tebexPackages = await tebexService.fetchPackages();
        const mappedPackages = tebexPackages.map(mapTebexPackageToPackage);
        setAllPackages(mappedPackages);
      } catch (error) {
        console.error('Failed to fetch packages:', error);
      }
    };
    fetchPackages();
  }, []);

  // Build the suggestion POOL: all Oxlyn (non-Vanguard, non-subscription)
  // packages, deduped, MINUS anything already in the cart, then shuffled so
  // the order varies per visit. The visible strip rotates through this pool
  // (rotation effect below) instead of always showing the same first 3.
  // Suggestions stay Oxlyn-only — Vanguard is a separate brand experience.
  useEffect(() => {
    if (!allPackages.length) {
      setSuggestionPool([]);
      return;
    }
    const cartPackageIds = new Set(cartItems.map((item) => String(item.id)));
    const available = deduplicatePackages(
      allPackages.filter(
        (pkg) =>
          !isVanguard(pkg) &&
          !isInstallationAddon(pkg) &&
          !/subscription/i.test(pkg.name) &&
          !/subscription/i.test(pkg.category?.name || '')
      )
    ).filter((pkg) => !cartPackageIds.has(String(pkg.id)));

    // Fisher–Yates shuffle — a fresh order each time the cart/catalog changes.
    const shuffled = [...available];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setSuggestionPool(shuffled);
    setSuggestionIndex(0);
  }, [cartItems, allPackages]);

  // Rotate the visible 3 every few seconds so the suggestions keep changing —
  // cycling through the whole pool with wraparound. Pauses while the user
  // hovers the strip (so a card never swaps out from under their click). Only
  // rotates when there are more than 3 to cycle through.
  useEffect(() => {
    if (suggestionPool.length <= 3) return;
    const id = setInterval(() => {
      if (suggestionPausedRef.current) return;
      setSuggestionIndex((i) => (i + 3) % suggestionPool.length);
    }, 7000);
    return () => clearInterval(id);
  }, [suggestionPool]);

  // The 3 visible suggestions, derived from the pool + current rotation index
  // (wraps around). Never includes cart items — the pool already excludes them.
  const featuredScripts = useMemo(() => {
    const n = suggestionPool.length;
    if (n === 0) return [];
    if (n <= 3) return suggestionPool;
    return [0, 1, 2].map((k) => suggestionPool[(suggestionIndex + k) % n]);
  }, [suggestionPool, suggestionIndex]);

  // Item count + the "real" subtotal include the add-on price (it's a true
  // charge), but the header count and the launch-discount math are scoped to
  // SCRIPTS only — the install add-on is full price and must never be dressed
  // up as "30% launch off".
  const totalItems = scriptItems.reduce((sum, item) => sum + item.qty, 0);
  const currentPrice = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const addonLine = addonInCart ? addonPrice : 0;
  const couponDiscountAmount = appliedCoupon?.discountAmount || 0;
  const priceBeforeCoupon = currentPrice + Math.abs(couponDiscountAmount);
  // Scripts portion (pre-coupon), used for the honest 30%-launch strikethrough.
  const scriptsBeforeCoupon = Math.max(0, priceBeforeCoupon - addonLine);
  // 30% off vs the strikethrough price — applied to SCRIPTS only. The add-on is
  // added back at face value so it's never misrepresented as discounted.
  const originalPrice = (scriptsBeforeCoupon > 0 ? scriptsBeforeCoupon / 0.7 : 0) + addonLine;
  const launchDiscountAmount = scriptsBeforeCoupon > 0 ? scriptsBeforeCoupon / 0.7 - scriptsBeforeCoupon : 0;
  const totalPrice = currentPrice;
  const actualCouponPercentage =
    priceBeforeCoupon > 0 && Math.abs(couponDiscountAmount) > 0
      ? Math.round((Math.abs(couponDiscountAmount) / priceBeforeCoupon) * 100)
      : 0;

  const handleApplyCoupon = async () => {
    setCouponError('');
    setCouponSuccess('');
    setIsApplyingCoupon(true);
    const result = await applyCoupon(couponCode);
    setIsApplyingCoupon(false);
    if (result.success) {
      setCouponSuccess('Coupon applied!');
      setCouponCode('');
      setTimeout(() => setCouponSuccess(''), 3000);
      trackEvent('coupon_applied', {
        eventData: {
          coupon_code: couponCode.toUpperCase(),
          discount_amount: Math.abs(appliedCoupon?.discountAmount || 0),
        },
      });
    } else {
      setCouponError(result.error || 'Invalid code');
      trackEvent('coupon_failed', {
        eventData: { coupon_code: couponCode.toUpperCase(), error: result.error },
      });
    }
  };

  const handleRemoveCoupon = async () => {
    setIsRemovingCoupon(true);
    await removeCoupon();
    setIsRemovingCoupon(false);
    trackEvent('coupon_removed', { eventData: { coupon_code: appliedCoupon?.code } });
  };

  const handleCheckout = () => {
    if (!basketIdent) return;
    cartItems.forEach((item) => {
      trackEvent('checkout_start', {
        packageName: item.name,
        eventData: { price: item.price, quantity: item.qty, total: item.price * item.qty },
      });
    });
    // Pass the basket snapshot so the Tebex `payment:complete` handler can
    // fire trackPurchase() for each line — without this, the `purchase`
    // stage of the conversion funnel (and the conversion rate) never moves
    // even though sales are happening.
    const checkoutItems = cartItems.map((item) => ({ name: item.name, price: item.price }));
    launchTebexCheckout(basketIdent, checkoutItems);
  };

  const handleRemoveItem = async (item: any) => {
    await removeFromCart(item.id);
    trackEvent('cart_item_removed', {
      packageName: item.name,
      eventData: { price: item.price, quantity: item.qty },
    });
  };

  // === LOGIN GATE (not authenticated with Tebex/FiveM) ===
  if (!isLoggedIn) {
    return (
      <section className="relative min-h-screen pt-8 sm:pt-12 pb-20 px-4 flex items-center justify-center">
        <div className="relative z-10 max-w-md w-full">
          <div className="glass-luxury rounded-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 mb-5">
                <Lock className="w-7 h-7 text-orange-300" strokeWidth={2} />
              </div>
              <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                Sign in to view your cart
              </h2>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Connect with FiveM to keep your cart synchronized across devices and unlock instant
                checkout.
              </p>
              <button
                onClick={login}
                className="cta-luxury w-full py-3.5 rounded-2xl font-bold text-[0.85rem] uppercase tracking-wide text-white inline-flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48" fill="currentColor">
                  <polygon points="5,45 9,34 21,22 15,45"></polygon>
                  <polygon points="25,18 33,45 43,45 32,12"></polygon>
                  <polygon points="16.059,14.164 20,3 28,3"></polygon>
                </svg>
                Sign in with FiveM
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen pt-8 sm:pt-12 pb-28 lg:pb-24 selection:bg-orange-500/30">
      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* === HEADER === */}
        <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-luxury mb-3">
              <ShoppingCart className="w-3 h-3 text-orange-300" strokeWidth={2.5} />
              <span className="text-[10px] font-bold text-orange-200 uppercase tracking-[0.22em]">
                Cart
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-[0.95]">
              <span className="text-white">Your </span>
              <span className="gradient-text-brand drop-shadow-[0_0_25px_rgba(255,120,0,0.3)]">
                Cart
              </span>
            </h1>
            <p className="text-sm sm:text-base text-gray-400 mt-2 font-light">
              {totalItems} {totalItems === 1 ? 'item' : 'items'} ready for checkout
            </p>
          </div>
          {scriptItems.length > 0 && (
            <button
              onClick={() => navigate('/scripts')}
              className="self-start sm:self-auto inline-flex items-center gap-2 glass-luxury px-4 py-2 rounded-xl text-sm text-white hover:border-white/20 transition-all hover:scale-[1.02]"
            >
              <span>Continue Shopping</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* === EMPTY STATE === */}
        {scriptItems.length === 0 ? (
          <div className="glass-luxury rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/10 mb-6">
                <ShoppingCart className="w-9 h-9 text-orange-300" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">
                Your cart is empty
              </h2>
              <p className="text-sm sm:text-base text-gray-400 max-w-md mx-auto mb-7 font-light leading-relaxed">
                Browse our catalog of premium FiveM scripts engineered for production-grade servers.
              </p>
              <button
                onClick={() => navigate('/scripts')}
                className="cta-luxury inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-bold text-[0.85rem] uppercase tracking-wide text-white"
              >
                <Sparkles className="w-4 h-4" />
                Browse Scripts
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
            {/* === LEFT COLUMN — items === */}
            <div className="lg:col-span-8 space-y-4 sm:space-y-5">
              {scriptItems.map((item) => (
                <div
                  key={item.id}
                  className="glass-luxury rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 group hover:border-white/15 transition-all"
                >
                  {/* Thumbnail */}
                  <div className="w-full sm:w-36 aspect-video rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/[0.06]">
                    <OptimizedImage
                      src={item.image}
                      alt={item.name}
                      width={288}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-2">
                      <h3 className="text-base sm:text-lg font-bold text-white break-words flex-1 min-w-0">
                        {item.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-white/[0.04] text-orange-200 text-[10px] uppercase font-bold rounded-md border border-orange-400/20 shrink-0 tracking-wider">
                        {item.category ? formatCategoryName(item.category.name) : 'Script'}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs sm:text-sm mb-3">Quantity: {item.qty}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-emerald-300 bg-emerald-500/10 border border-emerald-400/25">
                        <Star className="w-2.5 h-2.5 fill-emerald-300" />
                        30% Launch Off
                      </span>
                    </div>
                  </div>

                  {/* Price + Remove */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:text-right shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/[0.06] sm:gap-2">
                    <div>
                      <div className="text-xs text-gray-500 line-through mb-0.5">
                        {formatPrice((item.price / 0.7) * item.qty)}
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white whitespace-nowrap">
                        {formatPrice(item.price * item.qty)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item)}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full glass-luxury text-gray-400 hover:text-red-300 hover:border-red-400/30 transition-all"
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* === Subscription upsell — DISCREET strip (secondary upsell).
                  Collapsed to a single "Best value" (Yearly) line so it never
                  competes with the checkout CTA. "See all plans" expands the
                  full 3-tier compare inline. === */}
              {!hasSubscriptionInCart && (() => {
                const yearlyTier = CART_TIERS.find((t) => t.id === 'yearly')!;
                const yearlyResolved = !!tierPackages.yearly;
                return (
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5 sm:p-4">
                  <div className="relative flex items-center gap-3 flex-wrap">
                    <div className="hidden sm:flex w-9 h-9 rounded-xl bg-white/[0.04] border border-orange-400/25 items-center justify-center flex-shrink-0">
                      <Crown className="w-4 h-4 text-orange-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white leading-tight">
                        Want everything?{' '}
                        <span className="gradient-text-brand">All scripts, one subscription</span>
                      </p>
                      <p className="text-[11px] text-gray-400 leading-snug mt-0.5">
                        <span className="text-emerald-300 font-semibold">Best value</span> ·{' '}
                        {formatPrice(yearlyTier.price)}
                        {yearlyTier.period} (≈ {formatPrice(yearlyTier.monthlyEquivalent)}/mo) · every
                        script + future releases.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTierClick('yearly')}
                        disabled={pendingTier !== null}
                        className="glass-luxury text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:border-orange-400/30 inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
                      >
                        {pendingTier === 'yearly' ? (
                          'Adding…'
                        ) : (
                          <>
                            {yearlyResolved ? 'Get yearly' : 'See plan'}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAllPlans((v) => !v)}
                        aria-expanded={showAllPlans}
                        className="text-[11px] text-gray-400 hover:text-orange-200 transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        {showAllPlans ? 'Hide plans' : 'See all plans'}
                        <ChevronRight
                          className={`w-3 h-3 transition-transform ${showAllPlans ? 'rotate-90' : ''}`}
                        />
                      </button>
                    </div>
                  </div>

                  {showAllPlans && (
                    <div className="relative mt-4 pt-4 border-t border-white/[0.07]">
                    {/* Vanguard scope notice — the OXLYN subscription does NOT
                        include the legacy Vanguard catalogue. */}
                    <div className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-xl border border-amber-400/25 bg-amber-500/[0.06]">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-300 flex-shrink-0 mt-[3px]" />
                      <p className="text-[11px] sm:text-xs text-amber-200/85 leading-relaxed">
                        Subscription covers the <b className="text-white">OXLYN catalogue only</b>. Vanguard
                        scripts (the legacy archive at /vanguardscripts) are
                        not included — those remain individual purchases.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
                      {CART_TIERS.map((tier) => {
                        const isHighlight = !!tier.highlight;
                        const resolved = !!tierPackages[tier.id];
                        const isLoading = pendingTier === tier.id;
                        return (
                          <div
                            key={tier.id}
                            className={`relative rounded-2xl p-4 sm:p-4.5 flex flex-col transition-transform duration-300 hover:-translate-y-0.5 ${
                              isHighlight
                                ? 'border-2 border-orange-400/40 bg-gradient-to-b from-orange-500/[0.08] to-transparent shadow-[0_0_30px_-12px_rgba(255,140,40,0.45)]'
                                : 'border border-white/10 bg-white/[0.025]'
                            }`}
                          >
                            {tier.badge && (
                              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                <span className="text-[0.55rem] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-[0.18em] text-white bg-gradient-to-r from-red-500 to-orange-500 border border-red-400/40 shadow-[0_0_12px_rgba(239,68,68,0.5)] inline-flex items-center gap-1 whitespace-nowrap">
                                  <Crown className="w-2.5 h-2.5" />
                                  {tier.badge}
                                </span>
                              </div>
                            )}

                            <h4 className="text-sm font-bold text-white mb-0.5">{tier.name}</h4>
                            <p className="text-[11px] text-gray-500 mb-3 leading-snug min-h-[28px]">
                              {tier.description}
                            </p>

                            <div className="mb-3">
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black gradient-text-brand leading-none">
                                  {formatPrice(tier.price)}
                                </span>
                                <span className="text-[11px] text-gray-400">{tier.period}</span>
                              </div>
                              {tier.monthlyEquivalent !== tier.price && (
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                  ≈ {formatPrice(tier.monthlyEquivalent)} / month
                                </div>
                              )}
                            </div>

                            <ul className="space-y-1 mb-4 flex-1">
                              <li className="flex items-start gap-1.5 text-[11px] text-gray-300">
                                <Check className="w-3 h-3 text-orange-300 flex-shrink-0 mt-0.5" />
                                <span>Access to all scripts</span>
                              </li>
                              <li className="flex items-start gap-1.5 text-[11px] text-gray-300">
                                <Check className="w-3 h-3 text-orange-300 flex-shrink-0 mt-0.5" />
                                <span>Every future release</span>
                              </li>
                              <li className="flex items-start gap-1.5 text-[11px] text-gray-300">
                                <Check className="w-3 h-3 text-orange-300 flex-shrink-0 mt-0.5" />
                                <span>QBCore · ESX · QBox</span>
                              </li>
                              <li className="flex items-start gap-1.5 text-[11px] text-gray-300">
                                <Check className="w-3 h-3 text-orange-300 flex-shrink-0 mt-0.5" />
                                <span>Cancel anytime</span>
                              </li>
                            </ul>

                            <button
                              type="button"
                              onClick={() => handleTierClick(tier.id)}
                              disabled={pendingTier !== null}
                              className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60 disabled:cursor-wait ${
                                isHighlight
                                  ? 'cta-luxury text-white'
                                  : 'glass-luxury text-white hover:border-orange-400/30'
                              }`}
                            >
                              {isLoading ? (
                                'Adding…'
                              ) : (
                                <>
                                  {resolved ? tier.cta : 'See plan'}
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate('/subscription')}
                      className="mt-4 inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-orange-200 transition-colors"
                    >
                      Compare plans &amp; FAQ
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    </div>
                  )}
                </div>
                );
              })()}
            </div>

            {/* === RIGHT COLUMN — order summary === */}
            <div className="lg:col-span-4">
              {/* Sticky on desktop, but capped to viewport height so a tall
                  summary never bleeds past the items column into sections
                  below. Internal vertical scroll kicks in only when the
                  cart is taller than the viewport. */}
              <div className="glass-luxury rounded-2xl p-5 sm:p-6 lg:sticky lg:top-28 lg:max-h-[calc(100vh-7rem)] relative overflow-x-hidden overflow-y-auto cart-summary-scroll">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-orange-500/8 rounded-full blur-3xl pointer-events-none" />
                <div className="relative">
                  <h3 className="text-lg sm:text-xl font-black text-white mb-5 tracking-tight">
                    Order Summary
                  </h3>

                  {/* === Coupon === */}
                  <div className="mb-6">
                    {!appliedCoupon ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            setCouponError('');
                          }}
                          placeholder="Coupon code"
                          className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-400/40 focus:bg-white/[0.06] transition"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={isApplyingCoupon || !couponCode.trim()}
                          className="px-4 py-2.5 glass-luxury text-white text-sm font-semibold rounded-xl hover:border-orange-400/30 hover:text-orange-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          {isApplyingCoupon ? '...' : 'Apply'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/25">
                        <div className="min-w-0">
                          <div className="text-xs text-emerald-300 font-bold flex items-center gap-1.5">
                            <Tag className="w-3 h-3" /> {appliedCoupon.code}
                          </div>
                          <div className="text-[10px] text-emerald-300/70">
                            Coupon active
                          </div>
                        </div>
                        <button
                          onClick={handleRemoveCoupon}
                          disabled={isRemovingCoupon}
                          className="text-gray-400 hover:text-red-300 transition p-1"
                          aria-label="Remove coupon"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {couponError && (
                      <p className="text-red-300 text-xs mt-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" /> {couponError}
                      </p>
                    )}
                    {couponSuccess && (
                      <p className="text-emerald-300 text-xs mt-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" /> {couponSuccess}
                      </p>
                    )}
                  </div>

                  {/* === Breakdown === */}
                  <div className="space-y-2.5 mb-5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Original</span>
                      <span className="text-gray-500 line-through">
                        {formatPrice(originalPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-300 flex items-center gap-1.5">
                        <Star className="w-3 h-3 fill-emerald-300" /> Launch Savings
                      </span>
                      <span className="text-emerald-300 font-semibold">
                        −{formatPrice(launchDiscountAmount)}
                      </span>
                    </div>
                    {addonInCart && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300 flex items-center gap-1.5">
                          <Wrench className="w-3 h-3 text-red-300" /> Professional installation
                        </span>
                        <span className="text-white font-semibold">+{formatPrice(addonPrice)}</span>
                      </div>
                    )}
                    {appliedCoupon && (
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-300">Coupon ({actualCouponPercentage}%)</span>
                        <span className="text-orange-300 font-semibold">
                          −{formatPrice(Math.abs(couponDiscountAmount))}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-white/[0.08] pt-3 flex justify-between items-end">
                      <span className="text-white font-semibold text-sm">Total</span>
                      <span
                        key={`total-${totalPrice}`}
                        className="cart-total-pulse text-3xl font-black text-white tracking-tight"
                      >
                        {formatPrice(totalPrice)}
                      </span>
                    </div>

                    <div className="text-[11px] text-center text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 py-2 rounded-xl flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3" />
                      You're saving{' '}
                      <span className="font-bold">
                        {formatPrice(launchDiscountAmount + Math.abs(couponDiscountAmount))}
                      </span>{' '}
                      with launch pricing
                    </div>
                  </div>

                  {/* === Order bump: Professional installation (OPTIONAL,
                      default OFF, never pre-selected — EU/PT Dir. 2011/83
                      art.22). Shown only with ≥1 script. Adds the real
                      "Oxlyn Installation" Tebex package so it's charged. === */}
                  {scriptItems.length >= 1 && (
                    <button
                      type="button"
                      role="switch"
                      aria-pressed={addonInCart}
                      aria-label={`Professional installation add-on, plus ${formatPrice(addonPrice)}`}
                      onClick={isDiscordConnected ? handleToggleAddon : handleDiscordConnect}
                      disabled={addonPending}
                      className={`w-full text-left rounded-2xl p-3.5 mb-4 border transition-all disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 ${
                        addonInCart
                          ? 'border-red-500/70 bg-red-500/[0.07] shadow-[0_0_22px_-8px_rgba(239,68,68,0.65)]'
                          : 'border-white/10 bg-white/[0.025] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-md border-2 flex-shrink-0 transition-colors ${
                            addonInCart
                              ? 'border-red-500 bg-red-500 text-white'
                              : 'border-white/25 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white inline-flex items-center gap-1.5">
                              <Wrench className="w-3.5 h-3.5 text-red-300" /> Professional installation
                            </span>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/15 text-gray-300">
                              Add-on
                            </span>
                            <span className="ml-auto text-sm font-black text-white whitespace-nowrap">
                              + {formatPrice(addonPrice)}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 leading-snug mt-1.5">
                            Skip the setup. The devs who built {scriptItems.length === 1 ? 'it' : 'them'}{' '}
                            install <span className="text-gray-200 font-semibold">{installTargetName}</span>{' '}
                            on your server, wire up dependencies, framework &amp; config, and test it live
                            — running perfectly before you log in.
                          </p>
                          <p className="text-[11px] text-emerald-300 font-semibold mt-1.5 inline-flex items-center gap-1">
                            <Shield className="w-3 h-3" /> 100% functional — or we fix it free.
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1">
                            ⚡ Usually live within 2h · By the original developers
                          </p>
                          {!isDiscordConnected && (
                            <p className="text-[10px] text-amber-300/90 mt-1.5 inline-flex items-center gap-1">
                              <DiscordIcon className="w-3 h-3" /> Connect Discord to add this.
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  )}

                  {/* === Discord required to checkout === */}
                  {!isDiscordConnected && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-400/25 p-4 mb-4 flex gap-3">
                      <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-amber-200 text-sm font-bold mb-1">
                          Discord connection required
                        </p>
                        <p className="text-amber-200/70 text-xs leading-relaxed mb-3">
                          Connect your Discord so we can deliver your license and support — required to
                          check out.
                        </p>
                        <button
                          onClick={handleDiscordConnect}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          <DiscordIcon className="w-3.5 h-3.5" /> Connect Discord
                        </button>
                      </div>
                    </div>
                  )}

                  {/* === Checkout CTA — the single dominant action === */}
                  <button
                    onClick={isDiscordConnected ? handleCheckout : handleDiscordConnect}
                    disabled={!basketIdent}
                    className={`group w-full py-4 rounded-2xl font-black text-[0.9rem] uppercase tracking-wide text-white flex items-center justify-center gap-2.5 mb-3 relative overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDiscordConnected
                        ? 'cta-luxury'
                        : 'bg-[#5865F2] hover:bg-[#4752C4] shadow-[0_0_18px_rgba(88,101,242,0.4)]'
                    }`}
                  >
                    {isDiscordConnected ? (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <Lock className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">Secure checkout · {formatPrice(totalPrice)}</span>
                        <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    ) : (
                      <>
                        <DiscordIcon className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">Connect Discord to checkout</span>
                      </>
                    )}
                  </button>

                  {/* === Trust cluster — risk to zero, right by the button === */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="glass-luxury rounded-xl px-2.5 py-2 inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                      <span className="text-[11px] text-gray-300 font-medium">7-day refund</span>
                    </div>
                    <div className="glass-luxury rounded-xl px-2.5 py-2 inline-flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-orange-300 flex-shrink-0" />
                      <span className="text-[11px] text-gray-300 font-medium">Instant delivery</span>
                    </div>
                    {/* Escrow chip + accessible tooltip */}
                    <div className="relative group glass-luxury rounded-xl px-2.5 py-2 inline-flex items-center gap-1.5 cursor-help">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 rounded"
                        aria-describedby="escrow-tip"
                      >
                        <Shield className="w-3.5 h-3.5 text-orange-300 flex-shrink-0" />
                        <span className="text-[11px] text-gray-300 font-medium">Escrow-protected</span>
                        <Info className="w-3 h-3 text-gray-500" />
                      </button>
                      <span
                        id="escrow-tip"
                        role="tooltip"
                        className="cart-tip pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 px-3 py-2 rounded-lg bg-zinc-900 border border-white/15 text-[11px] leading-snug text-gray-200 shadow-xl opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 z-20"
                      >
                        Your purchase is held in Cfx escrow until delivery is confirmed — you're protected if anything's wrong.
                      </span>
                    </div>
                    <div className="glass-luxury rounded-xl px-2.5 py-2 inline-flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-orange-300 flex-shrink-0" />
                      <span className="text-[11px] text-gray-300 font-medium">30-sec checkout</span>
                    </div>
                  </div>

                  {/* Payment methods image — full vibrancy (the previous
                      opacity-60 was reading as a dim/gray overlay). Caption
                      below hints that the visible logos are the popular subset
                      and that Tebex covers many more rails. */}
                  <div className="mb-2">
                    <OptimizedImage
                      src="https://i.imgur.com/1oDMbml.png"
                      alt="Accepted payment methods · Visa, Mastercard, PayPal, crypto"
                      width={400}
                      format="png"
                      loading="lazy"
                      decoding="async"
                      className="w-full"
                    />
                  </div>

                  <p className="text-[10px] text-gray-500 text-center mb-3">
                    + <span className="text-white font-bold">30 more</span> payment methods supported worldwide
                  </p>

                  <p className="text-[10px] text-gray-600 text-center tracking-[0.15em] uppercase">
                    Powered by <span className="text-gray-400 font-bold">Tebex</span> · VAT calculated at checkout
                  </p>

                  <div className="mt-4 glass-luxury rounded-xl px-3 py-2.5 flex items-center gap-2.5">
                    <Headphones className="w-3.5 h-3.5 text-orange-300 flex-shrink-0" />
                    <p className="text-[11px] text-gray-400 leading-tight">
                      Need help? <span className="text-white font-semibold">6h avg.</span> Discord
                      response from the devs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === Mobile sticky checkout bar — CTA always reachable on the
            screens where carts are abandoned most. Hidden on lg+ (desktop
            keeps the sticky summary). === */}
        {scriptItems.length > 0 && (
          <div
            className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#0a0a0c]/95 backdrop-blur px-4 py-3 flex items-center gap-3"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <div className="min-w-0">
              <div className="text-[9px] text-gray-500 uppercase tracking-[0.18em] leading-none mb-1">
                Total
              </div>
              <div
                key={`m-total-${totalPrice}`}
                className="cart-total-pulse text-lg font-black text-white leading-none tabular-nums"
              >
                {formatPrice(totalPrice)}
              </div>
            </div>
            <button
              onClick={isDiscordConnected ? handleCheckout : handleDiscordConnect}
              disabled={!basketIdent}
              className={`flex-1 py-3 rounded-xl font-black text-[0.8rem] uppercase tracking-wide text-white inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isDiscordConnected ? 'cta-luxury' : 'bg-[#5865F2] hover:bg-[#4752C4]'
              }`}
            >
              {isDiscordConnected ? (
                <>
                  <Lock className="w-4 h-4" /> Checkout
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <DiscordIcon className="w-4 h-4" /> Connect Discord
                </>
              )}
            </button>
          </div>
        )}

        {/* === You might also like === */}
        {featuredScripts.length > 0 && (
          <div className="mt-16 sm:mt-20">
            <div className="text-center mb-8 sm:mb-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-luxury mb-3">
                <Sparkles className="w-3 h-3 text-orange-300" strokeWidth={2.5} />
                <span className="text-[10px] font-bold text-orange-200 uppercase tracking-[0.22em]">
                  Suggested
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
                <span className="text-white">You might also </span>
                <span className="gradient-text-brand">like</span>
              </h2>
              <p className="text-sm text-gray-400 mt-2 font-light">
                Hand-picked premium scripts to round out your server.
              </p>
            </div>

            <style>{`@keyframes suggestFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.suggest-fade{animation:suggestFade .45s ease}`}</style>
            <div
              key={suggestionIndex}
              onMouseEnter={() => { suggestionPausedRef.current = true; }}
              onMouseLeave={() => { suggestionPausedRef.current = false; }}
              className="suggest-fade grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {featuredScripts.map((script) => (
                <button
                  key={script.id}
                  onClick={() => {
                    const slug = script.name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '');
                    navigate(`/product/${slug}`, { state: { package: script } });
                  }}
                  className="group glass-luxury rounded-2xl overflow-hidden text-left hover:border-white/15 hover:-translate-y-1 transition-all"
                >
                  <div className="aspect-video bg-black overflow-hidden">
                    <OptimizedImage
                      src={script.image}
                      alt={script.name}
                      width={400}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4 sm:p-5">
                    <h3 className="text-base font-bold text-white mb-1 truncate">{script.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-black text-lg">
                        {script.price === 0 ? 'Free' : formatPrice(script.price)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400 group-hover:text-white transition">
                        View details
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CartPage;

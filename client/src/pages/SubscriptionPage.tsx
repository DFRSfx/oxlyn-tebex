import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  Check,
  Crown,
  Zap,
  Shield,
  RefreshCw,
  Headphones,
  Lock,
  ArrowRight,
  Plus,
  Minus,
  Infinity as InfinityIcon,
  Star,
  Tag,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { handleDiscordRedirect } from '../utils/helpers';
import { Package } from '../types';
import { isBundle, isSubscriptionPackage, findSubscriptionPackage, isVanguard } from '../utils/isBundle';
import { useTebex } from '../context/TebexContext';
import { useCurrency } from '../context/CurrencyContext';

/**
 * Reveal-on-scroll com IntersectionObserver — mesmo padrão da TermsPage para
 * manter consistência. Sem framer-motion (poupa ~50KB no bundle).
 */
const Reveal: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      { rootMargin: '-50px' }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease-out ${delay}s, transform 0.6s ease-out ${delay}s`,
        willChange: visible ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
};

// =====================================================================
// Pricing tiers. Tweak these numbers in one place; the cards below derive
// monthly equivalents and savings automatically.
// =====================================================================
type Tier = {
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

// First-subscription coupon. Single-use per customer & expiry rules are enforced
// server-side in the Tebex dashboard — this constant only drives the on-page promo.
const FIRST_SUB_COUPON = {
  code: 'NEWSUBSCRIBER15',
  percentOff: 15,
};

const TIERS: Tier[] = [
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

// =====================================================================
// FAQ — also wired into JSON-LD below for AEO/Google rich results.
// The script-count token `{N}` is replaced at render time with the live
// count derived from the catalog.
// =====================================================================
const FAQ_TEMPLATES: { q: string; a: string }[] = [
  {
    q: 'What does the subscription include?',
    a: 'All {N} scripts currently in the OXLYN catalog plus every future release for as long as your subscription is active. New scripts unlock immediately when published.',
  },
  {
    q: 'Which frameworks are supported?',
    a: 'All scripts work with QBCore, ESX and QBox. Each script ships the framework adapters in the same release.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. You can cancel from your Tebex account at any time. You keep access until the end of the current billing period.',
  },
  {
    q: 'Do I keep the scripts after cancelling?',
    a: 'Access ends with the subscription. The same model used by Adobe, Figma and most SaaS — pause access when you stop paying. Re-subscribe anytime to restore.',
  },
  {
    q: 'How does delivery work?',
    a: 'Instantly after checkout, every script in the catalog is added to your Cfx.re Keymaster account. New releases are pushed there automatically while your subscription is active.',
  },
  {
    q: 'What about updates and bug fixes?',
    a: 'Updates are continuous and free for the lifetime of your subscription. There are no upgrade fees and no version locks.',
  },
  {
    q: 'Is there a per-server license limit?',
    a: 'Each subscription covers one server. For multi-server deployments, contact us on Discord for enterprise pricing.',
  },
  {
    q: 'Is there a refund policy?',
    a: 'Subscriptions are non-refundable due to the digital nature of the product, but you can cancel future renewals at any time. If a script is broken or doesn\'t match its description, contact support — we\'ll make it right.',
  },
  {
    q: 'How do I redeem the NEWSUBSCRIBER15 coupon?',
    a: 'Pick a plan, head to your cart and paste NEWSUBSCRIBER15 in the coupon field for 15% off. The code is valid once per customer on your very first subscription only — after that, renewals bill at the regular price.',
  },
];

// =====================================================================
// Catalog selection used in the page. Pulled live from the storefront
// (which itself is fed by the Tebex proxy), with bundles, the legacy
// vanguard imports, and duplicate variants stripped out — exactly the
// same logic the homepage uses to count "scripts".
// =====================================================================
type IncludedScript = {
  key: string;
  name: string;
  tag: string;
  price: number;
  oldPrice: number;
};

const stripVariantSuffixes = (name: string) =>
  name
    .replace(/\s*\(OPEN-SOURCE\)/gi, '')
    .replace(/\s*\(ESCROWED\)/gi, '')
    .replace(/\s*\(Open Source\)/gi, '')
    .replace(/\s*\(Escrow\)/gi, '')
    .trim();

function deriveIncludedScripts(packages: Package[]): IncludedScript[] {
  const filtered = packages.filter((p) => {
    if (!p) return false;
    if (isBundle(p)) return false; // explicit user request: scripts only, no bundles
    if (isSubscriptionPackage(p)) return false; // hide the subscription SKUs themselves
    if (isVanguard(p)) return false; // subscription is Oxlyn-only — Vanguard is a separate brand
    return true;
  });

  // Group variants of the same product (open-source / escrow) and pick the
  // cheapest one — that gives us a single canonical entry per script.
  const groups = new Map<string, Package[]>();
  for (const pkg of filtered) {
    const baseName = stripVariantSuffixes(pkg.name);
    const list = groups.get(baseName);
    if (list) list.push(pkg);
    else groups.set(baseName, [pkg]);
  }

  const out: IncludedScript[] = [];
  groups.forEach((variants, baseName) => {
    const cheapest = variants.reduce((min, cur) => (cur.price < min.price ? cur : min));
    out.push({
      key: cheapest.id,
      name: baseName,
      tag: cheapest.category?.name ?? 'Script',
      price: cheapest.price,
      oldPrice: cheapest.originalPrice ?? cheapest.price * 2,
    });
  });

  // Stable order: most expensive first so the headline value sits at the top.
  out.sort((a, b) => b.price - a.price);
  return out;
}

// =====================================================================
// Component
// =====================================================================
interface SubscriptionPageProps {
  packages: Package[];
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ packages }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [pendingTier, setPendingTier] = useState<Tier['id'] | null>(null);
  const [couponCopied, setCouponCopied] = useState(false);
  const { addToCart, isLoggedIn, login } = useTebex();
  const { format: formatPrice } = useCurrency();
  const navigate = useNavigate();

  const includedScripts = useMemo(() => deriveIncludedScripts(packages), [packages]);

  // Resolve each tier to a real Tebex package once. If a SKU is missing
  // (e.g. catalog still loading or the admin removed the product) we fall
  // back to the Discord notify CTA so the page never has dead buttons.
  const tierPackages = useMemo(
    () => ({
      monthly: findSubscriptionPackage('monthly', packages),
      quarterly: findSubscriptionPackage('quarterly', packages),
      yearly: findSubscriptionPackage('yearly', packages),
    }),
    [packages]
  );

  const handleCopyCoupon = async () => {
    try {
      await navigator.clipboard.writeText(FIRST_SUB_COUPON.code);
      setCouponCopied(true);
      setTimeout(() => setCouponCopied(false), 2000);
    } catch {
      // Fallback for browsers without Clipboard API permissions
      const tmp = document.createElement('textarea');
      tmp.value = FIRST_SUB_COUPON.code;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      document.body.removeChild(tmp);
      setCouponCopied(true);
      setTimeout(() => setCouponCopied(false), 2000);
    }
  };

  const handleTierClick = async (tierId: Tier['id']) => {
    const pkg = tierPackages[tierId];

    // SKU not found in the catalog — keep the existing Discord fallback.
    if (!pkg || !pkg.tebexPackageId) {
      handleDiscordRedirect();
      return;
    }

    // Tebex requires the user to be logged in (FiveM auth) before a package
    // can be added — same flow the storefront PackageCard uses.
    if (!isLoggedIn) {
      try {
        await login();
      } catch (err) {
        console.error('Subscription login failed:', err);
        return;
      }
      // After login completes the basket is initialised; fall through and
      // add the package below.
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
        navigate('/cart');
      }
    } finally {
      setPendingTier(null);
    }
  };
  const scriptCount = includedScripts.length;
  const totalEscrow = useMemo(
    () => includedScripts.reduce((s, x) => s + x.price, 0),
    [includedScripts]
  );
  const totalFull = useMemo(
    () => includedScripts.reduce((s, x) => s + x.oldPrice, 0),
    [includedScripts]
  );

  // FAQ array with the live count token expanded.
  const faqs = useMemo(
    () =>
      FAQ_TEMPLATES.map((f) => ({
        q: f.q,
        a: f.a.replace('{N}', String(scriptCount || 'all')),
      })),
    [scriptCount]
  );

  // Per-page SEO + Product/FAQ JSON-LD for rich Google results.
  // Wrapped in useMemo so the JSON-LD is only re-emitted when the live
  // catalog or FAQ count actually changes.
  const seoJsonLd = useMemo(
    () => [
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'OXLYN Subscription — All FiveM Scripts',
        description: `Monthly, quarterly or yearly subscription to all ${scriptCount || 'OXLYN'} FiveM scripts in the catalog. Includes every current and future release.`,
        image: 'https://oxlynsoftware.com/og-cover.png',
        brand: { '@type': 'Brand', name: 'OXLYN Software' },
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'EUR',
          lowPrice: TIERS.reduce((min, t) => Math.min(min, t.price), Infinity).toFixed(2),
          highPrice: TIERS.reduce((max, t) => Math.max(max, t.price), 0).toFixed(2),
          offerCount: TIERS.length,
          url: 'https://oxlynsoftware.com/subscription',
          seller: { '@type': 'Organization', name: 'OXLYN Software' },
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
    [scriptCount, faqs]
  );

  useSEO({
    title: 'OXLYN Subscription — All FiveM Scripts, One Price',
    description:
      'Get every OXLYN script for FiveM under one subscription. QBCore, ESX & QBox compatible. Lifetime updates while subscribed. Cancel anytime.',
    canonical: '/subscription',
    type: 'product',
    jsonLd: seoJsonLd,
  });

  const isLoadingCatalog = packages.length === 0;

  return (
    <div className="min-h-screen text-white relative z-10 selection:bg-white/20 selection:text-white">
      {/* Global .site-background already handles the ambient grid + burgundy
          glow. No local overlays here — that stacking was producing the
          "muito vermelho" effect users complained about. */}

      <div className="relative z-10 container mx-auto max-w-6xl px-5 sm:px-6 pt-8 sm:pt-12 pb-16 sm:pb-24">

        {/* ============================================================ */}
        {/* HERO                                                         */}
        {/* ============================================================ */}
        <header className="text-center mb-14 sm:mb-20">
          <div className="apple-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500/15 to-orange-500/15 border border-red-500/30 mb-6">
              <Sparkles className="w-4 h-4 text-orange-300" />
              <span className="text-xs font-bold text-orange-300 uppercase tracking-[0.2em]">
                New · All-access
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-5 tracking-tight leading-[0.95]">
              <span className="text-white">Every script.</span>{' '}
              <span className="gradient-text-brand">One subscription.</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-gray-300 font-light max-w-2xl mx-auto leading-relaxed mb-2">
              Unlock the entire OXLYN catalog for FiveM — QBCore, ESX &amp; QBox — plus every future
              release, for one flat price.
            </p>
            <p className="text-sm text-gray-500 max-w-xl mx-auto">
              {isLoadingCatalog ? (
                <>Loading the latest catalog&hellip;</>
              ) : (
                <>
                  Stop paying {formatPrice(totalFull)} for the full bundle. Subscribe and own access
                  to {scriptCount} scripts — and counting.
                </>
              )}
            </p>

            {/* Trust pills */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
              <span className="hero-feature-pill">
                <Zap className="w-3.5 h-3.5 text-orange-300" strokeWidth={2.4} />
                <span>Instant access</span>
              </span>
              <span className="hero-feature-pill">
                <RefreshCw className="w-3.5 h-3.5 text-orange-300" strokeWidth={2.4} />
                <span>Free lifetime updates</span>
              </span>
              <span className="hero-feature-pill">
                <Lock className="w-3.5 h-3.5 text-orange-300" strokeWidth={2.4} />
                <span>Cancel anytime</span>
              </span>
            </div>
          </div>
        </header>

        {/* ============================================================ */}
        {/* PRICING                                                      */}
        {/* ============================================================ */}
        <Reveal>
          <section aria-labelledby="pricing-title" className="mb-20">
            <div className="text-center mb-6">
              <h2 id="pricing-title" className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
                Pick your plan
              </h2>
              <p className="text-gray-400 text-sm sm:text-base">
                Same scripts. Same updates. Different commitment.
              </p>
            </div>

            {/* Vanguard scope notice — same line as the CartPage subscription
                block. The OXLYN subscription covers the OXLYN catalogue
                exclusively; legacy Vanguard scripts are sold à la carte. */}
            <div className="mb-10 max-w-3xl mx-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border border-amber-400/25 bg-amber-500/[0.06]">
              <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-[3px]" />
              <p className="text-xs sm:text-sm text-amber-200/85 leading-relaxed">
                The subscription covers the <b className="text-white">OXLYN catalogue only</b>.
                Vanguard scripts (the legacy archive at <span className="text-white font-mono">/vanguardscripts</span>) are not included
                — those remain individual purchases.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto">
              {TIERS.map((tier) => {
                const isHighlight = !!tier.highlight;
                return (
                  <div
                    key={tier.id}
                    className={`relative rounded-2xl p-6 sm:p-7 flex flex-col transition-transform duration-300 hover:-translate-y-1 ${
                      isHighlight
                        ? 'border-2 border-orange-400/40 bg-gradient-to-b from-orange-500/[0.07] to-transparent shadow-[0_0_40px_-10px_rgba(255,140,40,0.35)]'
                        : 'glass-luxury'
                    }`}
                  >
                    {tier.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="text-[0.55rem] px-2.5 py-1 rounded-full font-extrabold uppercase tracking-[0.18em] text-white bg-gradient-to-r from-red-500 to-orange-500 border border-red-400/40 shadow-[0_0_12px_rgba(239,68,68,0.5)] inline-flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          {tier.badge}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                    </div>
                    <p className="text-xs text-gray-400 mb-5 min-h-[32px]">{tier.description}</p>

                    <div className="mb-5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl sm:text-5xl font-black gradient-text-brand">
                          {formatPrice(tier.price)}
                        </span>
                        <span className="text-sm text-gray-400">{tier.period}</span>
                      </div>
                      {tier.monthlyEquivalent !== tier.price && (
                        <div className="text-xs text-gray-500 mt-1">
                          ≈ {formatPrice(tier.monthlyEquivalent)} / month
                        </div>
                      )}
                    </div>

                    <ul className="space-y-2.5 text-sm text-gray-300 mb-6 flex-1">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-orange-300 flex-shrink-0 mt-0.5" />
                        <span>
                          Access to{' '}
                          {isLoadingCatalog ? 'all scripts' : `all ${scriptCount} scripts`}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-orange-300 flex-shrink-0 mt-0.5" />
                        <span>Every future release included</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-orange-300 flex-shrink-0 mt-0.5" />
                        <span>Free updates &amp; bug fixes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-orange-300 flex-shrink-0 mt-0.5" />
                        <span>QBCore · ESX · QBox</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-orange-300 flex-shrink-0 mt-0.5" />
                        <span>Discord community support</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-orange-300 flex-shrink-0 mt-0.5" />
                        <span>Cancel anytime</span>
                      </li>
                    </ul>

                    <button
                      type="button"
                      onClick={() => handleTierClick(tier.id)}
                      disabled={pendingTier !== null}
                      className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-wait ${
                        isHighlight
                          ? 'cta-luxury text-white'
                          : 'glass-luxury text-white hover:border-white/20'
                      }`}
                    >
                      {pendingTier === tier.id ? (
                        <>Adding to cart&hellip;</>
                      ) : tierPackages[tier.id] ? (
                        <>
                          {tier.cta}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Get notified
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-xs text-gray-500 mt-6">
              {Object.values(tierPackages).every(Boolean)
                ? 'Secure checkout via Tebex. Cancel renewals anytime from your Tebex account.'
                : 'Some plans are still being prepared in Tebex — those buttons drop you into our Discord for early-access. Plans already live go straight to checkout.'}
            </p>
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={handleCopyCoupon}
                aria-label={`Copy coupon code ${FIRST_SUB_COUPON.code}`}
                className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-dashed border-orange-400/50 bg-orange-500/[0.08] hover:bg-orange-500/[0.14] hover:border-orange-300/70 shadow-[0_0_24px_-8px_rgba(255,140,40,0.45)] transition-colors"
              >
                <Tag className="w-4 h-4 text-orange-300" strokeWidth={2.6} />
                <span className="text-sm text-orange-200">
                  First sub:{' '}
                  <span className="font-bold text-white">
                    {FIRST_SUB_COUPON.percentOff}% off
                  </span>{' '}
                  with
                </span>
                <span className="font-mono text-sm font-black text-white tracking-wider">
                  {FIRST_SUB_COUPON.code}
                </span>
                {couponCopied ? (
                  <Check className="w-4 h-4 text-emerald-300" strokeWidth={2.8} />
                ) : (
                  <Copy
                    className="w-4 h-4 text-gray-400 group-hover:text-orange-200 transition-colors"
                    strokeWidth={2.4}
                  />
                )}
              </button>
            </div>
          </section>
        </Reveal>

        {/* ============================================================ */}
        {/* WHAT'S INCLUDED                                              */}
        {/* ============================================================ */}
        <Reveal delay={0.05}>
          <section aria-labelledby="included-title" className="mb-20">
            <div className="text-center mb-10">
              <h2 id="included-title" className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
                {isLoadingCatalog
                  ? 'What you get on day one'
                  : `${scriptCount} scripts on day one`}
              </h2>
              {isLoadingCatalog ? (
                <p className="text-gray-400 text-sm sm:text-base">Loading the latest catalog&hellip;</p>
              ) : (
                <p className="text-gray-400 text-sm sm:text-base">
                  Total catalog value:{' '}
                  <span className="line-through text-gray-500">{formatPrice(totalFull)}</span>{' '}
                  <span className="text-gray-300">→</span>{' '}
                  <span className="text-orange-300 font-semibold">{formatPrice(totalEscrow)}</span>{' '}
                  in escrow,{' '}
                  <span className="text-white font-bold">free for subscribers.</span>
                </p>
              )}
            </div>

            {isLoadingCatalog ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="glass-luxury rounded-xl p-4 h-[88px] animate-pulse opacity-60"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {includedScripts.map((s) => (
                  <div
                    key={s.key}
                    className="glass-luxury rounded-xl p-4 flex items-start justify-between gap-3 hover:border-white/15 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider text-orange-300 bg-orange-500/10 border border-orange-400/20">
                          {s.tag}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white truncate" title={s.name}>
                        {s.name}
                      </h3>
                      <div className="text-xs text-gray-500 mt-0.5">
                        <span className="line-through">{formatPrice(s.oldPrice)}</span>{' '}
                        <span className="text-orange-300 font-semibold">
                          {formatPrice(s.price)}
                        </span>
                      </div>
                    </div>
                    <Check className="w-4 h-4 text-orange-300 flex-shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 max-w-3xl mx-auto rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-orange-500/[0.06] to-red-500/[0.04] border border-orange-400/20 flex items-center gap-4">
              <InfinityIcon className="w-8 h-8 text-orange-300 flex-shrink-0" />
              <div>
                <h3 className="text-base font-bold text-white mb-0.5">
                  Plus every future release
                </h3>
                <p className="text-sm text-gray-400">
                  New scripts unlock automatically the moment we publish them. No upgrade fees, no
                  re-purchases.
                </p>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ============================================================ */}
        {/* WHY SUBSCRIBE                                                */}
        {/* ============================================================ */}
        <Reveal delay={0.05}>
          <section aria-labelledby="why-title" className="mb-20">
            <div className="text-center mb-10">
              <h2 id="why-title" className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
                Why subscribe instead of buying piecemeal
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              <Benefit
                icon={<Zap className="w-5 h-5" />}
                title="Cheaper from day one"
                body={`Even one month of access (${formatPrice(TIERS[0].price)}) is less than the cost of the cheapest two scripts on this list.`}
              />
              <Benefit
                icon={<RefreshCw className="w-5 h-5" />}
                title="Always up to date"
                body="Updates are pushed continuously to Keymaster. No version locks. No upgrade fees."
              />
              <Benefit
                icon={<Crown className="w-5 h-5" />}
                title="Future-proof"
                body="Anything we release while you're subscribed is yours to use. New flagship scripts cost you nothing extra."
              />
              <Benefit
                icon={<Shield className="w-5 h-5" />}
                title="Production-ready"
                body="Low resmon, secured server events, anti-cheat baked in where applicable. Battle-tested by hundreds of servers."
              />
              <Benefit
                icon={<Headphones className="w-5 h-5" />}
                title="Direct support"
                body="Subscribers get priority response on Discord. Most issues resolved within minutes."
              />
              <Benefit
                icon={<Lock className="w-5 h-5" />}
                title="Cancel anytime"
                body="No lock-in. Cancel from your Tebex account in two clicks. Keep access until the end of the period."
              />
            </div>
          </section>
        </Reveal>

        {/* ============================================================ */}
        {/* FAQ                                                          */}
        {/* ============================================================ */}
        <Reveal delay={0.05}>
          <section aria-labelledby="faq-title" className="mb-16">
            <div className="text-center mb-10">
              <h2 id="faq-title" className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
                Frequently asked
              </h2>
              <p className="text-gray-400 text-sm sm:text-base">
                Still have questions? Ask us directly on{' '}
                <button
                  type="button"
                  onClick={handleDiscordRedirect}
                  className="text-orange-300 hover:text-orange-200 underline decoration-orange-400/40 underline-offset-2"
                >
                  Discord
                </button>
                .
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-2.5">
              {faqs.map((f, i) => (
                <details
                  key={f.q}
                  open={openFaq === i}
                  onToggle={(e) => {
                    if ((e.currentTarget as HTMLDetailsElement).open) setOpenFaq(i);
                  }}
                  className="group glass-luxury rounded-xl overflow-hidden"
                >
                  <summary
                    className="list-none cursor-pointer flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                    onClick={(e) => {
                      // Toggle: if this one is already open, close it.
                      if (openFaq === i) {
                        e.preventDefault();
                        setOpenFaq(null);
                      }
                    }}
                  >
                    <span className="text-sm sm:text-base font-semibold text-white text-left">
                      {f.q}
                    </span>
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/[0.04] border border-white/10 inline-flex items-center justify-center text-orange-300">
                      {openFaq === i ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </span>
                  </summary>
                  <div className="px-5 pb-5 -mt-1 text-sm text-gray-400 leading-relaxed">
                    {f.a}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ============================================================ */}
        {/* FINAL CTA                                                    */}
        {/* ============================================================ */}
        <Reveal delay={0.05}>
          <section className="text-center max-w-3xl mx-auto rounded-3xl p-8 sm:p-12 bg-gradient-to-b from-orange-500/[0.08] to-red-500/[0.04] border border-orange-400/25">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-luxury mb-4">
              <Star className="w-3 h-3 text-orange-300 fill-orange-300" strokeWidth={2.5} />
              <span className="text-[10px] font-bold text-orange-200 uppercase tracking-[0.2em]">
                Limited launch pricing
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
              Ready to ship faster?
            </h2>
            <p className="text-gray-400 text-sm sm:text-base mb-7 max-w-xl mx-auto">
              One subscription.{' '}
              {isLoadingCatalog
                ? 'Every script. Every future release.'
                : `${scriptCount} scripts today, every future release tomorrow.`}{' '}
              Cancel whenever.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={handleDiscordRedirect}
                className="cta-luxury inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold text-white"
              >
                Get notified at launch
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
};

const Benefit: React.FC<{ icon: React.ReactNode; title: string; body: string }> = ({
  icon,
  title,
  body,
}) => (
  <div className="glass-luxury rounded-2xl p-5 hover:border-white/15 transition-colors">
    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/15 to-red-500/10 border border-orange-400/20 text-orange-300 mb-3">
      {icon}
    </div>
    <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>
    <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
  </div>
);

export default SubscriptionPage;

import React, { useMemo, useEffect, useState, useRef } from 'react';
import {
  ArrowRight,
  Flame,
  HelpCircle,
  Plus,
  Minus,
} from 'lucide-react';
import { Package } from '../types';
import { useSEO } from '../hooks/useSEO';
import { API_URL } from '../config/api';
import { isSubscriptionPackage, isVanguard } from '../utils/isBundle';
import { deduplicatePackages } from '../utils/packageDedupe';
import CustomerReviewsSection from '../components/CustomerReviewsSection';
import RecentPaymentsSection from '../components/RecentPaymentsSection';
import HeroParcelsAnimation from '../components/HeroParcelsAnimation';
import PackageCardLite from '../components/PackageCardLite';

interface HomePageProps {
  isLoaded: boolean;
  packages: Package[];
  navigateToScripts: () => void;
  openPackageDetails: (pkg: Package) => void;
  handleDiscordRedirect: () => void;
}

interface TopSellerItem {
  id: number;
  tebexPackageId: number;
  displayOrder: number;
  enabled: boolean;
}

const HomePage: React.FC<HomePageProps> = ({
  isLoaded,
  packages,
  navigateToScripts,
  openPackageDetails,
  handleDiscordRedirect,
}) => {
  const visiblePackages = useMemo(
    () =>
      // Homepage is Oxlyn-only — Vanguard catalogue lives exclusively under
      // /scripts → Vanguard tab and /bundles → Vanguard tab.
      deduplicatePackages(
        packages.filter(
          (p) => !isVanguard(p) && !isSubscriptionPackage(p)
        )
      ),
    [packages]
  );

  const [topSellers, setTopSellers] = useState<TopSellerItem[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/top-sellers`)
      .then((r) => r.json())
      .then((data: TopSellerItem[]) => setTopSellers(Array.isArray(data) ? data : []))
      .catch(() => setTopSellers([]));
  }, []);

  // Resolve admin-curated top scripts against the loaded catalog. Items
  // pointing at a missing/unlisted Tebex package are silently dropped — the
  // order is preserved from the server-side `display_order`.
  const topScripts = useMemo(() => {
    return topSellers
      .map((item) => visiblePackages.find(
        (p) => Number(p.tebexPackageId) === Number(item.tebexPackageId)
      ))
      .filter((p): p is Package => p !== undefined);
  }, [topSellers, visiblePackages]);

  const popularPackages = visiblePackages.slice(0, 5);

  const homeJsonLd = useMemo(() => {
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://oxlynsoftware.com/' },
        { '@type': 'ListItem', position: 2, name: 'Scripts', item: 'https://oxlynsoftware.com/scripts' },
      ],
    };
    const itemList = popularPackages.length
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Popular FiveM Scripts',
          itemListElement: popularPackages.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Product',
              name: p.name,
              image: p.image,
              description: (p.description || '').slice(0, 300),
              brand: { '@type': 'Brand', name: 'OXLYN Software' },
              offers: {
                '@type': 'Offer',
                price: p.price,
                priceCurrency: 'EUR',
                availability: 'https://schema.org/InStock',
                url: `https://oxlynsoftware.com/product/${p.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/(^-|-$)/g, '')}`,
              },
            },
          })),
        }
      : null;
    return itemList ? [breadcrumb, itemList] : [breadcrumb];
  }, [popularPackages]);

  useSEO({
    title: 'Oxlyn Software — Premium FiveM Scripts for QBCore, ESX & QBox · Instant Delivery',
    description:
      'Buy premium FiveM scripts trusted by 874+ servers. QBCore, ESX & QBox compatible. 0.04ms idle, instant delivery via Tebex, lifetime updates, 7-day money-back guarantee.',
    canonical: '/',
    type: 'website',
    jsonLd: homeJsonLd,
  });

  return (
    <>
      {/* HERO — text-led layout. The right-side mark/orbits were too busy;
          now a duo of large OXLYN wordmarks sits in the background as the
          sole visual interest (stroked + filled at different opacities). */}
      <section id="hero" className="relative w-full overflow-hidden flex flex-col">
        {/* The three .geometric-shape divs that used to live here were
            visually below the threshold of perception (opacity 0.5 / 0.018
            white on a near-black background) but ran a permanent transform
            animation, burning ~3% main-thread budget on every frame of every
            scroll for ~zero design value. Removed entirely. */}

        {/* Two-layer brand watermark — outlined ghost + offset filled echo.
            Drifts horizontally on a long loop. */}
        <div aria-hidden="true" className="hero-watermark-stack">
          <span className="hero-watermark hero-watermark-fill">OXLYN</span>
          <span className="hero-watermark hero-watermark-stroke">OXLYN</span>
        </div>

        <div className="relative z-10 flex flex-col flex-1 justify-center pt-24 sm:pt-36 pb-16 sm:pb-24 px-6 sm:px-10">
          <div className="hero-grid-v2">
            <div
              className={`text-left transition-all duration-1200 ${
                isLoaded ? 'apple-slide-up' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: '200ms' }}
            >
              <h1
                className="font-black mb-6 leading-[0.92] tracking-tight uppercase max-w-[18ch]"
                style={{ fontSize: 'clamp(2.5rem, 5.2vw, 5.25rem)' }}
              >
                <span className="block text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.08)]">
                  FiveM resources
                </span>
                <span className="block text-white">that make your</span>
                <span className="block">
                  server <RotatingPhrase phrases={HERO_PHRASES} intervalMs={2800} />
                </span>
              </h1>

              <p className="text-[15px] sm:text-base text-gray-500 max-w-[44ch] mb-8 leading-relaxed font-light">
                Battle-tested FiveM scripts for QBCore, ESX & QBox — plug-and-play installs, instant Tebex delivery, and lifetime updates.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <button onClick={navigateToScripts} className="cta-light">
                  <span>Browse Products</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleDiscordRedirect}
                  className="group cta-luxury relative overflow-hidden px-6 py-3 rounded-full font-bold text-[14px] flex items-center justify-center gap-2 text-white"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <svg className="w-4 h-4 relative z-10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
                  </svg>
                  <span className="relative z-10">Join Discord</span>
                </button>
              </div>
            </div>

            {/* RIGHT — floating OXLYN 3D parcels. Pure brand visual; no text,
                no code, just the mark cast in three sizes drifting in space
                with a soft red haze and a subtle grid behind them. */}
            <div className="relative hidden lg:flex items-center justify-center">
              <HeroParcelsAnimation />
            </div>
          </div>
        </div>
      </section>

      {/* TOP SCRIPTS — admin-curated carousel of PackageCards */}
      {topScripts.length > 0 && (
        <TopScriptsSection
          packages={topScripts}
          isLoaded={isLoaded}
          openPackageDetails={openPackageDetails}
        />
      )}

      {/* CUSTOMER REVIEWS — auto-rotating carousel with edge fade */}
      <CustomerReviewsSection />

      {/* OUR ACHIEVEMENTS — count-up stats triggered on viewport entry */}
      <OurAchievementsSection />

      {/* WHY CHOOSE US — 4-card grid */}
      <WhyChooseUsSection handleDiscordRedirect={handleDiscordRedirect} />

      {/* FAQ */}
      <section className="relative py-20 sm:py-24" id="faq">
        <div className="max-w-[900px] mx-auto px-6 sm:px-10">
          <div className="text-center mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-luxury mb-3">
              <HelpCircle className="w-3 h-3 text-orange-300" strokeWidth={2.5} />
              <span className="text-[10px] font-bold text-orange-200 uppercase tracking-[0.2em]">FAQ</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
              <span className="text-white">Everything you want to ask </span>
              <span className="gradient-text-brand italic">before buying.</span>
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => (
              <FAQItem key={idx} question={item.q} answer={item.a} defaultOpen={idx === 0} />
            ))}
          </div>
        </div>
      </section>

      {/* RECENT PAYMENTS — second placement on the landing, sits between FAQ
          and the Discord CTA. Same data as the package details page. */}
      <RecentPaymentsSection />

      {/* DISCORD CTA — closing block invites the user into the community */}
      <DiscordCTASection onJoin={handleDiscordRedirect} />

    </>
  );
};

// Hero title — rotating tail phrases. All carry the same brand promise so the
// cycle reads as variations on a theme, not as separate claims. Kept short and
// punchy so the multi-line all-caps headline doesn't reflow on every swap.
const HERO_PHRASES = [
  'STAND OUT.',
  'SCALE EASILY.',
  'SHIP FAST.',
  'NEVER LAG.',
  'FEEL ALIVE.',
];

const RotatingPhrase: React.FC<{ phrases: string[]; intervalMs?: number }> = ({
  phrases,
  intervalMs = 2600,
}) => {
  const [idx, setIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(-1);

  useEffect(() => {
    if (phrases.length < 2) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const t = setInterval(() => {
      setIdx((i) => {
        setPrevIdx(i);
        return (i + 1) % phrases.length;
      });
    }, intervalMs);
    return () => clearInterval(t);
  }, [phrases, intervalMs]);

  // Sizer holds space for the longest phrase so the title prefix doesn't
  // jump on each swap. Each phrase is absolutely overlaid on top and slides
  // in/out via .is-active / .is-leaving classes — keeps gradient text intact
  // (per-char animation breaks -webkit-background-clip: text).
  const longest = phrases.reduce((a, b) => (b.length > a.length ? b : a), '');

  return (
    <span className="rotating-phrase-wrap" aria-live="polite">
      <span className="rotating-phrase-sizer gradient-text-brand italic" aria-hidden="true">
        {longest}
      </span>
      {phrases.map((phrase, i) => {
        let state: 'active' | 'leaving' | 'idle' = 'idle';
        if (i === idx) state = 'active';
        else if (i === prevIdx) state = 'leaving';
        return (
          <span
            key={i}
            className={`rotating-phrase gradient-text-brand italic is-${state}`}
            aria-hidden={state !== 'active'}
          >
            {phrase}
          </span>
        );
      })}
    </span>
  );
};

// "Top Scripts" — infinite marquee of PackageCards. Same scroll pattern as
// the Recent Payments / Customer Reviews ribbons: duplicate the list once,
// translate by -50% over a long loop, pause on hover so users can interact
// with the underlying cards. Order comes from the admin (display_order on
// the server).
//
// Renders PackageCardLite (not the full PackageCard) — the lite variant
// drops Tebex/Analytics/Tags context subscriptions, so the duplicated
// track (2×N cards) doesn't trigger a reconciliation cascade every time
// the cart context updates. The click still opens the product page,
// where the full card and "Add to Basket" live.
const TopScriptsSection: React.FC<{
  packages: Package[];
  isLoaded: boolean;
  openPackageDetails: (pkg: Package) => void;
}> = ({ packages, isLoaded, openPackageDetails }) => {
  // Duplicating the list lets the translate(-50%) animation loop seamlessly
  // — when the first copy scrolls past the viewport the second copy is in
  // the exact position the first started from.
  const loop = useMemo(() => [...packages, ...packages], [packages]);

  // Scale the animation duration with the list length so the perceived
  // speed stays roughly constant whether the admin curates 3 or 12 picks.
  const durationSeconds = Math.max(40, packages.length * 9);

  return (
    <section className="relative py-16 sm:py-20" id="top-scripts">
      <div className="max-w-[1480px] mx-auto px-6 sm:px-10">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-luxury mb-3">
            <Flame className="w-3 h-3 text-red-400 fill-red-400" strokeWidth={0} />
            <span className="text-[10px] font-bold text-red-200 uppercase tracking-[0.2em]">Curated Selection</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
            <span className="text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.20)]">Top </span>
            <span className="gradient-text-brand">Scripts</span>
          </h2>
          <p className="text-sm text-gray-500 mt-4 font-light max-w-xl mx-auto">
            The most loved <b className="text-white">FiveM</b> resources from our catalog — hand-picked for performance, stability, and seamless server integration.
          </p>
        </div>

        <div className="top-scripts-marquee">
          <div
            className="top-scripts-marquee-track"
            style={{ animationDuration: `${durationSeconds}s` }}
          >
            {loop.map((pkg, i) => (
              // Both copies stay fully interactive. (We used to mark the
              // duplicated half `inert` to save event cost, but the marquee
              // scrolls the duplicates into view for ~half the loop — so an
              // inert card under the cursor made clicks silently do nothing.
              // The marquee pauses on hover/focus, so clicking is reliable.)
              <div key={`${pkg.id}-${i}`} className="top-scripts-marquee-slot">
                <PackageCardLite
                  package={pkg}
                  onClick={openPackageDetails}
                  priority={i < 3}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'How does delivery work?',
    a: 'Payments process through Tebex. The moment your transaction confirms, your license key unlocks instantly in your Tebex customer portal — usually within 30 seconds. Download the resource folder, drop it in /resources, ensure it, and you’re live.',
  },
  {
    q: 'Which frameworks are supported?',
    a: 'Every Oxlyn script auto-detects QBCore, QBox and ESX Legacy on boot. One license covers all three — if you migrate your server later, you don’t pay twice.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Yes — full 7-day refund, no questions asked, as long as the license hasn’t been activated on a live server. Refunds process through Tebex back to your original payment method (usually within 1–3 business days).',
  },
  {
    q: 'Are updates really free forever?',
    a: 'Yes. Every script ships with lifetime updates included in the original price. New features, bug fixes, framework-compatibility patches — they all drop into your customer portal automatically.',
  },
  {
    q: 'Can I edit the code?',
    a: 'Configs (config.lua), locales, SQL migrations and the UI source are all open. Only the licensing core stays obfuscated — that’s what prevents piracy. Every gameplay-relevant value is yours to tune.',
  },
  {
    q: 'How many servers can I use a license on?',
    a: 'A standard license covers one server. The Server Owner Pack covers two servers. Need more? Contact us for enterprise pricing.',
  },
  {
    q: 'What if I need help installing?',
    a: 'Documentation walks through every step with screenshots. If you’re stuck, our Discord has free install support 24/7 — average reply under 6 hours on tickets, instant on Discord during European hours.',
  },
];

const FAQItem: React.FC<{ question: string; answer: string; defaultOpen?: boolean }> = ({
  question,
  answer,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-luxury rounded-2xl overflow-hidden transition-all">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm sm:text-base font-semibold text-white pr-4">{question}</span>
        <span className="flex-shrink-0 w-8 h-8 rounded-full glass-luxury flex items-center justify-center text-orange-300">
          {open ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-[grid-template-rows] duration-300 ease-out grid ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-5 sm:px-6 pb-5 text-sm text-gray-400 leading-relaxed font-light">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// OUR ACHIEVEMENTS — count-up stats triggered on viewport entry
// ============================================================

interface Achievement {
  target: number;
  label: string;
  /** When true, render value + label in the brand accent gradient. */
  accent?: boolean;
  /**
   * Display format for the stat's value:
   *   • `'k'`       → "28K"           (clean K-suffix, no plus sign)
   *   • `'k-plus'`  → "112K+"         (K-suffix with trailing plus)
   *   • `'comma-plus'` → "28,894+"    (full digits with thousands commas + plus)
   *   • `'plain'`   → "1500"          (raw integer)
   */
  format?: 'k' | 'k-plus' | 'comma-plus' | 'plain';
}

const ACHIEVEMENTS: Achievement[] = [
  { target: 98000, label: 'Downloads',      format: 'k' },
  { target: 28000, label: 'Active Players', format: 'k', accent: true },
  { target: 37000, label: 'Active Servers', format: 'k' },
];

// `target` is the final animated value, `value` is the current frame. The
// trailing "+" is only appended once the animation lands on the target so
// it doesn't read as a constantly-changing "growing" number during count-up.
const formatStat = (value: number, target: number, format: Achievement['format']): string => {
  const isComplete = value >= target;
  const asK = (n: number) => (n >= 1000 ? `${Math.floor(n / 1000)}K` : String(n));
  const asComma = (n: number) => n.toLocaleString('en-US');
  switch (format) {
    case 'k-plus':     return isComplete ? `${asK(value)}+` : asK(value);
    case 'comma-plus': return isComplete ? `${asComma(value)}+` : asComma(value);
    case 'plain':      return String(value);
    case 'k':
    default:           return asK(value);
  }
};

const OurAchievementsSection: React.FC = React.memo(() => (
  <section className="relative py-20 sm:py-24" id="achievements">
    <div className="max-w-[1300px] mx-auto px-6 sm:px-10 text-center">
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3">
        <span className="text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.20)]">Our </span>
        <span className="gradient-text-brand">Achievements</span>
      </h2>
      <p className="text-sm sm:text-base text-gray-500 max-w-xl mx-auto font-light mb-12">
        Started in 2020, trusted by servers worldwide for quality{' '}
        <b className="text-white">FiveM</b> resources.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
        {ACHIEVEMENTS.map((a) => (
          <AchievementStat
            key={a.label}
            target={a.target}
            label={a.label}
            accent={a.accent}
            format={a.format ?? 'k'}
          />
        ))}
      </div>
    </div>
  </section>
));

const AchievementStat: React.FC<{
  target: number;
  label: string;
  accent?: boolean;
  format?: Achievement['format'];
}> = ({ target, label, accent = false, format = 'k' }) => {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Trigger the count animation only when the section is genuinely on
  // screen — threshold 0.6 + a negative rootMargin pushes the trigger
  // past the fold so the animation doesn't fire on first paint if the
  // section happens to sit just under the hero.
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.6, rootMargin: '0px 0px -15% 0px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    const durationMs = 1800;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target]);

  return (
    <div ref={ref} className="achievement-stat">
      <div className={`achievement-stat-value ${accent ? 'is-accent' : ''}`}>
        {formatStat(value, target, format)}
      </div>
      <div className={`achievement-stat-label ${accent ? 'is-accent' : ''}`}>{label}</div>
    </div>
  );
};

// ============================================================
// WHY CHOOSE US — 4-card grid
// ============================================================

interface ChooseUsCard {
  Icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  cta?: { label: string; onClick: () => void };
  accent: boolean;
}

const WhyChooseUsSection: React.FC<{ handleDiscordRedirect: () => void }> = ({
  handleDiscordRedirect,
}) => {
  const cards: ChooseUsCard[] = [
    {
      Icon: MessageCircle,
      title: 'Support & Community',
      body: "At OXLYN, we're all about support. Join our friendly community for help, tips, and a warm welcome. Count on us for personalized assistance and a supportive network.",
      cta: { label: 'Join our Discord!', onClick: handleDiscordRedirect },
      accent: false,
    },
    {
      Icon: BarChart3,
      title: 'Quality & Performance',
      body: "At OXLYN, quality and performance drive everything we do. We're dedicated to continuous improvement, guaranteeing top-notch experiences for our customers.",
      cta: { label: 'Read our Docs!', onClick: () => window.open('https://docs.oxlynsoftware.com', '_blank') },
      accent: true,
    },
    {
      Icon: PuzzleIcon,
      title: 'Easy to Use',
      body: 'OXLYN products are designed for ease of use. Our comprehensive guides ensure smooth installation and usage. Need assistance? We\'ve got your back every step of the way.',
      accent: true,
    },
    {
      Icon: ShieldIcon,
      title: 'Tebex Security',
      body: 'Our products are encrypted by Cfx.re and undergo additional ownership validation via Tebex, ensuring your utmost security.',
      accent: false,
    },
  ];

  return (
    <section className="relative py-20 sm:py-24" id="why-choose-us">
      <div className="max-w-[1300px] mx-auto px-6 sm:px-10">
        <div className="text-center mb-12 sm:mb-14">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3">
            <span className="text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.20)]">Why </span>
            <span className="gradient-text-brand">Choose Us</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-500 max-w-xl mx-auto font-light">
            We deliver optimized, reliable solutions that integrate smoothly and perform{' '}
            <b className="text-white">consistently</b> on your server.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {cards.map((c) => (
            <ChooseUsCardEl key={c.title} {...c} />
          ))}
        </div>
      </div>
    </section>
  );
};

const ChooseUsCardEl: React.FC<ChooseUsCard> = ({ Icon, title, body, cta, accent }) => (
  <div className={`choose-card ${accent ? 'is-accent' : ''}`}>
    <div className="choose-card-icon">
      <Icon size={20} strokeWidth={2} />
    </div>
    <h3 className={`choose-card-title ${accent ? 'is-accent' : ''}`}>{title}</h3>
    <p className="choose-card-body">{body}</p>
    {cta && (
      <button onClick={cta.onClick} className="choose-card-cta">
        <span>{cta.label}</span>
        <Link2 className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

// ============================================================
// DISCORD CTA — closing block invites the user into the community
// ============================================================

const DiscordCTASection: React.FC<{ onJoin: () => void }> = React.memo(({ onJoin }) => (
  <section className="relative py-16 sm:py-24">
    <div className="max-w-[1300px] mx-auto px-6 sm:px-10">
      <div className="discord-cta">
        <div className="discord-cta-content">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3">
            <span className="text-white">Join our </span>
            <span className="discord-cta-accent">Discord</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-400 mb-6 max-w-lg font-light leading-relaxed">
            Join thousands of FiveM server owners in our Discord — real-time install help, sneak peeks of upcoming scripts, and a community that actually answers when you ask.
          </p>
          <button onClick={onJoin} className="discord-cta-btn">
            Discord
          </button>
          <p className="text-xs text-gray-600 mt-5 max-w-md font-light">
            Free to join · active 24/7 · average response under 6 hours from the OXLYN devs.
          </p>
        </div>

        {/* Right-side visual — Discord-themed 3D illustration served straight
            from the Tebex CDN (original 1393×273 PNG, no local resampling)
            so the characters keep their full source resolution. The trade-off
            vs the local WebP is ~170 KB extra, but the image is lazy-loaded
            and below the fold so it never blocks LCP. */}
        <div className="discord-cta-visual" aria-hidden="true">
          <img
            src="https://cdn.tebex.io/store/1089418/templates/265524/assets/64b0a340c692e8732bafaf5dbf09b9572767f424.png"
            alt=""
            loading="lazy"
            decoding="async"
            width={1393}
            height={273}
            className="discord-cta-banner-img"
            draggable={false}
          />
        </div>
      </div>
    </div>
  </section>
));

// Lightweight icon glyphs for the WhyChooseUs section. Using inline SVGs
// instead of pulling another lucide import to keep the dep surface small.
const PuzzleIcon: React.FC<{ size?: number; className?: string; strokeWidth?: number }> = ({
  size = 20,
  className,
  strokeWidth = 2,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.611a2.404 2.404 0 0 1-3.408 0l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.404 2.404 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525a2.404 2.404 0 0 1 3.408 0l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z" />
  </svg>
);

const ShieldIcon: React.FC<{ size?: number; className?: string; strokeWidth?: number }> = ({
  size = 20,
  className,
  strokeWidth = 2,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </svg>
);

const BarChart3: React.FC<{ size?: number; className?: string; strokeWidth?: number }> = ({
  size = 20,
  className,
  strokeWidth = 2,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M3 3v18h18" />
    <path d="M7 16V8" />
    <path d="M11 16V5" />
    <path d="M15 16v-6" />
    <path d="M19 16v-3" />
  </svg>
);

// Inline Discord glyph used as the "Support & Community" card icon. Lucide
// doesn't ship a Discord icon so we keep the SVG path here. The unused
// `strokeWidth` prop is part of the ChooseUsCard.Icon contract.
const MessageCircle: React.FC<{ size?: number; className?: string; strokeWidth?: number }> = ({
  size = 20,
  className,
}) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
    <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
  </svg>
);

const Link2: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M9 17H7A5 5 0 0 1 7 7h2" />
    <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

export default HomePage;

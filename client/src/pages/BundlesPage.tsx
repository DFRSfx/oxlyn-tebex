import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package as PackageIcon, ChevronRight, Search, Check } from 'lucide-react';
import VanguardNotice from '../components/VanguardNotice';
import { Package } from '../types';
import PackageCard from '../components/PackageCard';
import { useSEO } from '../hooks/useSEO';
import { isBundle, isSubscriptionPackage, isVanguard } from '../utils/isBundle';
import { deduplicatePackages, deduplicateVanguard } from '../utils/packageDedupe';

type Brand = 'oxlyn' | 'vanguard';

interface BundlesPageProps {
  isLoaded: boolean;
  packages: Package[];
  openPackageDetails: (pkg: Package) => void;
  /** Which brand to show on mount. Set per-route in App.tsx so /bundles
   *  defaults to Oxlyn and /vanguardbundles defaults to Vanguard. */
  initialBrand?: Brand;
}

const BundlesPage: React.FC<BundlesPageProps> = ({
  isLoaded,
  packages,
  openPackageDetails,
  initialBrand = 'oxlyn',
}) => {
  const navigate = useNavigate();
  const [brand, setBrand] = useState<Brand>(initialBrand);
  const [query, setQuery] = useState('');

  // Keep tab + URL in sync, same pattern as ScriptsPage. Replace history
  // entries so the back button doesn't ping-pong between /bundles ↔
  // /vanguardbundles.
  useEffect(() => {
    setBrand(initialBrand);
  }, [initialBrand]);
  const switchBrand = (next: Brand) => {
    setBrand(next);
    navigate(next === 'vanguard' ? '/vanguardbundles' : '/bundles', { replace: true });
  };

  // Reset the search bar whenever the user flips brand — leaving an Oxlyn
  // search term active when switching to Vanguard would silently filter the
  // new catalogue down to zero matches.
  useEffect(() => setQuery(''), [brand]);

  const bundles = useMemo(() => {
    const isOxlyn = brand === 'oxlyn';
    const base = packages.filter((pkg) => {
      if (isSubscriptionPackage(pkg)) return false;
      if (!isBundle(pkg)) return false;
      return isOxlyn ? !isVanguard(pkg) : isVanguard(pkg);
    });

    const q = query.trim().toLowerCase();
    const matched = q
      ? base.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.description?.toLowerCase().includes(q) ?? false)
        )
      : base;

    return isOxlyn ? deduplicatePackages(matched) : deduplicateVanguard(matched);
  }, [packages, brand, query]);

  // Counts shown on each tab.
  const brandCounts = useMemo(() => {
    const oxBase = packages.filter((p) => !isSubscriptionPackage(p) && isBundle(p) && !isVanguard(p));
    const vgBase = packages.filter((p) => !isSubscriptionPackage(p) && isBundle(p) && isVanguard(p));
    return {
      oxlyn: deduplicatePackages(oxBase).length,
      vanguard: deduplicateVanguard(vgBase).length,
    };
  }, [packages]);

  const bundlesJsonLd = useMemo(() => {
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://oxlynsoftware.com/' },
        { '@type': 'ListItem', position: 2, name: 'Bundles', item: 'https://oxlynsoftware.com/bundles' },
      ],
    };
    const itemList = bundles.length
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'FiveM Script Bundles',
          itemListElement: bundles.map((p, i) => ({
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
  }, [bundles]);

  useSEO({
    title: brand === 'vanguard'
      ? 'Vanguard Bundles — Legacy FiveM Bundle Packs (acquired by OXLYN)'
      : 'FiveM Script Bundles — Save up to 40% · OXLYN Software',
    description: brand === 'vanguard'
      ? 'Bundle packs from the Vanguard Labs FiveM store — a legacy catalogue OXLYN acquired and keeps online. ESX & QBCore compatible. Escrow + Unlocked builds.'
      : 'Production-ready FiveM script bundles for QBCore, ESX & QBox. Curated packs at bundle pricing — save up to 40% versus individual scripts. Instant delivery via Tebex.',
    canonical: brand === 'vanguard' ? '/vanguardbundles' : '/bundles',
    type: 'website',
    jsonLd: bundlesJsonLd,
  });

  return (
    <section className="relative min-h-screen pt-20 sm:pt-28 pb-20 sm:pb-28">
      <style>{`
        @keyframes bundlesCardEnter {
          0%   { opacity: 0; transform: translateY(28px) scale(0.96); filter: blur(6px); }
          60%  { filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .bundles-grid-item {
          opacity: 0;
          animation: bundlesCardEnter 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          will-change: transform, opacity, filter;
        }
      `}</style>

      <div className="relative z-10 max-w-[1480px] mx-auto px-6 sm:px-10">
        {/* === HEADER === */}
        <div
          className={`relative mb-8 sm:mb-10 transition-all duration-1200 ${
            isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="scripts-header-glow" aria-hidden="true" />

          <h1 className="relative text-4xl sm:text-5xl md:text-[3.25rem] font-black tracking-tight leading-[1.05] mb-3">
            <span className="text-zinc-400/80">Browse Our </span>
            <span className="text-white drop-shadow-[0_0_36px_rgba(255,255,255,0.22)]">
              {brand === 'oxlyn' ? 'Bundles' : 'Vanguard Bundles'}
            </span>
          </h1>

          <p className="relative text-sm sm:text-base text-gray-500 max-w-2xl font-light leading-relaxed">
            {bundles.length === 0 && !query
              ? "We're cooking up our next bundle. Subscribe to be the first to know when it drops."
              : brand === 'oxlyn'
                ? <>Hand-curated packs of our best-selling scripts. One purchase, full coverage, bundle pricing — save up to <b className="text-white">40%</b> versus individual scripts.</>
                : <>Bundle packs from the legacy <b className="text-white">Vanguard</b> catalogue. Available in both <b className="text-white">Escrow</b> and <b className="text-white">Unlocked</b> variants.</>
            }
          </p>
        </div>

        {/* Brand switcher — same card pattern as /scripts (Oxlyn logo
            + Vanguard logo, springy active check). Hidden when both
            catalogues are empty (e.g. fresh install with no bundles
            yet). */}
        {(brandCounts.oxlyn > 0 || brandCounts.vanguard > 0) && (
          <div className="brand-switcher" role="tablist" aria-label="Choose bundle brand">
            <button
              type="button"
              role="tab"
              aria-selected={brand === 'oxlyn'}
              onClick={() => switchBrand('oxlyn')}
              className={`brand-card ${brand === 'oxlyn' ? 'is-active' : ''}`}
            >
              <span className="brand-card-icon">
                <img src="/logo.webp" alt="" loading="eager" decoding="async" width={30} height={30} />
              </span>
              <span className="brand-card-body">
                <span className="brand-card-title">Oxlyn Bundles</span>
                <span className="brand-card-sub">
                  <span>Curated packs</span>
                  <span className="brand-card-sub-dot" aria-hidden="true" />
                  <span>Save up to 40%</span>
                </span>
              </span>
              <span className="brand-card-count">{brandCounts.oxlyn}</span>
              <span className="brand-card-check" aria-hidden="true">
                <Check size={11} strokeWidth={3} />
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={brand === 'vanguard'}
              onClick={() => switchBrand('vanguard')}
              className={`brand-card ${brand === 'vanguard' ? 'is-active' : ''}`}
            >
              <span className="brand-card-icon">
                <img src="/vanguard-logo.webp" alt="" loading="eager" decoding="async" width={30} height={30} />
              </span>
              <span className="brand-card-body">
                <span className="brand-card-title">Vanguard Bundles</span>
                <span className="brand-card-sub">
                  <span>Acquired by Oxlyn</span>
                  <span className="brand-card-sub-dot" aria-hidden="true" />
                  <span>Legacy archive</span>
                </span>
              </span>
              <span className="brand-card-count">{brandCounts.vanguard}</span>
              <span className="brand-card-check" aria-hidden="true">
                <Check size={11} strokeWidth={3} />
              </span>
            </button>
          </div>
        )}

        {/* Vanguard context + promo — same component as /scripts, just
            tailored copy for the bundles page. */}
        {brand === 'vanguard' && <VanguardNotice kind="bundles" />}

        {(bundles.length > 0 || query.length > 0) && (
          <div className="mb-8 sm:mb-10 max-w-2xl">
            <div className="scripts-search">
              <Search size={16} className="scripts-search-icon" strokeWidth={2.2} />
              <input
                type="text"
                placeholder={brand === 'oxlyn' ? 'Search for bundles...' : 'Search Vanguard bundles...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="scripts-search-input"
              />
            </div>
          </div>
        )}

        {/* === GRID === */}
        {bundles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {bundles.map((pkg, index) => (
              <div
                key={pkg.id}
                className="bundles-grid-item h-full"
                style={{ animationDelay: `${Math.min(index * 60, 1000)}ms` }}
              >
                <PackageCard
                  package={pkg}
                  onClick={openPackageDetails}
                  isLoaded={isLoaded}
                  delay={400 + index * 80}
                  priority={index < 6}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            hasQuery={query.length > 0}
            onReset={() => setQuery('')}
          />
        )}
      </div>
    </section>
  );
};

const EmptyState: React.FC<{ hasQuery: boolean; onReset: () => void }> = ({ hasQuery, onReset }) => (
  <div className="flex flex-col items-center justify-center py-16 sm:py-24">
    <div className="relative mb-6">
      <div className="absolute inset-0 bg-red-500/15 blur-3xl rounded-full" />
      <div className="relative glass-luxury p-8 rounded-3xl">
        <PackageIcon className="w-14 h-14 text-red-300/80" />
      </div>
    </div>
    <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 text-center">
      {hasQuery ? 'No matches' : 'Bundles coming soon'}
    </h3>
    <p className="text-sm text-gray-400 mb-6 max-w-md text-center font-light">
      {hasQuery
        ? 'Try clearing the search or browsing the full scripts catalog.'
        : 'New curated bundles drop here as soon as they ship. Check back shortly.'}
    </p>
    {hasQuery ? (
      <button
        onClick={onReset}
        className="cta-luxury inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-2xl text-sm"
      >
        <span>Clear search</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    ) : (
      <a
        href="/scripts"
        className="cta-luxury inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-2xl text-sm"
      >
        <span>Browse all scripts</span>
        <ChevronRight className="w-4 h-4" />
      </a>
    )}
  </div>
);

export default BundlesPage;

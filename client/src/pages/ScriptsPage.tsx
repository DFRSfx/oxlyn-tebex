import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, ChevronRight, Search, Check } from 'lucide-react';
import { Package } from '../types';
import PackageCard from '../components/PackageCard';
import VanguardNotice from '../components/VanguardNotice';
import { useSEO } from '../hooks/useSEO';
import { categoriesService, StoreCategory } from '../services/categoriesService';
import { isBundle, isSubscriptionPackage, isVanguard } from '../utils/isBundle';
import { deduplicatePackages, deduplicateVanguard } from '../utils/packageDedupe';

// 'all' (built-in catch-all) | `cat:<id>` for any admin-defined category.
type ScriptsFilter = 'all' | `cat:${number}`;
// Top-level brand toggle — picks the catalogue source for the whole page.
type Brand = 'oxlyn' | 'vanguard';

interface ScriptsPageProps {
  isLoaded: boolean;
  packages: Package[];
  openPackageDetails: (pkg: Package) => void;
  /** Which brand to show on mount. Set per-route in App.tsx so /scripts
   *  defaults to Oxlyn and /vanguardscripts defaults to Vanguard. */
  initialBrand?: Brand;
}

const ScriptsPage: React.FC<ScriptsPageProps> = ({
  isLoaded,
  packages,
  openPackageDetails,
  initialBrand = 'oxlyn',
}) => {
  const navigate = useNavigate();
  const [brand, setBrand] = useState<Brand>(initialBrand);

  // Keep the URL in sync with the active tab so refreshes / shareable
  // links always land on the right catalogue. Uses `replace` so the
  // browser back button still goes to wherever the user came from,
  // instead of bouncing between /scripts ↔ /vanguardscripts when they
  // toggle. The initialBrand → state sync below also covers the case
  // of the user clicking a route directly while the page is already
  // mounted (e.g. navbar link).
  useEffect(() => {
    setBrand(initialBrand);
  }, [initialBrand]);
  const switchBrand = (next: Brand) => {
    setBrand(next);
    navigate(next === 'vanguard' ? '/vanguardscripts' : '/scripts', { replace: true });
  };
  const [filter, setFilter] = useState<ScriptsFilter>('all');
  const [query, setQuery] = useState('');
  const [customCategories, setCustomCategories] = useState<StoreCategory[]>([]);

  useEffect(() => {
    categoriesService.fetchPublic().then(setCustomCategories).catch(() => {});
  }, []);

  // Reset category pill + search whenever the user toggles brand — the
  // admin-defined categories belong to the Oxlyn catalogue and don't apply
  // to the Vanguard tab. Search is also brand-scoped so leaving stale terms
  // around when switching tabs is confusing.
  useEffect(() => {
    setFilter('all');
    setQuery('');
  }, [brand]);

  useSEO({
    title: brand === 'vanguard'
      ? 'Vanguard Scripts — Legacy FiveM Catalogue (acquired by OXLYN)'
      : 'FiveM Scripts Catalog — QBCore, ESX & QBox Resources',
    description: brand === 'vanguard'
      ? 'Browse the Vanguard Labs FiveM catalogue — a legacy collection OXLYN acquired and keeps online. ESX & QBCore compatible. Escrow + Unlocked (full source) builds.'
      : 'Browse the full OXLYN catalog of premium FiveM scripts. QBCore, ESX, and QBox compatible. Optimized, secure, and battle-tested by thousands of servers.',
    canonical: brand === 'vanguard' ? '/vanguardscripts' : '/scripts',
  });

  // Brand-aware base catalogue. Both brands exclude subscriptions (those
  // belong on /subscription only) and bundles (those live on /bundles).
  // Vanguard tab uses a separate, more aggressive dedup since the
  // escrow/unlocked variant naming is inconsistent (see vanguardBaseName).
  const filteredPackages = useMemo(() => {
    const isOxlyn = brand === 'oxlyn';
    const base = packages.filter((pkg) => {
      if (isSubscriptionPackage(pkg)) return false;
      if (isBundle(pkg)) return false;
      return isOxlyn ? !isVanguard(pkg) : isVanguard(pkg);
    });

    let matched: Package[];
    // Custom categories only apply on the Oxlyn tab.
    if (isOxlyn && typeof filter === 'string' && filter.startsWith('cat:')) {
      const catId = Number(filter.slice(4));
      const cat = customCategories.find((c) => c.id === catId);
      if (cat) {
        const idSet = new Set(cat.packageIds);
        matched = base.filter((pkg) =>
          pkg.tebexPackageId ? idSet.has(pkg.tebexPackageId) : false
        );
      } else {
        matched = base;
      }
    } else {
      matched = base;
    }

    // Search — case-insensitive substring against name + description.
    const q = query.trim().toLowerCase();
    if (q.length > 0) {
      matched = matched.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q) ?? false)
      );
    }

    return isOxlyn ? deduplicatePackages(matched) : deduplicateVanguard(matched);
  }, [packages, brand, filter, query, customCategories]);

  // Per-category visible count, after dedupe + vanguard exclusion.
  const categoryCounts = useMemo(() => {
    const map = new Map<number, number>();
    if (brand !== 'oxlyn') return map;
    const base = packages.filter(
      (p) => !isVanguard(p) && !isBundle(p)
    );
    for (const cat of customCategories) {
      const ids = new Set(cat.packageIds);
      const matched = base.filter((p) =>
        p.tebexPackageId ? ids.has(p.tebexPackageId) : false
      );
      map.set(cat.id, deduplicatePackages(matched).length);
    }
    return map;
  }, [brand, packages, customCategories]);

  const visibleCustomCategories = useMemo(
    () => customCategories.filter((c) => (categoryCounts.get(c.id) || 0) > 0),
    [customCategories, categoryCounts]
  );

  // Counts shown on the brand tabs themselves so users see at a glance
  // how big each catalogue is.
  const brandCounts = useMemo(() => {
    let oxlyn = 0;
    let vanguard = 0;
    for (const pkg of packages) {
      if (isSubscriptionPackage(pkg) || isBundle(pkg)) continue;
      if (isVanguard(pkg)) vanguard++;
      else oxlyn++;
    }
    // Apply dedup so the count matches what's actually rendered as cards.
    const dedupOxlyn = deduplicatePackages(
      packages.filter((p) => !isSubscriptionPackage(p) && !isBundle(p) && !isVanguard(p))
    ).length;
    const dedupVan = deduplicateVanguard(
      packages.filter((p) => !isSubscriptionPackage(p) && !isBundle(p) && isVanguard(p))
    ).length;
    return { oxlyn: dedupOxlyn || oxlyn, vanguard: dedupVan || vanguard };
  }, [packages]);

  return (
    <section className="relative min-h-screen pt-20 sm:pt-28 pb-20 sm:pb-28">
      {/* No local background overlays — global .page-gradient flows through */}
      <style>{`
        /* Card enter — opacity + transform only. The previous version animated
           filter:blur() per card which on Intel iGPUs forced a re-rasterize on
           every frame × N cards × 0.7s. The visual difference is imperceptible
           once the transform/opacity carries the motion. */
        @keyframes scriptsCardEnter {
          from { opacity: 0; transform: translate3d(0, 28px, 0) scale(0.96); }
          to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        .scripts-grid-item {
          opacity: 0;
          animation: scriptsCardEnter 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      <div className="relative z-10 max-w-[1480px] mx-auto px-6 sm:px-10">
        {/* === HEADER === */}
        <div
          className={`relative mb-8 sm:mb-10 transition-all duration-1200 ${
            isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-10'
          }`}
        >
          {/* Soft white glow tucked behind the title — matches the reference's
              halo. position: absolute keeps it from affecting flow. */}
          <div className="scripts-header-glow" aria-hidden="true" />

          <h1 className="relative text-4xl sm:text-5xl md:text-[3.25rem] font-black tracking-tight leading-[1.05] mb-3">
            <span className="text-zinc-400/80">Browse Our </span>
            <span className="text-white drop-shadow-[0_0_36px_rgba(255,255,255,0.22)]">
              {brand === 'oxlyn' ? 'Scripts' : 'Vanguard Scripts'}
            </span>
          </h1>

          <p className="relative text-sm sm:text-base text-gray-500 max-w-2xl font-light leading-relaxed">
            {packages.length === 0
              ? "We're cooking up the best scripts just for you — greatness is on the way."
              : brand === 'oxlyn'
                ? <>Premium <b className="text-white">FiveM</b> scripts for <b className="text-white">QBCore</b>, <b className="text-white">ESX</b> & <b className="text-white">QBox</b> — instant delivery, lifetime updates, and trusted by thousands of servers worldwide.</>
                : <>The legacy <b className="text-white">Vanguard</b> catalogue from our old Tebex store — every script is available in both <b className="text-white">Escrow</b> and <b className="text-white">Unlocked</b> (open-source) variants.</>
            }
          </p>
        </div>

        {packages.length > 0 && (
          <>
            {/* === BRAND SWITCHER — two distinct cards. Both use their
                actual brand mark (OXLYN logo / Vanguard logo) so the
                switch reads as a brand selection, not a category filter.
                Each card has its own check-badge that springs in on
                selection. */}
            <div className="brand-switcher" role="tablist" aria-label="Choose script brand">
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
                  <span className="brand-card-title">Oxlyn Scripts</span>
                  <span className="brand-card-sub">
                    <span>In active development</span>
                    <span className="brand-card-sub-dot" aria-hidden="true" />
                    <span>Lifetime updates</span>
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
                  <span className="brand-card-title">Vanguard Scripts</span>
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

            {/* Notice + promo coupon — only on the Vanguard tab. Sits
                between the brand switcher and the search bar so it's the
                first thing users read after picking the legacy catalogue. */}
            {brand === 'vanguard' && <VanguardNotice kind="scripts" />}

            {/* === SEARCH === */}
            <div className="mb-5 sm:mb-6 max-w-2xl">
              <div className="scripts-search">
                <Search size={16} className="scripts-search-icon" strokeWidth={2.2} />
                <input
                  type="text"
                  placeholder={brand === 'oxlyn' ? 'Search for products...' : 'Search Vanguard scripts...'}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="scripts-search-input"
                />
              </div>
            </div>

            {/* === CATEGORY PILLS — only on the Oxlyn tab; Vanguard catalogue
                doesn't subdivide into admin categories === */}
            {brand === 'oxlyn' && (
              <div className="flex flex-wrap gap-2.5 mb-8 sm:mb-10">
                <CategoryPill active={filter === 'all'} onClick={() => setFilter('all')}>
                  All Scripts
                </CategoryPill>
                {visibleCustomCategories.map((cat) => {
                  const key: ScriptsFilter = `cat:${cat.id}`;
                  const count = categoryCounts.get(cat.id) || 0;
                  return (
                    <CategoryPill
                      key={cat.id}
                      active={filter === key}
                      onClick={() => setFilter(key)}
                      badge={count > 0 ? String(count) : undefined}
                    >
                      {cat.name}
                    </CategoryPill>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* === GRID === */}
        {filteredPackages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {filteredPackages.map((pkg, index) => (
              <div
                key={pkg.id}
                className="scripts-grid-item h-full"
                // Cap stagger at 6 cards (~240ms total). The previous fan-out
                // kept cards animating for >1s on long catalogs and added
                // perceived heaviness without payoff — the eye only catches
                // the first row of stagger anyway.
                style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
              >
                <PackageCard
                  package={pkg}
                  onClick={openPackageDetails}
                  isLoaded={isLoaded}
                  delay={0}
                  priority={index < 6}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            onResetFilter={() => { setFilter('all'); setQuery(''); }}
            hasFilter={filter !== 'all' || query.length > 0}
          />
        )}
      </div>
    </section>
  );
};

const CategoryPill: React.FC<{
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  badge?: string;
}> = ({ children, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`category-pill ${active ? 'is-active' : ''}`}
  >
    <span>{children}</span>
    {badge && <span className="category-pill-badge">{badge}</span>}
  </button>
);

const EmptyState: React.FC<{ onResetFilter: () => void; hasFilter: boolean }> = ({
  onResetFilter,
  hasFilter,
}) => (
  <div className="flex flex-col items-center justify-center py-16 sm:py-24">
    <div className="relative mb-6">
      <div className="absolute inset-0 bg-red-500/15 blur-3xl rounded-full" />
      <div className="relative glass-luxury p-8 rounded-3xl">
        <Code2 className="w-14 h-14 text-red-300/80" />
      </div>
    </div>
    <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 text-center">
      {hasFilter ? 'No matches' : 'Coming soon'}
    </h3>
    <p className="text-sm text-gray-400 mb-6 max-w-md text-center font-light">
      {hasFilter
        ? "Try clearing your filters or searching for something else."
        : 'New premium scripts are landing soon. Check back shortly.'}
    </p>
    {hasFilter && (
      <button
        onClick={onResetFilter}
        className="cta-luxury inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-2xl text-sm"
      >
        <span>Clear filters</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    )}
  </div>
);

export default ScriptsPage;

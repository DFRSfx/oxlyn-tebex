import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft, ChevronRight, ShoppingCart, Check,
  Shield, ZoomIn, X, Package as PackageIcon, Puzzle, Crown,
  ArrowLeft, ChevronDown, ArrowUpRight, BookOpen, GitBranch, AlignLeft,
  Sparkles,
} from 'lucide-react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Package } from '../types';
import { useTebex } from '../context/TebexContext';
import { useCurrency } from '../context/CurrencyContext';
import { API_URL } from '../config/api';
import { useAnalytics } from '../hooks/useAnalytics';
import { useSEO } from '../hooks/useSEO';
import { isBundle, findSubscriptionPackage, isVanguard, VANGUARD_DOCS_URL, OXLYN_DOCS_URL } from '../utils/isBundle';
import { vanguardBaseName, vanguardDisplayName } from '../utils/packageDedupe';
import { findVanguardUpgrade } from '../utils/vanguardCrossSell';
import { bundlesService, BundleResourceEntry } from '../services/bundlesService';
import OptimizedImage from '../components/OptimizedImage';
import RecentPaymentsSection from '../components/RecentPaymentsSection';
import CustomerReviewsSection from '../components/CustomerReviewsSection';
import LivePreview from '../components/LivePreview';
import { getLivePreview } from '../components/livePreviews';

interface PackageDetailsPageProps {
  packages: Package[];
  isLoadingPackages?: boolean;
}

const PackageDetailsPage: React.FC<PackageDetailsPageProps> = ({ packages, isLoadingPackages }) => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, addToCart, isInCart, openLoginModal } = useTebex();
  const { format: formatEUR } = useCurrency();
  const { trackPackageView } = useAnalytics();
  const [isAdding, setIsAdding] = useState(false);
  const [currentProductImageIndex, setCurrentProductImageIndex] = useState(0);

  const statePackage: Package | undefined = location.state?.package;
  const selectedPackage: Package | undefined =
    packages.find(pkg => {
      if (statePackage?.tebexPackageId) {
        return pkg.tebexPackageId === statePackage.tebexPackageId;
      }
      const slug = pkg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return slug === productSlug;
    }) ||
    packages.find(pkg => {
      const slug = pkg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return slug === productSlug;
    }) ||
    statePackage;

  // Brand-aware naming. We split the concerns:
  //   • `matchKey`  — used only to group escrow/unlocked variants of the
  //     same product. Vanguard needs the aggressive `vanguardBaseName`
  //     because the SKU names are inconsistent ("Advanced Wallet System"
  //     escrow vs "Wallet System [UNLOCKED]").
  //   • `getDisplayName` — used everywhere the user reads the name.
  //     Vanguard uses `vanguardDisplayName` which keeps the casing + the
  //     "Advanced" brand prefix and only hides the `[UNLOCKED]` SKU
  //     marker. Oxlyn keeps its parenthesised-suffix strip.
  const pkgIsVanguard = selectedPackage ? isVanguard(selectedPackage) : false;
  const oxlynStripVariants = (name: string) =>
    name
      .replace(/\s*\(OPEN-SOURCE\)/gi, '')
      .replace(/\s*\(ESCROWED\)/gi, '')
      .replace(/\s*\(Open Source\)/gi, '')
      .replace(/\s*\(Escrow\)/gi, '')
      .trim();
  const matchKey = (name: string) =>
    pkgIsVanguard ? vanguardBaseName(name) : oxlynStripVariants(name);
  const getBaseName = (name: string) =>
    pkgIsVanguard ? vanguardDisplayName(name) : oxlynStripVariants(name);

  const packageVariants = selectedPackage
    ? packages.filter(pkg => {
        // Variants must belong to the same brand — otherwise an Oxlyn
        // package with the same base word as a Vanguard one would leak
        // across the picker.
        if (isVanguard(pkg) !== pkgIsVanguard) return false;
        return matchKey(pkg.name) === matchKey(selectedPackage.name);
      })
    : [];

  // For Vanguard, the "unlocked" build plays the role of the open-source
  // variant — same UX (Add to Cart routes to the open-source SKU).
  const openSourceVersion = pkgIsVanguard
    ? packageVariants.find(pkg => /\[\s*unlocked\s*\]/i.test(pkg.name))
    : packageVariants.find(
        pkg => pkg.name.toLowerCase().includes('open-source') ||
               pkg.name.toLowerCase().includes('opensource') ||
               pkg.name.toLowerCase().includes('open source')
      );

  // If this Vanguard package has a known OXLYN successor (e.g. Backpack V2
  // → Backpack V3, OBD Tablet → ECU Tuning, Crutch System), surface a
  // CTA pointing at the OXLYN version. Logic lives in `vanguardCrossSell`
  // so the mapping table stays out of the render code.
  const vanguardUpgrade = pkgIsVanguard
    ? findVanguardUpgrade(selectedPackage, packages)
    : null;

  // For Vanguard the escrow variant is everything that isn't tagged
  // [UNLOCKED]. For Oxlyn we keep the original heuristic.
  const escrowVersion = pkgIsVanguard
    ? packageVariants.find(pkg => !/\[\s*unlocked\s*\]/i.test(pkg.name))
    : packageVariants.find(
        pkg => (pkg.name.toLowerCase().includes('escrow') ||
                pkg.name.toLowerCase().includes('escrowed')) &&
               !pkg.name.toLowerCase().includes('open')
      ) || packageVariants.find(pkg => pkg !== openSourceVersion);

  const [selectedVersion, setSelectedVersion] = useState<Package | undefined>(selectedPackage);

  // Per-product SEO + Product JSON-LD for rich Google results
  const seoTitle = selectedPackage
    ? `${getBaseName(selectedPackage.name)} — FiveM Script`
    : 'FiveM Script';
  const seoDescription = selectedPackage
    ? `${getBaseName(selectedPackage.name)} for FiveM. ${selectedPackage.description?.slice(0, 140) || 'Premium script optimized for QBCore, ESX & QBox servers.'}`
    : 'Premium FiveM script optimized for QBCore, ESX, and QBox servers.';
  const productSlugForCanonical = selectedPackage
    ? selectedPackage.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : (productSlug || '');
  const productJsonLd = selectedPackage
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: getBaseName(selectedPackage.name),
        description: selectedPackage.description || '',
        image: selectedPackage.image,
        sku: String(selectedPackage.tebexPackageId ?? selectedPackage.id),
        brand: { '@type': 'Brand', name: 'OXLYN Software' },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'EUR',
          price: selectedPackage.price.toFixed(2),
          availability: 'https://schema.org/InStock',
          url: `https://oxlynsoftware.com/product/${productSlugForCanonical}`,
          seller: { '@type': 'Organization', name: 'OXLYN Software' },
        },
      }
    : undefined;
  useSEO({
    title: seoTitle,
    description: seoDescription,
    canonical: `/product/${productSlugForCanonical}`,
    image: selectedPackage?.image,
    type: 'product',
    jsonLd: productJsonLd,
  });

  useEffect(() => {
    if (selectedPackage && packageVariants.length > 0) {
      const packageInVariants = packageVariants.find(
        v => v.tebexPackageId === selectedPackage.tebexPackageId
      );

      if (packageInVariants) {
        setSelectedVersion(packageInVariants);
      } else {
        const cheapest = packageVariants.reduce((min, current) =>
          current.price < min.price ? current : min
        );
        setSelectedVersion(cheapest);
      }
    }
  }, [selectedPackage, packageVariants.length]);

  useEffect(() => {
    if (!selectedPackage?.name) return;
    let active = true;
    const timer = setTimeout(() => {
      if (active) trackPackageView(selectedPackage.name);
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedPackage?.name, trackPackageView]);

  const fromScripts = location.state?.fromScripts || false;
  const baseName = selectedPackage ? getBaseName(selectedPackage.name) : '';

  // Interactive, browser-playable "Live Preview" of the product's in-game UI.
  // Resolved from the registry in `livePreviews.tsx`, gated to the standalone
  // OXLYN SKUs (Vanguard variants + bundles excluded there).
  const livePreview = getLivePreview(selectedPackage?.name, {
    isVanguard: pkgIsVanguard,
    isBundle: isBundle(selectedPackage),
  });

  const packageIsBundle = isBundle(selectedPackage);
  const [bundleContents, setBundleContents] = useState<BundleResourceEntry[]>([]);
  const [bundleLoading, setBundleLoading] = useState(false);

  useEffect(() => {
    if (!packageIsBundle || !selectedPackage?.tebexPackageId) {
      setBundleContents([]);
      return;
    }
    let cancelled = false;
    setBundleLoading(true);
    bundlesService
      .fetchForBundle(selectedPackage.tebexPackageId)
      .then((entries) => {
        if (!cancelled) setBundleContents(entries);
      })
      .finally(() => {
        if (!cancelled) setBundleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [packageIsBundle, selectedPackage?.tebexPackageId]);

  // Resolve each bundle content entry to the full Package (if still available
  // in the catalog) so we can show its image and link to its details page.
  const bundleResourcePackages = bundleContents.map((entry) => {
    const pkg = packages.find((p) => p.tebexPackageId === entry.resourceTebexId);
    return { entry, pkg };
  });

  useEffect(() => {
    if (!selectedPackage?.name) return;

    const controller = new AbortController();

    fetch(`${API_URL}/orders/stats/record-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ packageName: selectedPackage.name }),
      signal: controller.signal,
    }).catch(error => {
      if (error.name !== 'AbortError') {
        console.error(`❌ [STATS] Failed to record package view:`, error);
      }
    });

    return () => {
      controller.abort();
    };
  }, [selectedPackage?.name]);

  if (!selectedPackage || !selectedVersion) {
    // Packages still streaming in from Tebex — show a lightweight skeleton
    // instead of redirecting, otherwise direct links / refreshes on a product
    // URL would bounce the user back home before the catalog finishes loading.
    if (isLoadingPackages || packages.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center text-zinc-500 text-sm">
          Loading product…
        </div>
      );
    }
    navigate('/');
    return null;
  }

  const [inCart, setInCart] = useState(false);

  useEffect(() => {
    if (selectedVersion?.tebexPackageId) {
      setInCart(isInCart(selectedVersion.tebexPackageId));
    }
  }, [selectedVersion?.tebexPackageId, isInCart]);

  const mediaItems = selectedPackage.media ?? selectedPackage.images?.map(url => ({ type: 'image', name: '', url })) ?? [];

  const [isFading, setIsFading] = useState(false);

  const changeImage = (newIndex: number) => {
    if (newIndex === currentProductImageIndex) return;
    setIsFading(true);
    setTimeout(() => {
      setCurrentProductImageIndex(newIndex);
      setIsFading(false);
    }, 200);
  };

  const nextProductImage = () => {
    if (mediaItems.length > 1) {
      changeImage((currentProductImageIndex + 1) % mediaItems.length);
    }
  };

  const prevProductImage = () => {
    if (mediaItems.length > 1) {
      changeImage((currentProductImageIndex - 1 + mediaItems.length) % mediaItems.length);
    }
  };

  // ===== Lightbox state =====
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Close on Escape, navigate with arrows, lock body scroll while open
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowRight') {
        if (mediaItems.length > 1) {
          changeImage((currentProductImageIndex + 1) % mediaItems.length);
        }
      } else if (e.key === 'ArrowLeft') {
        if (mediaItems.length > 1) {
          changeImage((currentProductImageIndex - 1 + mediaItems.length) % mediaItems.length);
        }
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, currentProductImageIndex, mediaItems.length]);

  // Monthly subscription SKU surfaced as a third "version" option below the
  // Escrow / Open Source choices. When the user picks it, the Add to Cart
  // button switches to subscription mode and routes them to /cart after the
  // sub package is added. Vanguard packages opt out — the legacy catalogue
  // isn't included in the OXLYN All-Access subscription.
  const monthlySubscription = pkgIsVanguard
    ? undefined
    : findSubscriptionPackage('monthly', packages);
  const isSubscriptionSelected =
    !!monthlySubscription &&
    selectedVersion?.tebexPackageId === monthlySubscription.tebexPackageId;

  // Unified add-to-cart handler used by the big white CTA above.
  const handleAddToCart = async () => {
    if (!isLoggedIn) { openLoginModal(); return; }
    if (inCart || !selectedVersion?.tebexPackageId) return;
    setIsAdding(true);
    const ok = await addToCart({
      id: selectedVersion.tebexPackageId,
      name: selectedVersion.name,
      price: selectedVersion.price,
      currency: 'EUR',
      image: selectedVersion.image,
      qty: 1,
      category: selectedVersion.category,
    });
    setIsAdding(false);
    if (ok && isSubscriptionSelected) navigate('/cart');
  };

  // List of variants this product ships with — used both for the "Package
  // Type" subtitle and the picker inside that section. Vanguard labels the
  // open-source variant as "Unlocked" since that's how the SKUs ship.
  const openSourceLabel = pkgIsVanguard ? 'Unlocked' : 'Open Source';
  const openSourceSubLabel = pkgIsVanguard
    ? 'Full code · no escrow'
    : 'Full code · edit anything';
  const variantSummary = [
    escrowVersion && 'Escrow',
    openSourceVersion && openSourceLabel,
    monthlySubscription && 'Subscription',
  ].filter(Boolean).join(', ');

  const discountPct = selectedVersion.originalPrice > selectedVersion.price && selectedVersion.price > 0
    ? Math.round(((selectedVersion.originalPrice - selectedVersion.price) / selectedVersion.originalPrice) * 100)
    : 0;
  const isFree = selectedVersion.price === 0;

  // Brand-specific docs root. Vanguard scripts have their own docs domain
  // (different stack from the OXLYN catalogue), so the "Documentation"
  // row in the right column has to swap when viewing a Vanguard package.
  const docsBase = pkgIsVanguard ? VANGUARD_DOCS_URL : OXLYN_DOCS_URL;
  const docsUrl = `${docsBase}${productSlugForCanonical || ''}`;

  return (
    <div className="min-h-screen text-zinc-100 relative z-10 font-sans selection:bg-primary-orange/30">
      {/* No local background — global .page-gradient + grid-overlay + noise-overlay
          (set in App.tsx) flow through unchanged */}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20 relative z-10">

        {/* Back button — matches the reference design's "← Back to Products" */}
        <button
          onClick={() => navigate(fromScripts ? '/scripts' : -1)}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-6 sm:mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to <b className="text-white">Products</b></span>
        </button>

        <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12">
          
          {/* LEFT COLUMN — Media gallery. Title/price/CTA/sections live in
              the right column to match the reference design's text-led
              right side over the media-led left side. */}
          <div className="lg:col-span-7 space-y-5 min-w-0">
            {/* Main Media Player */}
            <div className="rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/50 group relative">
              <div className="aspect-video relative">
                <OptimizedImage
                  src={mediaItems[currentProductImageIndex]?.url ?? selectedPackage.image}
                  alt={selectedPackage.name}
                  width={1100}
                  quality={75}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setIsLightboxOpen(true)}
                />

                {/* Expand button — appears on hover */}
                <button
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-black/85 hover:bg-black/95 border border-white/10 hover:border-white/30 rounded-lg text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105"
                  aria-label="Expand image"
                  title="Click to expand"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Expand</span>
                </button>

                <div className={`absolute inset-0 bg-black pointer-events-none transition-opacity duration-200 ${isFading ? 'opacity-100' : 'opacity-0'}`} />

                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

                {mediaItems.length > 1 && (
                  <>
                    <button
                      onClick={prevProductImage}
                      className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-black/75 border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                      onClick={nextProductImage}
                      className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-black/75 border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Thumbnails — wrap to the next row instead of horizontal scroll
                so all images stay visible without a scrollbar. */}
            {mediaItems.length > 1 && (
              <div className="flex flex-wrap gap-2 sm:gap-3 py-1">
                {mediaItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => changeImage(index)}
                    className={`relative aspect-video rounded-lg border-2 transition-all duration-300 flex-shrink-0 w-20 sm:w-24 lg:w-28 ${
                      index === currentProductImageIndex
                        ? 'border-white opacity-100'
                        : 'border-white/10 opacity-55 hover:opacity-100 hover:border-white/30'
                    }`}
                  >
                    <OptimizedImage src={item.url} alt="" width={144} className="w-full h-full object-cover rounded-md" />
                  </button>
                ))}
              </div>
            )}

            {/* Bundle Contents — shown only when the package is a bundle.
                Replaces Key Features with a modern grid of the resources
                this bundle combines, configurable per-bundle from the admin. */}
            {packageIsBundle && (
              <div className="relative bg-gradient-to-br from-primary-orange/10 via-zinc-900/40 to-zinc-900/30 border border-primary-orange/20 rounded-xl p-4 sm:p-6 md:p-8 overflow-hidden">
                <div className="absolute -top-20 -right-20 w-56 h-56 bg-primary-orange/20 blur-3xl rounded-full pointer-events-none" />
                <div className="absolute -bottom-24 -left-16 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-primary-orange/20 border border-primary-orange/40 text-[10px] font-black tracking-[0.2em] text-primary-orange uppercase">
                      Bundle
                    </span>
                    <span className="text-xs text-zinc-500">
                      {bundleResourcePackages.length > 0
                        ? `${bundleResourcePackages.length} resource${bundleResourcePackages.length === 1 ? '' : 's'} combined`
                        : 'Multi-resource package'}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mb-1 flex items-center gap-2">
                    <PackageIcon className="w-5 h-5 text-primary-orange" />
                    What's inside
                  </h3>
                  <p className="text-sm text-zinc-400 mb-6">
                    This bundle combines the following premium resources into a single purchase.
                  </p>

                  {bundleLoading ? (
                    <div className="h-28 flex items-center justify-center text-zinc-500 text-sm">
                      Loading bundle contents…
                    </div>
                  ) : bundleResourcePackages.length === 0 ? (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-zinc-900/60 border border-dashed border-zinc-700 text-sm text-zinc-400">
                      <Puzzle className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                      <span>Bundle contents will be announced soon. Stay tuned!</span>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                      {bundleResourcePackages.map(({ entry, pkg }, i) => {
                        const displayName = pkg
                          ? getBaseName(pkg.name)
                          : entry.resourceName || `Resource #${entry.resourceTebexId}`;
                        const slug = pkg
                          ? pkg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                          : null;
                        const onClick = () => {
                          if (pkg && slug) {
                            navigate(`/product/${slug}`, { state: { package: pkg } });
                          }
                        };
                        return (
                          <div
                            key={entry.id}
                            onClick={onClick}
                            className={`group relative flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-primary-orange/50 transition-all ${
                              pkg ? 'cursor-pointer hover:bg-zinc-900' : ''
                            }`}
                          >
                            <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-black border border-zinc-800 flex items-center justify-center">
                              {pkg?.image ? (
                                <OptimizedImage src={pkg.image} alt={displayName} width={64} className="w-full h-full object-cover" />
                              ) : (
                                <Puzzle className="w-6 h-6 text-zinc-600" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-bold text-primary-orange uppercase tracking-wider">
                                  #{i + 1}
                                </span>
                                {pkg && (
                                  <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                    View →
                                  </span>
                                )}
                              </div>
                              <div className="text-sm sm:text-base font-bold text-white truncate">
                                {displayName}
                              </div>
                              {pkg?.description && (
                                <div className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">
                                  {pkg.description}
                                </div>
                              )}
                            </div>
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-orange/10 border border-primary-orange/30 flex items-center justify-center">
                              <Check className="w-4 h-4 text-primary-orange" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
           
          </div>

          {/* RIGHT COLUMN — Title, price, CTA, collapsible sections */}
          <div className="lg:col-span-5 space-y-5 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-[2.05rem] font-black text-white tracking-tight leading-[1.15] break-words">
              {baseName}
            </h1>

            {!packageIsBundle && (
              <div className="flex flex-wrap gap-2">
                {(pkgIsVanguard
                  ? [
                      { src: '/esx.png',    label: 'ESX' },
                      { src: '/qbcore.png', label: 'QBCore' },
                    ]
                  : [
                      { src: '/esx.png',    label: 'ESX' },
                      { src: '/qbcore.png', label: 'QBCore' },
                      { src: '/qbox.png',   label: 'QBox' },
                    ]
                ).map((fw) => (
                  <span key={fw.label} className="framework-badge">
                    <img src={fw.src} alt="" loading="lazy" decoding="async" width={16} height={16} className="framework-badge-icon" />
                    <span>{fw.label}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Price row — current price + crossed-out + discount badge */}
            <div className="flex items-baseline gap-2.5 flex-wrap pt-1">
              <span className="text-3xl sm:text-[2.3rem] font-black text-white tabular-nums leading-none">
                {isFree ? 'Free' : formatEUR(selectedVersion.price)}
              </span>
              {discountPct > 0 && !isFree && (
                <>
                  <span className="text-zinc-500 text-base line-through tabular-nums">
                    {formatEUR(selectedVersion.originalPrice)}
                  </span>
                  <span className="px-2 py-1 rounded-md bg-red-600 text-white text-[13px] font-bold tracking-wide leading-none">
                    -{discountPct}%
                  </span>
                </>
              )}
            </div>

            {/* Vanguard → OXLYN upgrade CTA. Only renders when the
                current Vanguard SKU has a mapped OXLYN successor
                (Backpack V2 → V3, OBD Tablet → ECU Tuning, etc.). The
                button jumps straight to the OXLYN package's details
                page using the same slug route the catalogue uses. */}
            {vanguardUpgrade && (
              <button
                type="button"
                onClick={() => {
                  const slug = vanguardUpgrade.upgrade.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');
                  navigate(`/product/${slug}`, {
                    state: { package: vanguardUpgrade.upgrade },
                  });
                }}
                className="vanguard-upgrade-cta"
                aria-label={`${vanguardUpgrade.ctaLabel} — open ${vanguardUpgrade.upgrade.name}`}
              >
                <span className="vanguard-upgrade-cta-icon" aria-hidden="true">
                  <Sparkles size={16} strokeWidth={2.4} />
                </span>
                <span className="vanguard-upgrade-cta-text">
                  <span className="vanguard-upgrade-cta-label">{vanguardUpgrade.ctaLabel}</span>
                  {vanguardUpgrade.ctaSubLabel && (
                    <span className="vanguard-upgrade-cta-sub">{vanguardUpgrade.ctaSubLabel}</span>
                  )}
                </span>
                <span className="vanguard-upgrade-cta-action">
                  Click here <ArrowUpRight size={14} strokeWidth={2.5} />
                </span>
              </button>
            )}

            {/* Add to Cart — primary CTA at the top of the right column */}
            <button
              onClick={handleAddToCart}
              disabled={inCart || isAdding}
              className={`w-full h-12 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                inCart
                  ? 'bg-zinc-800 text-zinc-300'
                  : isSubscriptionSelected
                    ? 'bg-gradient-to-r from-red-500 to-red-700 text-white shadow-[0_8px_22px_-6px_rgba(220,60,60,0.55)]'
                    : 'bg-white text-black hover:bg-zinc-100'
              }`}
            >
              {inCart ? (
                <><Check className="w-4 h-4" /> In Cart</>
              ) : isAdding ? (
                <><ShoppingCart className="w-4 h-4 animate-bounce" /> Processing…</>
              ) : isSubscriptionSelected ? (
                <><Crown className="w-4 h-4" /> Subscribe — {formatEUR(monthlySubscription?.price ?? 0)}/mo</>
              ) : (
                <>Add to Cart</>
              )}
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] text-zinc-400">
              <span className="flex items-center gap-2">
                <BarChart3Tiny />
                Lifetime updates · zero subscription
              </span>
              <span className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-zinc-500" />
                Instant delivery via Cfx Keymaster
              </span>
            </div>

            {/* Collapsible sections — Documentation is a link-style row,
                Package Type / Description expand inline. */}
            <div className="space-y-2 pt-2">
              <PDLink
                icon={BookOpen}
                label="Documentation"
                onClick={() => window.open(docsUrl, '_blank')}
              />
              <PDAccordion icon={GitBranch} label="Package Type" sublabel={variantSummary} defaultOpen>
                <div className="space-y-2.5 pt-3">
                  {escrowVersion && (
                    <VariantPick
                      label="Escrow"
                      sublabel="Protected · Cfx escrow"
                      price={escrowVersion.price}
                      selected={selectedVersion?.tebexPackageId === escrowVersion.tebexPackageId}
                      onSelect={() => setSelectedVersion(escrowVersion)}
                    />
                  )}
                  {openSourceVersion && (
                    <VariantPick
                      label={openSourceLabel}
                      sublabel={openSourceSubLabel}
                      price={openSourceVersion.price}
                      selected={selectedVersion?.tebexPackageId === openSourceVersion.tebexPackageId}
                      onSelect={() => setSelectedVersion(openSourceVersion)}
                    />
                  )}
                  {monthlySubscription && (
                    <VariantPick
                      label="Subscription"
                      sublabel="Access to all scripts · cancel anytime"
                      price={monthlySubscription.price}
                      priceSuffix="/ mo"
                      accent
                      selected={selectedVersion?.tebexPackageId === monthlySubscription.tebexPackageId}
                      onSelect={() => setSelectedVersion(monthlySubscription)}
                    />
                  )}
                </div>
              </PDAccordion>

              <PDAccordion icon={AlignLeft} label="Description">
                <div className="pt-3 text-sm text-zinc-400 leading-relaxed break-words">
                  {selectedPackage.fullDescription || selectedPackage.description ||
                    'Enhance your server with this premium resource. Featuring high performance, easy configuration, and professional support.'}
                </div>
              </PDAccordion>
            </div>
          </div>
        </div>

        {/* Live Preview — interactive, browser-playable replica of the
            product's in-game UI. Sits below the gallery, above Recent
            Payments. Only rendered for products that ship a demo. */}
        {livePreview && <LivePreview config={livePreview} />}

        {/* Recent purchases + reviews — global content, identical for every
            visitor; the timestamps in Recent Payments adapt to the viewer's
            local clock client-side. */}
        <RecentPaymentsSection />
        <CustomerReviewsSection />
      </div>

      {/* ============================================================ */}
      {/* LIGHTBOX — rendered via Portal directly into <body>           */}
      {/* This escapes any parent stacking-context / overflow issues.   */}
      {/* ============================================================ */}
      {isLightboxOpen && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setIsLightboxOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'lightboxFadeIn 0.25s ease-out',
          }}
        >
          {/* Inline animation keyframes */}
          <style>{`
            @keyframes lightboxFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes lightboxImageZoom {
              from { opacity: 0; transform: scale(0.92); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(false);
            }}
            style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10 }}
            className="w-12 h-12 bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
            aria-label="Close lightbox"
            title="Close (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Image counter */}
          {mediaItems.length > 1 && (
            <div
              style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10 }}
              className="px-4 py-2 bg-white/10 border border-white/10 rounded-full text-white text-sm font-medium"
            >
              {currentProductImageIndex + 1} <span className="text-white/40">/</span> {mediaItems.length}
            </div>
          )}

          {/* Prev button */}
          {mediaItems.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevProductImage();
              }}
              style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
              className="w-14 h-14 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}

          {/* IMAGE — using inline styles to bypass any tailwind/CSS conflicts.
              Lightbox uses a high width (1920px) for zoom detail; still much
              smaller than serving the raw upstream original. */}
          <OptimizedImage
            src={mediaItems[currentProductImageIndex]?.url ?? selectedPackage.image}
            alt={selectedPackage.name}
            width={1920}
            quality={85}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.95)',
              cursor: 'default',
              animation: 'lightboxImageZoom 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
              display: 'block',
            }}
          />

          {/* Next button */}
          {mediaItems.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextProductImage();
              }}
              style={{ position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
              className="w-14 h-14 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
              aria-label="Next image"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          )}

          {/* Hint */}
          <div
            style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
            className="px-4 py-2 bg-white/10 border border-white/10 rounded-full text-white/60 text-xs font-medium"
          >
            Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">Esc</kbd> to close
            {mediaItems.length > 1 && (
              <> · <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">←</kbd> <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">→</kbd> to navigate</>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ============================================================
// Right-column section helpers
// ============================================================

// Link-style row (Preview, Documentation) — opens external or triggers an
// action; signaled by the up-right arrow on the trailing side.
const PDLink: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
}> = ({ icon: Icon, label, onClick }) => (
  <button onClick={onClick} className="pd-section pd-section-link">
    <Icon className="pd-section-icon" />
    <span className="pd-section-label">{label}</span>
    <ArrowUpRight className="pd-section-arrow" />
  </button>
);

// Expandable accordion (Package Type, Description). Body slides in below
// when toggled open. Optional sublabel shows next to the title as a hint
// of what's inside (e.g. "Escrow, Open Source").
const PDAccordion: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  sublabel?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ icon: Icon, label, sublabel, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`pd-section pd-section-accordion ${open ? 'is-open' : ''}`}>
      <button onClick={() => setOpen((o) => !o)} className="pd-section-row">
        <Icon className="pd-section-icon" />
        <span className="pd-section-label">
          {label}
          {sublabel && <span className="pd-section-sublabel"> | {sublabel}</span>}
        </span>
        <ChevronDown className={`pd-section-chevron ${open ? 'is-open' : ''}`} />
      </button>
      {open && <div className="pd-section-body">{children}</div>}
    </div>
  );
};

// Single variant choice inside the Package Type accordion — clean radio-style
// card with subtle accent for the Subscription option.
const VariantPick: React.FC<{
  label: string;
  sublabel: string;
  price: number;
  priceSuffix?: string;
  selected: boolean;
  accent?: boolean;
  onSelect: () => void;
}> = ({ label, sublabel, price, priceSuffix, selected, accent = false, onSelect }) => {
  const { format: formatPrice } = useCurrency();
  return (
    <button
      onClick={onSelect}
      className={`pd-variant ${selected ? 'is-selected' : ''} ${accent ? 'is-accent' : ''}`}
      aria-pressed={selected}
    >
      <span className="pd-variant-radio">
        {selected && <span className="pd-variant-radio-dot" />}
      </span>
      <span className="pd-variant-text">
        <span className="pd-variant-label">{label}</span>
        <span className="pd-variant-sublabel">{sublabel}</span>
      </span>
      <span className="pd-variant-price">
        {price === 0 ? 'Free' : formatPrice(price)}
        {priceSuffix && <span className="pd-variant-price-suffix"> {priceSuffix}</span>}
      </span>
    </button>
  );
};

// Tiny inline chart glyph used in the trust pills row. Lucide's BarChart3 was
// removed from imports here so we inline a minimal version to keep the
// dependency surface small.
const BarChart3Tiny: React.FC = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500" aria-hidden="true">
    <path d="M3 3v18h18" />
    <path d="M7 16V8" />
    <path d="M11 16V5" />
    <path d="M15 16v-6" />
    <path d="M19 16v-3" />
  </svg>
);

export default PackageDetailsPage;
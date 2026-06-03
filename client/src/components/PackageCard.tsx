import React, { useState } from 'react';
import { Check, Flame, Sparkles, Star, Tag as TagIcon, Zap, Package as PackageIcon } from 'lucide-react';
import { Package } from '../types';
import { useTebex } from '../context/TebexContext';
import { useCurrency } from '../context/CurrencyContext';
import { API_URL } from '../config/api';
import { useAnalytics } from '../hooks/useAnalytics';
import { usePackageTags } from '../context/PackageTagsContext';
import { findTagForPackage, getTagStyles } from '../services/packageTagsService';
import { isBundle, isSubscriptionPackage, isVanguard } from '../utils/isBundle';
import { basePackageName, vanguardDisplayName } from '../utils/packageDedupe';
import OptimizedImage from './OptimizedImage';

interface PackageCardProps {
  package: Package;
  onClick: (pkg: Package) => void;
  isLoaded: boolean;
  delay: number;
  compact?: boolean;
  /** Cards acima do fold devem usar priority=true para o browser começar a
   *  carregar a imagem imediatamente em vez de esperar pelo IntersectionObserver. */
  priority?: boolean;
}

// Pick an icon based on the tag label so the card stays expressive even when
// the admin changes the wording.
const pickTagIcon = (label: string) => {
  const lower = label.toLowerCase();
  if (/(popular|hot|trend)/.test(lower)) return Flame;
  if (/(new|fresh)/.test(lower)) return Sparkles;
  if (/(release|update|latest|last)/.test(lower)) return Zap;
  if (/(star|featured)/.test(lower)) return Star;
  if (/(bundle|pack|kit)/.test(lower)) return PackageIcon;
  return TagIcon;
};

const FRAMEWORK_LIST: Array<{ src: string; label: string }> = [
  { src: '/esx.png',    label: 'ESX' },
  { src: '/qbcore.png', label: 'QBCore' },
  { src: '/qbox.png',   label: 'QBox' },
];
// Vanguard catalogue predates QBox and was never adapted for it — surface
// only the frameworks the scripts actually support.
const VANGUARD_FRAMEWORK_LIST: Array<{ src: string; label: string }> = [
  { src: '/esx.png',    label: 'ESX' },
  { src: '/qbcore.png', label: 'QBCore' },
];

function FrameworkBadge({ src, label }: { src: string; label: string }) {
  return (
    <span className="framework-badge">
      <img src={src} alt="" loading="lazy" decoding="async" width={16} height={16} className="framework-badge-icon" />
      <span>{label}</span>
    </span>
  );
}

const PackageCard: React.FC<PackageCardProps> = ({ package: pkg, onClick, isLoaded, delay, priority = false }) => {
  const { isLoggedIn, addToCart, isInCart, openLoginModal } = useTebex();
  const { format: formatPrice } = useCurrency();
  const { trackCartAdd, trackEvent } = useAnalytics();
  const [isAdding, setIsAdding] = useState(false);

  const inCart = pkg.tebexPackageId ? isInCart(pkg.tebexPackageId) : false;
  const { tags: allTags } = usePackageTags();
  // Admin-curated package tags ("Popular", "New", "Last Release", …) apply
  // only to the Oxlyn catalogue. Vanguard is a legacy archive — no manual
  // promotion of those packages on the storefront — so tag matching is
  // short-circuited for vanguard cards.
  const matchedTag = isVanguard(pkg) ? null : findTagForPackage(pkg, allTags);
  const TagIconComp = matchedTag ? pickTagIcon(matchedTag.label) : null;
  const tagStyles = matchedTag ? getTagStyles(matchedTag.variant) : null;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    trackCartAdd(pkg.name, pkg.price);

    try {
      await fetch(`${API_URL}/orders/stats/record-cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ packageName: pkg.name }),
      });
    } catch {
      /* analytics — silent fail */
    }

    if (pkg.tebexPackageId) {
      setIsAdding(true);
      await addToCart({
        id: pkg.tebexPackageId,
        name: pkg.name,
        price: pkg.price,
        image: pkg.image,
        qty: 1,
        currency: 'EUR',
        category: pkg.category,
      });
      setIsAdding(false);
    }
  };

  const handleLogin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    trackEvent('cart_add_login_required', {
      packageName: pkg.name,
      eventData: { price: pkg.price },
    });
    trackCartAdd(pkg.name, pkg.price);

    try {
      await fetch(`${API_URL}/orders/stats/record-cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ packageName: pkg.name }),
      });
    } catch {
      /* analytics — silent fail */
    }

    // Gate behind the FiveM login modal instead of jumping straight to the
    // redirect — the visitor sees the "Please log in" sub-interface first.
    openLoginModal();
  };

  const isFree = pkg.price === 0;
  const pkgIsBundle = isBundle(pkg) && !isFree;
  // Bundles always advertise a fixed 40% off tag regardless of the Tebex
  // sale/original price split. The marketing line for the Bundles category
  // is "save 40% vs buying these scripts individually", so the card tag
  // mirrors that headline number for consistency across the catalog,
  // bundles page, and homepage carousels.
  const discount = pkgIsBundle
    ? 40
    : pkg.originalPrice > pkg.price && pkg.price > 0
      ? Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100)
      : 0;
  // When forcing 40% on a bundle, derive an "implied original" from the
  // current price (price / (1 - 0.40)) so the strikethrough reads as a
  // believable pre-discount number rather than the unchanged Tebex value
  // (which would equal pkg.price and look like a printing bug).
  const strikePrice = pkgIsBundle
    ? pkg.price / 0.6
    : pkg.originalPrice;
  // Vanguard packages use a different normaliser — `basePackageName` only
  // knows about the Oxlyn `(Open Source)` / `(Escrow)` parenthesised
  // suffix, while Vanguard uses `[UNLOCKED]` brackets that need stripping
  // for the card title.
  const cleanName = isVanguard(pkg) ? vanguardDisplayName(pkg.name) : basePackageName(pkg.name);
  const isSubscription = isSubscriptionPackage(pkg);

  // Spec: every non-subscription package surfaces ESX / QBCore / QBox badges
  // (with the icons from /public/), regardless of what the Tebex description
  // happened to mention. Subscription SKUs keep their original framework
  // list since they're framework-agnostic in nature. Vanguard catalogue
  // gets the shorter list (no QBox) since those scripts were never adapted
  // to QBox before the catalogue stopped being maintained.
  const frameworksToRender = isSubscription
    ? null
    : isVanguard(pkg)
      ? VANGUARD_FRAMEWORK_LIST
      : FRAMEWORK_LIST;

  return (
    <div className="package-card group rounded-2xl overflow-hidden bg-[#0d0d0d] border border-white/[0.06] relative h-full flex flex-col transition-colors duration-300">
      {/* Image */}
      <div
        onClick={() => onClick(pkg)}
        className="relative w-full overflow-hidden cursor-pointer bg-zinc-900 aspect-[16/9]"
      >
        <OptimizedImage
          src={pkg.image}
          alt={pkg.name}
          width={520}
          quality={75}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* Admin-managed tag (e.g. POPULAR / NEW / LAST RELEASE) */}
        {matchedTag && tagStyles && TagIconComp && (
          <div className="absolute top-3 right-3 z-10">
            <div className="relative">
              <div
                className="absolute inset-0 blur-md rounded-md opacity-70"
                style={{ background: tagStyles.glow }}
              />
              <div
                className="relative inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider text-white"
                style={{
                  background: tagStyles.background,
                  boxShadow: `0 4px 14px ${tagStyles.glow}`,
                }}
              >
                <TagIconComp className="w-3 h-3" strokeWidth={3} />
                <span>{matchedTag.label}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-6 sm:p-7">
        <h3
          onClick={() => onClick(pkg)}
          className="text-white font-bold text-[17px] sm:text-[18px] leading-snug cursor-pointer hover:text-red-300 transition-colors mb-2.5 line-clamp-2"
        >
          {cleanName}
        </h3>

        <p className="text-gray-400 text-[13px] sm:text-[14px] leading-relaxed font-light mb-4 line-clamp-2">
          {pkg.description}
        </p>

        {frameworksToRender && (
          <div className="flex flex-wrap gap-2 mb-5">
            {frameworksToRender.map((fw) => (
              <FrameworkBadge key={fw.label} src={fw.src} label={fw.label} />
            ))}
          </div>
        )}

        {/* Price row — white current, gray strikethrough, red discount badge */}
        <div className="mt-auto flex items-baseline gap-2.5 mb-4 flex-wrap">
          <span className="text-white font-extrabold text-[1.85rem] leading-none tabular-nums">
            {isFree ? 'Free' : formatPrice(pkg.price)}
          </span>
          {discount > 0 && !isFree && (
            <>
              <span className="text-gray-500 text-sm line-through tabular-nums">
                {formatPrice(strikePrice)}
              </span>
              <span className="px-2 py-1 rounded-md bg-red-600 text-white text-[13px] font-bold tracking-wide leading-none">
                -{discount}%
              </span>
            </>
          )}
        </div>

        {/* Add to Basket — full-width. Always adds the Escrow variant since
            deduplicatePackages prefers it; users wanting Open Source click
            the card body to open the product details page. */}
        {pkg.tebexPackageId ? (
          <button
            onClick={isLoggedIn ? handleAddToCart : handleLogin}
            disabled={isAdding || inCart}
            className="w-full h-12 rounded-xl bg-white text-black font-semibold text-[15px] hover:bg-zinc-100 active:bg-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {inCart ? (
              <>
                <Check className="w-4 h-4" /> In Basket
              </>
            ) : isAdding ? (
              <>Adding…</>
            ) : (
              <>Add to Basket</>
            )}
          </button>
        ) : (
          <button
            onClick={() => onClick(pkg)}
            className="w-full h-12 rounded-xl bg-white text-black font-semibold text-[15px] hover:bg-zinc-100 transition-colors inline-flex items-center justify-center gap-2"
          >
            View Package
          </button>
        )}
      </div>
    </div>
  );
};

// React.memo stops re-rendering when parent updates don't actually change
// the package data — e.g. catalog filters that re-key the list, or hover
// hover state somewhere up the tree.
export default React.memo(PackageCard);

import React from 'react';
import { Package } from '../types';
import { isBundle, isSubscriptionPackage, isVanguard } from '../utils/isBundle';
import { basePackageName, vanguardDisplayName } from '../utils/packageDedupe';
import { useCurrency } from '../context/CurrencyContext';
import OptimizedImage from './OptimizedImage';

interface PackageCardLiteProps {
  package: Package;
  onClick: (pkg: Package) => void;
  priority?: boolean;
}

const FRAMEWORK_LIST: Array<{ src: string; label: string }> = [
  { src: '/esx.png',    label: 'ESX' },
  { src: '/qbcore.png', label: 'QBCore' },
  { src: '/qbox.png',   label: 'QBox' },
];
// Vanguard catalogue predates QBox — see comment in PackageCard.tsx.
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

/**
 * Lightweight PackageCard variant for non-interactive surfaces like the
 * Top Scripts marquee on the landing page. The full PackageCard subscribes
 * to three React contexts (Tebex cart, Analytics, PackageTags), which
 * forces every card in the marquee to re-render on every cart action —
 * with the duplicated track that's 2x cards × every render.
 *
 * This stripped variant:
 *   - subscribes to nothing
 *   - has no add-to-cart button (click navigates to the product page,
 *     where the user adds to cart from the full UI)
 *   - keeps the same visual treatment so the marquee reads identically
 *
 * Net effect on Intel-class GPUs: noticeably smoother scroll on the hero
 * because the marquee track no longer triggers reconciliation cascades.
 */
const PackageCardLite: React.FC<PackageCardLiteProps> = ({
  package: pkg,
  onClick,
  priority = false,
}) => {
  const { format: formatPrice } = useCurrency();
  const cleanName = isVanguard(pkg) ? vanguardDisplayName(pkg.name) : basePackageName(pkg.name);
  const isSubscription = isSubscriptionPackage(pkg);
  const isFree = pkg.price === 0;
  const pkgIsBundle = isBundle(pkg) && !isFree;
  // Bundles are always tagged at a fixed 40% off — see the long comment in
  // PackageCard.tsx for the rationale.
  const discount = pkgIsBundle
    ? 40
    : pkg.originalPrice > pkg.price && pkg.price > 0
      ? Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100)
      : 0;
  const strikePrice = pkgIsBundle ? pkg.price / 0.6 : pkg.originalPrice;
  const frameworksToRender = isSubscription
    ? null
    : isVanguard(pkg)
      ? VANGUARD_FRAMEWORK_LIST
      : FRAMEWORK_LIST;

  return (
    <div
      className="package-card group rounded-2xl overflow-hidden bg-[#0d0d0d] border border-white/[0.06] relative h-full flex flex-col transition-colors duration-300 cursor-pointer"
      onClick={() => onClick(pkg)}
    >
      <div className="relative w-full overflow-hidden bg-zinc-900 aspect-[16/9]">
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
      </div>

      <div className="flex-1 flex flex-col p-6 sm:p-7">
        <h3 className="text-white font-bold text-[17px] sm:text-[18px] leading-snug hover:text-red-300 transition-colors mb-2.5 line-clamp-2">
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

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick(pkg);
          }}
          className="w-full h-12 rounded-xl bg-white text-black font-semibold text-[15px] hover:bg-zinc-100 transition-colors inline-flex items-center justify-center gap-2"
        >
          View Package
        </button>
      </div>
    </div>
  );
};

export default React.memo(PackageCardLite);

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Check, Flame } from 'lucide-react';
import { Package } from '../types';
import { useTebex } from '../context/TebexContext';
import { formatCategoryName } from '../utils/helpers';
import { API_URL } from '../config/api';
import { useAnalytics } from '../hooks/useAnalytics';

interface PackageCardProps {
  package: Package;
  onClick: (pkg: Package) => void;
  isLoaded: boolean;
  delay: number;
}

// ===== "POPULAR" badge configuration =====
const POPULAR_PACKAGE_KEYWORDS = [
  'backpack system v3',
];

const isPopularPackage = (pkgName: string): boolean => {
  const lower = pkgName.toLowerCase();
  return POPULAR_PACKAGE_KEYWORDS.some(keyword => lower.includes(keyword));
};

const formatFrameworkLabel = (framework: string): string => {
  const f = framework.toLowerCase().trim();
  if (f === 'qbcore' || f === 'qb-core' || f === 'qb') return 'QBCore';
  if (f === 'esx') return 'ESX';
  if (f === 'qbox' || f === 'qb-box') return 'QBox';
  return framework;
};

const PackageCard: React.FC<PackageCardProps> = ({ package: pkg, onClick, isLoaded, delay }) => {
  const { isLoggedIn, addToCart, isInCart, login } = useTebex();
  const { trackCartAdd, trackEvent } = useAnalytics();
  const [isAdding, setIsAdding] = useState(false);
  const [bgImageIndex, setBgImageIndex] = useState(0);

  const inCart = pkg.tebexPackageId ? isInCart(pkg.tebexPackageId) : false;
  const isPopular = isPopularPackage(pkg.name);

  useEffect(() => {
    if (!pkg.images || pkg.images.length <= 1) return;

    const interval = setInterval(() => {
      setBgImageIndex((prev) => (prev + 1) % pkg.images!.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [pkg.images]);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`📊 [STATS] User clicked "Add to Cart" for package: ${pkg.name}`);

    trackCartAdd(pkg.name, pkg.price);

    try {
      const recordResponse = await fetch(`${API_URL}/orders/stats/record-cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ packageName: pkg.name })
      });
      if (recordResponse.ok) {
        console.log(`✅ [DB] Recorded add to cart in database: ${pkg.name}`);
      } else {
        console.warn(`⚠️ [DB] Failed to record add to cart (HTTP ${recordResponse.status}): ${pkg.name}`);
      }
    } catch (error) {
      console.error(`❌ [DB] Failed to record add to cart:`, error);
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
        category: pkg.category
      });
      setIsAdding(false);
    }
  };

  const handleLogin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`📊 [STATS] User clicked "Add to Cart" but not logged in for package: ${pkg.name}`);

    trackEvent('cart_add_login_required', {
      packageName: pkg.name,
      eventData: { price: pkg.price },
    });
    trackCartAdd(pkg.name, pkg.price);

    try {
      const recordResponse = await fetch(`${API_URL}/orders/stats/record-cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ packageName: pkg.name })
      });
      if (recordResponse.ok) {
        console.log(`✅ [DB] Recorded cart attempt (not logged in) in database: ${pkg.name}`);
      }
    } catch (error) {
      console.error(`❌ [DB] Failed to record cart attempt:`, error);
    }

    login();
  }

  const discount = Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100);
  const backgroundImage = pkg.images && pkg.images.length > 0 ? pkg.images[bgImageIndex] : pkg.image;
  const cleanName = pkg.name
    .replace(/\s*\(OPEN-SOURCE\)/gi, '')
    .replace(/\s*\(ESCROWED\)/gi, '')
    .replace(/\s*\(Open Source\)/gi, '')
    .replace(/\s*\(Escrow\)/gi, '')
    .trim();

  return (
    <div
      className="package-card group rounded-xl sm:rounded-2xl overflow-hidden bg-[#0C0C0C] border border-neutral-700/40 relative h-full flex flex-col hover:border-neutral-600/60 transition-colors duration-300"
    >
      {/* Blurred background image */}
      <div
        className="absolute inset-0 opacity-20 blur-2xl scale-110 transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Image area — slightly shorter on mobile (h-44) for better proportion */}
        <div onClick={() => {
          console.log(`📊 [STATS] User clicked on package card: ${pkg.name}`);
          onClick(pkg);
        }} className="relative h-44 sm:h-52 lg:h-56 w-full overflow-hidden cursor-pointer">
          <img
            src={pkg.image}
            alt={pkg.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />

          {/* POPULAR badge */}
          {isPopular && (
            <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500/60 blur-lg rounded-md animate-pulse" />
                <div
                  className="relative inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(255,149,0,0.5)]"
                  style={{ background: 'linear-gradient(135deg, #FF3B30 0%, #FF9500 100%)' }}
                >
                  <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3" strokeWidth={3} />
                  <span>Popular</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col">
          {/* Title + Price row */}
          <div className="flex justify-between items-start gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h3 onClick={() => {
                console.log(`📊 [STATS] User clicked on package title: ${pkg.name}`);
                onClick(pkg);
              }} className="text-white font-semibold text-sm sm:text-base leading-tight cursor-pointer hover:text-primary-orange transition-colors break-words">
                {cleanName}
              </h3>

              {/* Framework tags below title */}
              {pkg.frameworks && pkg.frameworks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {pkg.frameworks.map((framework) => (
                    <span
                      key={framework}
                      className="inline-flex items-center px-2 py-0.5 text-[9px] sm:text-[10px] font-medium tracking-wide text-neutral-400 bg-white/[0.03] border border-white/10 rounded-md hover:text-neutral-200 hover:border-white/20 transition-colors"
                    >
                      {formatFrameworkLabel(framework)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Price — right column, stays compact */}
            <div className="text-right shrink-0 flex flex-col items-end">
              <div className="text-primary-orange font-bold text-base sm:text-lg whitespace-nowrap">
                {pkg.price === 0 ? 'Free' : `${pkg.price.toFixed(2)}€`}
              </div>
              {discount > 0 && (
                <div className="line-through text-[11px] sm:text-xs whitespace-nowrap" style={{color: '#CD5C5C'}}>
                  €{pkg.originalPrice.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageCard;
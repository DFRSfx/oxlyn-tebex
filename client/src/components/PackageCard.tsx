import React, { useState, useEffect } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { Package } from '../types';
import { useTebex } from '../context/TebexContext';
import { formatCategoryName } from '../utils/helpers';
import { API_URL } from '../config/api';

interface PackageCardProps {
  package: Package;
  onClick: (pkg: Package) => void;
  isLoaded: boolean;
  delay: number;
}

const PackageCard: React.FC<PackageCardProps> = ({ package: pkg, onClick, isLoaded, delay }) => {
  const { isLoggedIn, addToCart, isInCart, login } = useTebex();
  const [isAdding, setIsAdding] = useState(false);
  const [bgImageIndex, setBgImageIndex] = useState(0);

  const inCart = pkg.tebexPackageId ? isInCart(pkg.tebexPackageId) : false;

  // Rotate background images
  useEffect(() => {
    if (!pkg.images || pkg.images.length <= 1) return;

    const interval = setInterval(() => {
      setBgImageIndex((prev) => (prev + 1) % pkg.images!.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [pkg.images]);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`📊 [STATS] User clicked "Add to Cart" for package: ${pkg.name}`);
    
    // Record to database
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
    
    // Record attempted cart action while not logged in
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

  return (
    <div
      className="package-card group rounded-xl overflow-hidden bg-[#0C0C0C] border border-neutral-700/40 relative h-full flex flex-col"
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
        <div onClick={() => {
          console.log(`📊 [STATS] User clicked on package card: ${pkg.name}`);
          onClick(pkg);
        }} className="relative h-48 w-full overflow-hidden cursor-pointer">
          <img
            src={pkg.image}
            alt={pkg.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          {discount > 0 && (
            <div className="absolute top-3 right-3 font-bold px-2 py-1 rounded-md shadow-[0_0_10px_rgba(255,149,0,0.6)]" style={{ background: 'linear-gradient(135deg, #FF3B30 0%, #FF9500 100%)', color: 'white' }}>
              -{discount}%
            </div>
          )}
          {pkg.frameworks && pkg.frameworks.length > 0 && (
            <div className="absolute bottom-3 left-3 flex gap-2">
              {pkg.frameworks.map((framework) => (
                <span
                  key={framework}
                  className="bg-neutral-900/90 text-white px-2 py-0.5 text-[10px] border border-neutral-700 rounded-md backdrop-blur uppercase font-medium"
                >
                  {framework}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 space-y-3 flex-1 flex flex-col">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <h3 onClick={() => {
                console.log(`📊 [STATS] User clicked on package title: ${pkg.name}`);
                onClick(pkg);
              }} className="text-white font-semibold text-base leading-tight cursor-pointer hover:text-primary-orange transition-colors">
                {pkg.name}
              </h3>
              {pkg.category && (
                <span className="inline-block text-xs px-2 py-1 rounded-full bg-neutral-800/60 text-neutral-300 mt-1.5 border border-neutral-700/40">
                  {formatCategoryName(pkg.category.name)}
                </span>
              )}
            </div>
            <div className="text-right min-w-[100px]">
              <div className="text-primary-orange font-bold text-lg">
                €{pkg.price.toFixed(2)}
              </div>
              {discount > 0 && (
                <div className="text-neutral-500 line-through text-xs" style={{color: '#CD5C5C'}}>
                  €{pkg.originalPrice.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 mt-auto">
            {isLoggedIn ? (
              <button
                onClick={handleAddToCart}
                disabled={inCart || isAdding}
                className={`h-9 px-4 py-2 rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  inCart
                    ? 'bg-green-500 hover:bg-green-400 text-black'
                    : 'button-primary text-white'
                } ${isAdding ? 'opacity-50' : ''}`}
              >
                {inCart ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>In Cart</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>{isAdding ? 'Adding...' : 'Add to Cart'}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="h-9 px-4 py-2 rounded-md button-primary text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log(`📊 [STATS] User clicked "Details" button for package: ${pkg.name}`);
                onClick(pkg);
              }}
              className="h-9 py-2 px-4 rounded-md font-semibold text-sm flex items-center justify-center gap-2 relative overflow-hidden group bg-transparent transition-all"
              style={{ 
                background: 'linear-gradient(#0C0C0C, #0C0C0C) padding-box, linear-gradient(135deg, #FF3B30 0%, #FF9500 100%) border-box',
                border: '2px solid transparent',
                color: '#FF9500'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #FF3B30 0%, #FF9500 100%)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(#0C0C0C, #0C0C0C) padding-box, linear-gradient(135deg, #FF3B30 0%, #FF9500 100%) border-box';
                e.currentTarget.style.color = '#FF9500';
              }}
            >
              Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageCard;

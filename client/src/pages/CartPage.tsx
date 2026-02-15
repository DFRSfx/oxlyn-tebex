import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Shield, Zap, Star, Tag, AlertTriangle, Crown, ArrowRight, X } from 'lucide-react';
import { useTebex } from '../context/TebexContext';
import { useAuth } from '../context/AuthContext';
import { formatCategoryName } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { tebexService } from '../services/tebexService';
import { mapTebexPackageToPackage } from '../utils/packageMapper';
import { Package } from '../types';
import { useAnalytics } from '../hooks/useAnalytics';
import { launchTebexCheckout } from '../utils/tebexCheckout';

const DiscordIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const CartPage: React.FC = () => {
  const { cartItems, removeFromCart, basketIdent, isLoggedIn, applyCoupon, removeCoupon, appliedCoupon } = useTebex();
  const { isAuthenticated: isDiscordConnected, getDiscordAuthUrl } = useAuth();
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();

  const handleDiscordConnect = async () => {
    try {
      const authUrl = await getDiscordAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Discord connect failed:', error);
    }
  };

  // -- Logic & State (Preserved) --
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isRemovingCoupon, setIsRemovingCoupon] = useState(false);
  const [featuredScripts, setFeaturedScripts] = useState<Package[]>([]);

  // Deduplicate packages by base name, keeping the one with the lowest price
  const deduplicatePackages = (pkgs: Package[]): Package[] => {
    const packageGroups = new Map<string, Package[]>();

    // Group packages by base name
    pkgs.forEach(pkg => {
      const baseName = pkg.name
        .replace(/\s*\(OPEN-SOURCE\)/gi, '')
        .replace(/\s*\(ESCROWED\)/gi, '')
        .replace(/\s*\(Open Source\)/gi, '')
        .replace(/\s*\(Escrow\)/gi, '')
        .trim();

      if (!packageGroups.has(baseName)) {
        packageGroups.set(baseName, []);
      }
      packageGroups.get(baseName)!.push(pkg);
    });

    // For each group, select the package with the lowest price
    const deduplicated: Package[] = [];
    packageGroups.forEach((variants) => {
      const lowestPricePackage = variants.reduce((min, current) =>
        current.price < min.price ? current : min
      );
      deduplicated.push(lowestPricePackage);
    });

    return deduplicated;
  };

  // Track cart view when page loads
  useEffect(() => {
    if (isLoggedIn && cartItems.length > 0) {
      trackEvent('cart_viewed', {
        eventData: {
          items_count: cartItems.length,
          total_value: cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0),
          has_coupon: !!appliedCoupon,
        },
      });
    }
  }, []); // Only on mount

  // Fetch featured scripts from Tebex API
  useEffect(() => {
    const fetchFeaturedScripts = async () => {
      try {
        const tebexPackages = await tebexService.fetchPackages();
        const mappedPackages = tebexPackages.map(mapTebexPackageToPackage);

        // Apply same filtering logic as ScriptsPage
        const filteredPackages = deduplicatePackages(
          mappedPackages.filter(pkg => !pkg.description?.toLowerCase().includes('vanguard'))
        );

        // Filter out packages that are already in cart
        const cartPackageIds = cartItems.map(item => String(item.id));
        const availablePackages = filteredPackages.filter(
          pkg => !cartPackageIds.includes(String(pkg.id))
        );

        // Get first 3 packages as featured
        setFeaturedScripts(availablePackages.slice(0, 3));
      } catch (error) {
        console.error('Failed to fetch featured scripts:', error);
      }
    };
    fetchFeaturedScripts();
  }, [cartItems]);

  const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0);

  // Current price from cart (includes coupon if Tebex applied it)
  const currentPrice = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // Coupon Logic
  const couponDiscountAmount = appliedCoupon?.discountAmount || 0;

  // Price before coupon - this is the base for our calculations
  const priceBeforeCoupon = currentPrice + Math.abs(couponDiscountAmount);

  // Original price is calculated from priceBeforeCoupon (before coupon) so it stays constant
  const originalPrice = priceBeforeCoupon * 2;

  // Launch discount is 50% off the original price (stays constant)
  const launchDiscountAmount = originalPrice - priceBeforeCoupon;

  // Total price includes coupon discount
  const totalPrice = currentPrice;
  
  const actualCouponPercentage = priceBeforeCoupon > 0 && Math.abs(couponDiscountAmount) > 0
    ? Math.round((Math.abs(couponDiscountAmount) / priceBeforeCoupon) * 100)
    : 0;

  const currency = cartItems[0]?.currency || 'EUR';
  const currencySymbol = currency === 'EUR' ? '€' : '$';

  // Handlers
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

      // Track successful coupon application
      trackEvent('coupon_applied', {
        eventData: {
          coupon_code: couponCode.toUpperCase(),
          discount_amount: Math.abs(appliedCoupon?.discountAmount || 0),
        },
      });
    } else {
      setCouponError(result.error || 'Invalid code');

      // Track failed coupon attempt
      trackEvent('coupon_failed', {
        eventData: {
          coupon_code: couponCode.toUpperCase(),
          error: result.error,
        },
      });
    }
  };

  const handleRemoveCoupon = async () => {
    setIsRemovingCoupon(true);
    await removeCoupon();
    setIsRemovingCoupon(false);

    // Track coupon removal
    trackEvent('coupon_removed', {
      eventData: {
        coupon_code: appliedCoupon?.code,
      },
    });
  };

  const handleCheckout = () => {
    if (!basketIdent) return;

    // Track checkout start (sync, no awaits)
    cartItems.forEach(item => {
      trackEvent('checkout_start', {
        packageName: item.name,
        eventData: { price: item.price, quantity: item.qty, total: item.price * item.qty },
      });
    });

    // Launch Tebex checkout modal — called synchronously inside user gesture
    // so the popup is never blocked by the browser
    launchTebexCheckout(basketIdent);
  };

  const handleRemoveItem = async (item: any) => {
    await removeFromCart(item.id);

    // Track item removal
    trackEvent('cart_item_removed', {
      packageName: item.name,
      eventData: {
        price: item.price,
        quantity: item.qty,
      },
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#050505] text-white pt-32 pb-20 relative z-10 flex flex-col items-center justify-center">
         <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl text-center max-w-md w-full">
            <ShoppingCart className="w-16 h-16 text-zinc-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2">Please Login</h2>
            <p className="text-zinc-400 mb-6">You need to be logged in with FiveM to view your cart.</p>
            <button className="w-full py-3 bg-white text-black font-bold rounded hover:bg-zinc-200 transition-colors">
                Login with FiveM
            </button>
         </div>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-[#050505] text-white pt-32 pb-20 relative z-10 font-sans selection:bg-orange-500/30">
      <div className="max-w-[1400px] mx-auto px-6">
        
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
            <div>
                <h1 className="text-3xl font-bold text-white mb-1">Shopping Cart</h1>
                <p className="text-zinc-500">{totalItems} {totalItems === 1 ? 'item' : 'items'} ready for checkout</p>
            </div>
            {cartItems.length > 0 && (
                <button onClick={() => navigate('/scripts')} className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1">
                    Continue Shopping <ArrowRight className="w-4 h-4" />
                </button>
            )}
        </div>

        {cartItems.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-24 bg-[#0a0a0a] border border-zinc-800 rounded-xl">
             <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
                <ShoppingCart className="w-8 h-8 text-zinc-500" />
             </div>
             <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
             <p className="text-zinc-500 max-w-md text-center mb-8">
               Looks like you haven't added any scripts yet.
             </p>
             <button
               onClick={() => navigate('/scripts')}
               className="px-8 py-3 bg-white text-black font-bold rounded hover:scale-105 transition-transform"
             >
               Browse Scripts
             </button>
           </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left Column - Cart Items */}
            <div className="lg:col-span-8 space-y-6">
               <div className="space-y-4">
               {cartItems.map((item) => (
                 <div key={item.id} className="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-4 flex items-center gap-6 group hover:border-zinc-700 transition-colors relative overflow-hidden">
                    {/* Image */}
                    <div className="w-32 aspect-video bg-zinc-900 rounded-lg overflow-hidden shrink-0 border border-zinc-800">
                        <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-white truncate">{item.name}</h3>
                            <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] uppercase font-bold rounded border border-zinc-700">
                                {item.category ? formatCategoryName(item.category.name) : 'Script'}
                            </span>
                        </div>
                        <p className="text-zinc-500 text-sm mb-2">Quantity: {item.qty}</p>
                        
                        {/* Discount Badge */}
                        <div className="flex gap-2">
                             <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded border border-green-900/50">
                                50% Launch Off
                            </span>
                        </div>
                    </div>

                    {/* Price & Action */}
                    <div className="text-right shrink-0">
                        <div className="text-xs text-zinc-500 line-through mb-0.5">
                            {currencySymbol}{((item.price * 2) * item.qty).toFixed(2)}
                        </div>
                        <div className="text-xl font-bold text-white mb-2">
                            {currencySymbol}{(item.price * item.qty).toFixed(2)}
                        </div>
                        <button
                            onClick={() => handleRemoveItem(item)}
                            className="text-zinc-500 hover:text-red-500 transition-colors p-2 hover:bg-red-500/10 rounded-full"
                            title="Remove item"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                 </div>
               ))}
               </div>

               {/* Subscription Promo Box */}
               <div className="bg-gradient-to-r from-orange-900/20 via-orange-800/20 to-orange-900/20 border border-orange-500/20 rounded-xl p-6 relative overflow-hidden group">
                  <div className="relative z-10 flex items-start justify-between">
                     <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Crown className="w-5 h-5 text-orange-500" />
                            <h3 className="font-bold text-white">Subscribe & Save</h3>
                            <span className="text-[10px] bg-orange-500 text-black font-bold px-2 py-0.5 rounded-full">SOON</span>
                        </div>
                        <p className="text-sm text-zinc-400 max-w-lg">
                           Get access to all premium scripts for one monthly price. Save up to <span className="text-orange-400">85%</span> compared to individual purchases.
                        </p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Right Column - Summary & Coupons */}
            <div className="lg:col-span-4">
                <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-6 sticky top-28">
                    <h3 className="text-xl font-bold text-white mb-6">Order Summary</h3>
                    
                    {/* Coupon Input */}
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
                                    placeholder="Coupon Code"
                                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                                />
                                <button
                                    onClick={handleApplyCoupon}
                                    disabled={isApplyingCoupon || !couponCode.trim()}
                                    className="px-3 py-2 bg-zinc-800 text-white text-sm font-medium rounded hover:bg-zinc-700 disabled:opacity-50"
                                >
                                    {isApplyingCoupon ? '...' : 'Apply'}
                                </button>
                            </div>
                        ) : (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-blue-400 font-bold flex items-center gap-1">
                                        <Tag className="w-3 h-3" /> {appliedCoupon.code}
                                    </div>
                                    <div className="text-[10px] text-blue-300/70">
                                        Discount applied
                                    </div>
                                </div>
                                <button onClick={handleRemoveCoupon} disabled={isRemovingCoupon} className="text-zinc-400 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        {couponError && <p className="text-red-500 text-xs mt-2">{couponError}</p>}
                        {couponSuccess && <p className="text-green-500 text-xs mt-2">{couponSuccess}</p>}
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-zinc-400 text-sm">
                            <span>Original Price:</span>
                            <span className="line-through">{currencySymbol}{originalPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-green-500 text-sm">
                            <span className="flex items-center gap-1"><Star className="w-3 h-3" /> Launch Savings:</span>
                            <span>-{currencySymbol}{launchDiscountAmount.toFixed(2)}</span>
                        </div>
                        {appliedCoupon && (
                            <div className="flex justify-between text-blue-500 text-sm">
                                <span>Coupon ({actualCouponPercentage}%):</span>
                                <span>-{currencySymbol}{Math.abs(couponDiscountAmount).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="border-t border-zinc-800 pt-3 flex justify-between items-end">
                            <span className="text-white font-medium">Total:</span>
                            <span className="text-2xl font-bold text-white">{currencySymbol}{totalPrice.toFixed(2)}</span>
                        </div>
                        
                        {/* Savings Calculation Banner */}
                        <div className="text-xs text-center text-green-500/80 bg-green-500/5 border border-green-500/10 py-2 rounded">
                            You are saving <span className="font-bold">{currencySymbol}{(originalPrice - totalPrice).toFixed(2)}</span> on this order!
                        </div>
                    </div>

                    {/* Discord Warning - Only show if NOT connected */}
                    {!isDiscordConnected && (
                      <div className="bg-[#1a1600] border border-yellow-900/50 rounded-lg p-4 mb-4 flex gap-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                          <div className="flex-1">
                              <p className="text-yellow-500 text-sm font-bold mb-0.5">Discord connection required</p>
                              <p className="text-yellow-500/70 text-xs mb-3">Connect your Discord account to proceed with checkout.</p>
                              <button
                                onClick={handleDiscordConnect}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#5865F2] text-white text-xs font-bold rounded hover:bg-[#4752C4] transition-colors"
                              >
                                <DiscordIcon />
                                Connect Discord
                              </button>
                          </div>
                      </div>
                    )}

                    <button
                        onClick={isDiscordConnected ? handleCheckout : handleDiscordConnect}
                        disabled={!basketIdent}
                        className="w-full py-3.5 bg-white text-black font-bold rounded hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                         {!isDiscordConnected ? (
                           <>
                             <DiscordIcon />
                             Connect Discord to Checkout
                           </>
                         ) : (
                           <>
                             <ShoppingCart className="w-5 h-5" />
                             Proceed to Checkout
                           </>
                         )}
                    </button>

                    {/* Image from User Request */}
                    <div className="mb-4">
                        <img src="https://i.imgur.com/1oDMbml.png" alt="Payment Methods" className="w-full opacity-80" />
                    </div>

                     <div className="text-center">
                        <p className="text-[10px] text-zinc-600">Powered by <span className="font-bold text-zinc-500">TEBEX</span></p>
                    </div>
                </div>

                {/* Trust Badges Mini */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-[#0a0a0a] border border-zinc-800 rounded p-2 text-center">
                        <Zap className="w-4 h-4 text-zinc-500 mx-auto mb-1" />
                        <p className="text-[10px] text-zinc-400">Instant Delivery</p>
                    </div>
                    <div className="bg-[#0a0a0a] border border-zinc-800 rounded p-2 text-center">
                        <Shield className="w-4 h-4 text-zinc-500 mx-auto mb-1" />
                        <p className="text-[10px] text-zinc-400">Secure Payment</p>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* "You Might Also Like" Section - Real Scripts from API */}
        {featuredScripts.length > 0 && (
          <div className="mt-24 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">You might also like</h2>
              <p className="text-zinc-500 mb-8">Check out our featured scripts</p>

              <div className="grid md:grid-cols-3 gap-6">
                   {featuredScripts.map((script) => (
                      <div key={script.id} className="bg-[#0a0a0a] border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-600 transition-all">
                          <div className="aspect-video bg-zinc-900 relative">
                               <img
                                 src={script.image}
                                 alt={script.name}
                                 className="w-full h-full object-cover"
                               />
                          </div>
                          <div className="p-5 text-left">
                              <h3 className="text-lg font-bold text-white mb-1 truncate">{script.name}</h3>
                              <p className="text-sm text-zinc-500 mb-4">€{script.price.toFixed(2)}</p>
                              <div className="flex items-center justify-between gap-2">
                                  <button
                                    onClick={() => {
                                      const slug = script.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                      navigate(`/product/${slug}`, { state: { package: script } });
                                    }}
                                    className="flex-1 text-xs font-bold bg-zinc-900 text-zinc-300 border border-zinc-800 px-3 py-2 rounded hover:text-white hover:border-zinc-600"
                                  >
                                      View Details
                                  </button>
                              </div>
                          </div>
                      </div>
                   ))}
              </div>
          </div>
        )}

      </div>
    </section>
  );
};

export default CartPage;
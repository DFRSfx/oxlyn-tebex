import React, { useState } from 'react';
import { ShoppingCart, Trash2, Lock, Shield, Headphones, Star, Crown, ArrowRight, Zap, Tag } from 'lucide-react';
import { useTebex } from '../context/TebexContext';
import { formatCategoryName } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';

const CartPage: React.FC = () => {
  const { cartItems, removeFromCart, proceedToCheckout, isLoggedIn, applyCoupon, removeCoupon, appliedCoupon } = useTebex();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isRemovingCoupon, setIsRemovingCoupon] = useState(false);

  const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0);

  // Calculate with 50% discount always active
  const originalPrice = cartItems.reduce((sum, item) => sum + ((item.price * 2) * item.qty), 0); // Price displayed is already 50% off
  const currentPrice = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const launchDiscountAmount = originalPrice - currentPrice;

  // Coupon discount (for display only - prices from Tebex are already discounted)
  const couponDiscountAmount = appliedCoupon?.discountAmount || 0;
  // Total is just currentPrice (Tebex already applied the coupon to item prices)
  const totalPrice = currentPrice;

  // Calculate the cart price BEFORE the coupon was applied
  // Since Tebex already applied the coupon: priceBeforeCoupon = currentPrice + discount
  const priceBeforeCoupon = currentPrice + Math.abs(couponDiscountAmount);

  // Calculate the actual coupon percentage (e.g., 10% for OXLYN-10)
  const actualCouponPercentage = priceBeforeCoupon > 0 && Math.abs(couponDiscountAmount) > 0
    ? Math.round((Math.abs(couponDiscountAmount) / priceBeforeCoupon) * 100)
    : 0;

  const currency = cartItems[0]?.currency || 'EUR';
  const currencySymbol = currency === 'EUR' ? '€' : '$';

  const handleApplyCoupon = async () => {
    setCouponError('');
    setCouponSuccess('');
    setIsApplyingCoupon(true);

    const result = await applyCoupon(couponCode);

    setIsApplyingCoupon(false);

    if (result.success) {
      setCouponSuccess('✅ Coupon applied successfully!');
      setCouponCode('');
      setTimeout(() => setCouponSuccess(''), 3000);
    } else {
      setCouponError(result.error || 'Invalid coupon code');
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponError('');
    setCouponSuccess('');
    setIsRemovingCoupon(true);

    const result = await removeCoupon();

    setIsRemovingCoupon(false);

    if (result.success) {
      setCouponSuccess('✅ Coupon removed successfully!');
      setTimeout(() => setCouponSuccess(''), 3000);
    } else {
      setCouponError(result.error || 'Failed to remove coupon');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black text-white pt-32 pb-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col items-center justify-center py-20">
            <ShoppingCart className="w-20 h-20 text-gray-400 mb-6" />
            <h2 className="text-3xl font-bold mb-4 text-white">Please Login</h2>
            <p className="text-gray-300 text-lg">Login with FiveM to view your cart</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-black text-white pt-32 pb-20 relative z-10">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className={`grid gap-8 ${cartItems.length > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
          {/* Left Column - Cart Items */}
          <div className={cartItems.length > 0 ? 'lg:col-span-2' : 'lg:col-span-1'}>
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2 flex items-center gap-3">
                <ShoppingCart className="w-10 h-10 gradient-text-brand" />
                Shopping Cart
              </h1>
              <span className="text-gray-300 text-lg">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
              </span>
            </div>

            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-8 bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-700/50 rounded-2xl backdrop-blur-sm">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-orange-600/20 blur-3xl rounded-full"></div>
                  <ShoppingCart className="w-24 h-24 text-orange-400 relative z-10" strokeWidth={1.5} />
                </div>

                <h2 className="text-4xl font-black text-white mb-3 text-center">Your Cart is Empty</h2>
                <div className="text-xl font-semibold gradient-text-brand mb-4 text-center">
                  Ready to build something amazing?
                </div>
                <p className="text-gray-300 text-center max-w-2xl mb-8 leading-relaxed">
                  Discover our premium FiveM scripts and transform your server into an extraordinary gaming experience. Professional quality, instant delivery, and lifetime support included.
                </p>

                <button
                  onClick={() => navigate('/')}
                  className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-orange-500/30 mb-12"
                >
                  Explore Premium Scripts
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
                  <div className="flex flex-col items-center gap-2 p-4 bg-gray-700/30 rounded-xl border border-gray-600/30 hover:border-orange-500/30 transition-all duration-300">
                    <Zap className="w-8 h-8 text-orange-400 mb-1" />
                    <span className="text-sm font-semibold text-white text-center">Instant Delivery</span>
                  </div>

                  <div className="flex flex-col items-center gap-2 p-4 bg-gray-700/30 rounded-xl border border-gray-600/30 hover:border-orange-500/30 transition-all duration-300">
                    <Shield className="w-8 h-8 text-orange-400 mb-1" />
                    <span className="text-sm font-semibold text-white text-center">Lifetime Updates</span>
                  </div>

                  <div className="flex flex-col items-center gap-2 p-4 bg-gray-700/30 rounded-xl border border-gray-600/30 hover:border-orange-500/30 transition-all duration-300">
                    <Headphones className="w-8 h-8 text-orange-400 mb-1" />
                    <span className="text-sm font-semibold text-white text-center">24/7 Support</span>
                  </div>

                  <div className="flex flex-col items-center gap-2 p-4 bg-gray-700/30 rounded-xl border border-gray-600/30 hover:border-orange-500/30 transition-all duration-300">
                    <Star className="w-8 h-8 text-orange-400 mb-1" />
                    <span className="text-sm font-semibold text-white text-center">Premium Quality</span>
                  </div>

                
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Cart Items */}
                <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
                  {cartItems.map((item, index) => {
        
                  return (
                    <div
                      key={item.id}
                      className={`p-6 flex gap-4 hover:bg-white/5 transition-all duration-300 ${
                        index !== cartItems.length - 1 ? 'border-b border-gray-800/50' : ''
                      }`}
                    >
                      {/* Product Image */}
                      <div className="w-40 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-700/50 border border-gray-600/50">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                          {item.category && (
                            <span className="inline-block text-xs px-3 py-1 rounded-full bg-gray-700/60 text-gray-200 border border-gray-600/40">
                              {formatCategoryName(item.category.name)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-300">Quantity: {item.qty}</span>
                        </div>
                      </div>

                      {/* Price & Remove */}
                      <div className="flex flex-col items-end justify-between">
                        <div className="text-right">
                          <div className="text-sm text-gray-400 line-through mb-1">
                            {currencySymbol}{((item.price * 2) * item.qty).toFixed(2)}
                          </div>
                          <div className="text-2xl font-bold gradient-text-brand flex items-center gap-2">
                            {currencySymbol}{(item.price * item.qty).toFixed(2)}
                            <div className="flex items-center gap-1">
                              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                                -50%
                              </span>
                              {appliedCoupon && actualCouponPercentage > 0 && (
                                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30 font-bold">
                                  -{actualCouponPercentage}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-300 border border-gray-600/50 hover:border-red-500/50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>

                {/* Subscription Promo */}
                <div className="bg-gradient-to-r from-orange-900/40 via-orange-800/40 to-orange-900/40 border border-orange-500/40 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Crown className="w-6 h-6 text-yellow-400" />
                        Subscribe & Save with <span className="gradient-text-brand">OXLYN</span>
                      </h2>
                      <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs font-bold rounded-full uppercase tracking-wider">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-gray-300">
                      Get access to all our premium scripts with our subscription service.
                      <span className="text-yellow-400 font-semibold"> Save up to 85%</span> compared to individual purchases, with new scripts included every month.
                    </p>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl"></div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Order Summary */}
          {cartItems.length > 0 && (
          <div className="lg:col-span-1">
            <div className="sticky top-32">
              <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 border border-gray-700/60 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-white mb-6">Order Summary</h3>

                {/* Coupon Code Input */}
                <div className="mb-6">
                  {!appliedCoupon ? (
                    <>
                      <label className="text-sm text-gray-300 mb-2 block flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Have a coupon?
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            setCouponError('');
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && couponCode.trim()) {
                              handleApplyCoupon();
                            }
                          }}
                          placeholder="ENTER CODE"
                          disabled={isApplyingCoupon}
                          className="flex-1 bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-colors disabled:opacity-50"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={isApplyingCoupon || !couponCode.trim()}
                          className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-400 rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                        >
                          {isApplyingCoupon ? 'Applying...' : 'Apply'}
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-red-400 text-xs mt-2">❌ {couponError}</p>
                      )}
                      {couponSuccess && (
                        <p className="text-green-400 text-xs mt-2">{couponSuccess}</p>
                      )}
                    </>
                  ) : (
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-500/20 p-2 rounded-lg">
                            <Tag className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <div className="text-xs font-medium text-blue-400">Coupon Applied</div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold">{appliedCoupon.code}</span>
                              {actualCouponPercentage > 0 && (
                                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30 font-bold">
                                  -{actualCouponPercentage}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleRemoveCoupon}
                          disabled={isRemovingCoupon}
                          className="text-xs text-red-400 hover:text-red-300 underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isRemovingCoupon ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                      <div className="text-xs text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded border border-blue-500/20">
                        💰 Extra {currencySymbol}{Math.abs(couponDiscountAmount).toFixed(2)} discount applied
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  {/* Original Price */}
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-300">Original Price</span>
                    <span className="text-white font-semibold">
                      {currencySymbol}{originalPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Launch Discount */}
                  <div className="flex justify-between text-green-400 bg-green-500/10 px-3 py-2 rounded-lg border border-green-500/20">
                    <span className="font-semibold flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      50% Launch Discount
                    </span>
                    <span className="font-bold">-{currencySymbol}{launchDiscountAmount.toFixed(2)}</span>
                  </div>

                  {/* Coupon Discount */}
                  {appliedCoupon && Math.abs(couponDiscountAmount) > 0 && (
                    <div className="flex justify-between text-blue-400 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20">
                      <span className="font-semibold flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Coupon: {appliedCoupon.code}
                      </span>
                      <span className="font-bold">-{currencySymbol}{Math.abs(couponDiscountAmount).toFixed(2)}</span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="border-t border-gray-600/50 pt-4 flex justify-between text-xl font-bold">
                    <span className="text-white">Total</span>
                    <span className="gradient-text-brand text-2xl">
                      {currencySymbol}{totalPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Savings Message */}
                  <div className="text-xs text-center text-green-400 font-semibold bg-green-500/5 py-2 rounded-lg">
                    🎉 You're saving {currencySymbol}{(launchDiscountAmount + Math.abs(couponDiscountAmount)).toFixed(2)} with this order!
                  </div>
                </div>

                {cartItems.length > 0 && (
                  <button
                    onClick={proceedToCheckout}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 mb-6"
                  >
                    <Lock className="w-5 h-5" />
                    Secure Checkout
                  </button>
                )}

                {/* Trust Badges - Compact Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="flex flex-col items-center gap-2 text-center bg-gradient-to-br from-orange-500/10 to-orange-600/10 p-3 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300">
                    <Zap className="w-6 h-6 text-orange-400" />
                    <div className="text-xs font-semibold text-white">Instant Delivery</div>
                  </div>

                  <div className="flex flex-col items-center gap-2 text-center bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-3 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
                    <Shield className="w-6 h-6 text-blue-400" />
                    <div className="text-xs font-semibold text-white">Secure Payment</div>
                  </div>

                  <div className="flex flex-col items-center gap-2 text-center bg-gradient-to-br from-purple-500/10 to-purple-600/10 p-3 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300">
                    <Headphones className="w-6 h-6 text-purple-400" />
                    <div className="text-xs font-semibold text-white">24/7 Support</div>
                  </div>

                  <div className="flex flex-col items-center gap-2 text-center bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 p-3 rounded-xl border border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-300">
                    <Star className="w-6 h-6 text-yellow-400" />
                    <div className="text-xs font-semibold text-white">Premium Quality</div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="mb-6">
                  <img
                    src="https://i.imgur.com/1oDMbml.png"
                    alt="Payment Methods"
                    className="w-full rounded-lg"
                  />
                  <div className="text-center text-sm text-gray-300 mt-2">
                    and many more payment methods
                  </div>
                </div>

                {/* Tebex Badge */}
                <a
                  href="https://www.tebex.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-sm text-gray-300 hover:text-white transition-colors mb-4"
                >
                  Powered by Tebex
                </a>

                <div className="text-xs text-gray-400 text-center leading-relaxed">
                  Our checkout process is owned & operated by Tebex Limited, who handle product fulfillment, billing support and refunds.
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default CartPage;

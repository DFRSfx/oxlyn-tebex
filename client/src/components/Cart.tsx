import React from 'react';
import { X, Trash2, ShoppingCart, ExternalLink } from 'lucide-react';
import { useTebex } from '../context/TebexContext';
import { formatCategoryName } from '../utils/helpers';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

const Cart: React.FC<CartProps> = ({ isOpen, onClose }) => {
  const { cartItems, removeFromCart, proceedToCheckout, isLoggedIn } = useTebex();

  const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const currency = cartItems[0]?.currency || 'EUR';

  const state = isOpen ? 'open' : 'closed';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Cart Sidebar */}
      <div
        data-state={state}
        className="fixed top-0 right-0 h-full w-full max-w-md flex flex-col bg-black border-l border-neutral-700/30 z-50 shadow-2xl transition-transform duration-500 ease-in-out"
        style={{ transform: isOpen ? 'translateX(0%)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-700/30 bg-black/50 backdrop-blur-md">
          <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary-orange" />
            Your Cart
            <span className="ml-2 text-sm font-normal text-neutral-400">
              ({totalItems} {totalItems === 1 ? 'item' : 'items'})
            </span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors duration-200 group"
          >
            <X className="w-6 h-6 text-neutral-400 group-hover:text-white" />
          </button>
        </div>

        {/* Cart Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-black">
          {!isLoggedIn ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="w-16 h-16 text-neutral-700 mb-4" />
              <p className="text-neutral-300 text-lg mb-2">Please login to view your cart</p>
              <p className="text-neutral-500 text-sm">Login with FiveM to start shopping</p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="w-16 h-16 text-neutral-700 mb-4" />
              <p className="text-neutral-300 text-lg mb-2">Your cart is empty</p>
              <p className="text-neutral-500 text-sm">Add some scripts to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="relative group bg-neutral-900/40 border border-neutral-800/50 p-4 rounded-xl flex gap-3 hover:border-primary-orange/30 transition-all duration-300 ease-in-out"
                >
                  <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-neutral-800 border border-neutral-700/50">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-white leading-tight">{item.name}</h4>
                      {item.category && (
                        <span className="inline-block text-xs px-2 py-1 rounded-full bg-neutral-800/60 text-neutral-300 mt-2 border border-neutral-700/40">
                          {formatCategoryName(item.category.name)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <p className="text-xs text-neutral-400">Quantity: {item.qty}</p>
                      <div className="text-base font-bold gradient-text-brand">
                        {currency === 'EUR' ? '€' : '$'}{(item.price * item.qty).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-neutral-900/80 border border-neutral-700/50 text-neutral-400 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="border-t border-neutral-800/50 pt-4 text-sm text-neutral-400 text-center">
                <p>You will be redirected to Tebex to complete the payment securely.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isLoggedIn && cartItems.length > 0 && (
          <div className="mt-auto flex flex-col gap-4 border-t border-neutral-800/50 p-6 bg-black/80 backdrop-blur-md">
            <div className="flex justify-between text-lg font-bold text-white">
              <span>Total</span>
              <span className="gradient-text-brand">
                {currency === 'EUR' ? '€' : '$'}
                {totalPrice.toFixed(2)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onClose}
                className="w-full button-secondary py-3 rounded-xl font-bold text-white text-base hover:scale-105 transition-transform"
              >
                Continue Shopping
              </button>
              <button
                onClick={proceedToCheckout}
                className="w-full button-primary py-3 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 hover:scale-105 transition-transform"
              >
                Pay with Tebex
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;

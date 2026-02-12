import React, { useEffect } from 'react';

const CheckoutCancelled: React.FC = () => {
  useEffect(() => {
    // Notify parent window that checkout was cancelled
    if (window.parent && window.parent !== window) {
      window.parent.postMessage('checkout:cancel', '*');
    }
    
    // Auto-close after a short delay
    setTimeout(() => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage('checkout:cancel', '*');
      }
    }, 100);
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Checkout Cancelled</h1>
        <p className="text-gray-400">Returning to store...</p>
      </div>
    </div>
  );
};

export default CheckoutCancelled;

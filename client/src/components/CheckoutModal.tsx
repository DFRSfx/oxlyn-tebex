import React from 'react';
import { X } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  checkoutUrl: string;
  onClose: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, checkoutUrl, onClose }) => {
  if (!isOpen || !checkoutUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/92 z-[9999] flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className="bg-zinc-900 rounded-xl w-full max-w-5xl h-[90vh] flex flex-col border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-white/10 bg-gradient-to-r from-zinc-900 to-zinc-800">
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
            title="Close checkout"
          >
            <X className="w-6 h-6 text-white/60 hover:text-white transition-colors" />
          </button>
        </div>

        {/* Iframe Container */}
        <div className="flex-1 overflow-hidden bg-white">
          <iframe
            src={checkoutUrl}
            title="Tebex Checkout"
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation allow-popups-to-escape-sandbox"
            allow="payment"
          />
        </div>
      </div>

      {/* Prevent background scroll when modal is open */}
      <style>{`
        body {
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default CheckoutModal;

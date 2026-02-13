import { useEffect } from 'react';
import { launchTebexCheckout } from '../utils/tebexCheckout';

interface CheckoutModalProps {
  isOpen: boolean;
  ident: string;
  onClose: () => void;
}

export default function CheckoutModal({ isOpen, ident, onClose }: CheckoutModalProps) {
  useEffect(() => {
    if (!isOpen || !ident) return;
    launchTebexCheckout(ident);
    onClose();
  }, [isOpen, ident]);

  return null;
}

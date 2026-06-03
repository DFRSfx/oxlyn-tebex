import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import OptimizedImage from './OptimizedImage';
import { handleDiscordRedirect } from '../utils/helpers';

interface FiveMLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

/**
 * "Please log in" gate shown when the user clicks the FiveM icon in the
 * navbar (logged-out state). Matches the reference design: OXLYN × Cfx.re
 * header strip, a single red CTA that kicks the actual Cfx OAuth flow off,
 * and an escape hatch to the support Discord.
 *
 * The login itself runs in the parent (`onLogin` → useTebex.login()) so the
 * modal stays a presentation-only piece.
 */
export default function FiveMLoginModal({ isOpen, onClose, onLogin }: FiveMLoginModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fivem-login-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="fivem-login-card" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="fivem-login-close">
          <X className="w-5 h-5" />
        </button>

        <div className="fivem-login-brandline">
          <div className="fivem-login-brand-chip">
            <OptimizedImage
              src="/logo.webp"
              alt="OXLYN"
              width={72}
              format="webp"
              className="h-11 w-auto"
            />
          </div>
          <span className="fivem-login-cross">×</span>
          <div className="fivem-login-brand-chip fivem-login-brand-chip-cfx">
            <img src="/cfxre.png" alt="Cfx.re" className="fivem-login-cfx-img" />
          </div>
        </div>

        <div className="fivem-login-divider" />

        <h2 className="fivem-login-title">PLEASE LOG IN</h2>
        <p className="fivem-login-subtitle">Enter your credentials to continue</p>

        <button
          onClick={() => {
            onLogin();
            onClose();
          }}
          className="fivem-login-cta"
        >
          Login via FiveM
        </button>

        <p className="fivem-login-secure">Secure login powered by your game server</p>

        <div className="fivem-login-divider" />

        <button onClick={handleDiscordRedirect} className="fivem-login-support">
          Need help? <span>Contact support</span>
        </button>
      </div>
    </div>,
    document.body
  );
}


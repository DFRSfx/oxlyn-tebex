import { useCallback, useEffect, useRef, useState } from 'react';
import { Archive, Check, Tag } from 'lucide-react';

const COUPON_CODE = 'VANGUARD10';

/**
 * Banner shown at the top of the Vanguard catalogue on /scripts and
 * /bundles. Communicates two things at once:
 *   • Context — Vanguard is a legacy catalogue OXLYN acquired; the
 *     scripts are no longer being updated, but they stay online for
 *     existing buyers and the Unlocked variants ship full source.
 *   • Offer — a 10% promo code (VANGUARD10) the user can click to
 *     copy. Coupon enforcement happens server-side in Tebex; this
 *     component just promotes it.
 *
 * Props are intentionally minimal — the banner doesn't know the page
 * it's rendered on. Use the `kind` prop to swap a single word in the
 * copy ("scripts" vs "bundles") so it feels native on both pages.
 */
interface VanguardNoticeProps {
  /** Tailors the copy line ("Vanguard scripts" vs "Vanguard bundles"). */
  kind?: 'scripts' | 'bundles';
}

export default function VanguardNotice({ kind = 'scripts' }: VanguardNoticeProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the pending "Copied!" timer on unmount so we don't try to set
  // state after the parent rerouted away from the Vanguard tab.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleCopy = useCallback(() => {
    const fallback = () => {
      // navigator.clipboard isn't available on insecure contexts (HTTP) —
      // fall back to a hidden textarea + execCommand so the code copies on
      // a localhost dev server with no HTTPS.
      try {
        const ta = document.createElement('textarea');
        ta.value = COUPON_CODE;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        /* swallow — copy is a nice-to-have */
      }
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(COUPON_CODE).catch(fallback);
    } else {
      fallback();
    }
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1800);
  }, []);

  return (
    <div className="vanguard-notice" role="note">
      <div className="vanguard-notice-body">
        <span className="vanguard-notice-icon" aria-hidden="true">
          <Archive size={17} strokeWidth={2.2} />
        </span>
        <div className="vanguard-notice-text">
          <div className="vanguard-notice-title">
            <span className="vanguard-notice-pill">Vanguard Labs</span>
            <span>kept online by OXLYN</span>
          </div>
          <p className="vanguard-notice-copy">
            This is the original <b>Vanguard Labs</b> catalogue — a separate
            store that <b>OXLYN acquired</b>. We no longer push new features
            here, but every {kind === 'bundles' ? 'bundle' : 'script'} stays
            for sale, and the <b>Unlocked</b> variants ship with full source
            code so you can fork and run them on your own server.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className={`vanguard-coupon ${copied ? 'is-copied' : ''}`}
        aria-label={`Copy promo code ${COUPON_CODE} for 10% off`}
      >
        <span className="vanguard-coupon-icon" aria-hidden="true">
          <Tag size={15} strokeWidth={2.2} />
        </span>
        <span className="vanguard-coupon-stack">
          <span className="vanguard-coupon-label">10% off</span>
          <span className="vanguard-coupon-code">{COUPON_CODE}</span>
        </span>
        <span className="vanguard-coupon-action">
          {copied ? (
            <>
              <Check size={12} strokeWidth={2.8} /> Copied
            </>
          ) : (
            'Copy'
          )}
        </span>
      </button>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, Tag, Check, ArrowRight } from 'lucide-react';

// =============================================================================
// FIRST-CUSTOMER PROMO POPUP
// =============================================================================
// Greets new visitors with a 20% off coupon (FIRSTCUSTOMER20) to nudge their
// first purchase. Cooldown logic:
//   • Shows once per browser, after a short delay so it doesn't compete with
//     the hero on initial paint.
//   • If the user dismisses it (X / Esc / outside click / "Maybe later"), we
//     stamp the dismissal timestamp in localStorage.
//   • On subsequent visits, the popup stays hidden until 24 hours have
//     elapsed since the last dismissal — then it appears again to re-engage.
//   • If the user clicks "Copy code", that counts as a successful capture
//     (coupon copied) — we stamp a much longer cooldown (30 days) so we
//     don't badger them with the same offer again right away.
//
// SEO-safe: rendered in a React portal AFTER the main DOM, role="dialog",
// aria-modal, and never blocks crawlers (popup state is hydrated from
// localStorage which is empty in the bot context — they see the rest of
// the page intact).
// =============================================================================

const COUPON_CODE = 'FIRSTCUSTOMER20';
const COUPON_PCT = 20;
const LS_KEY = '__oxlyn_first_customer_popup_v1';
const COOLDOWN_DISMISS_MS = 24 * 60 * 60 * 1000;        // 1 day after close
const COOLDOWN_COPIED_MS = 30 * 24 * 60 * 60 * 1000;    // 30 days after copy
const SHOW_DELAY_MS = 5500;                              // wait ~5.5s after mount

interface CooldownRecord {
  /** Unix timestamp of the last interaction. */
  at: number;
  /** Reason — drives the cooldown length. */
  reason: 'dismissed' | 'copied';
}

function loadCooldown(): CooldownRecord | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CooldownRecord;
    if (typeof parsed?.at !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCooldown(reason: CooldownRecord['reason']) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ at: Date.now(), reason }));
  } catch {
    /* private-browsing safe */
  }
}

function isWithinCooldown(rec: CooldownRecord | null): boolean {
  if (!rec) return false;
  const window = rec.reason === 'copied' ? COOLDOWN_COPIED_MS : COOLDOWN_DISMISS_MS;
  return Date.now() - rec.at < window;
}

export default function FirstCustomerPopup() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Defer the decision until after first paint so the popup never blocks
  // LCP or appears synchronously alongside the hero (worst-case CLS spike).
  useEffect(() => {
    const rec = loadCooldown();
    if (isWithinCooldown(rec)) return;
    showTimerRef.current = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, []);

  // Esc closes the popup — keyboard-accessible dismiss without focus traps.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKey);
    // Lock body scroll while open so users see the offer + can't lose it
    // by scrolling past. Restored on close.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
    saveCooldown('dismissed');
  }, []);

  const handleCopy = useCallback(() => {
    const fallback = () => {
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
        /* swallow */
      }
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(COUPON_CODE).catch(fallback);
    } else {
      fallback();
    }
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2200);
    saveCooldown('copied');
  }, []);

  const handleShop = useCallback(() => {
    saveCooldown('copied');
    setOpen(false);
    navigate('/scripts');
  }, [navigate]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="first-customer-popup-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-customer-popup-title"
      aria-describedby="first-customer-popup-desc"
      onClick={dismiss}
    >
      <div
        className="first-customer-popup-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          className="first-customer-popup-close"
          aria-label="Close offer"
        >
          <X size={18} strokeWidth={2.2} />
        </button>

        <div className="first-customer-popup-glow" aria-hidden="true" />

        <div className="first-customer-popup-eyebrow">
          <Sparkles size={12} strokeWidth={2.6} />
          <span>Welcome offer · new customer</span>
        </div>

        <h2 id="first-customer-popup-title" className="first-customer-popup-title">
          Get <span className="first-customer-popup-percent">{COUPON_PCT}%</span> off
          <br />
          your first OXLYN order
        </h2>

        <p id="first-customer-popup-desc" className="first-customer-popup-desc">
          One-time gift for first-time customers. Pick any premium FiveM
          script, apply the code at checkout, and save{' '}
          <b>{COUPON_PCT}% instantly</b>. Works on Escrow + Open Source builds.
        </p>

        <div className="first-customer-popup-coupon">
          <div className="first-customer-popup-coupon-icon">
            <Tag size={16} strokeWidth={2.4} />
          </div>
          <div className="first-customer-popup-coupon-stack">
            <span className="first-customer-popup-coupon-label">Your code</span>
            <span className="first-customer-popup-coupon-code">{COUPON_CODE}</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={`first-customer-popup-copy-btn ${copied ? 'is-copied' : ''}`}
            aria-label={`Copy promo code ${COUPON_CODE}`}
          >
            {copied ? (
              <>
                <Check size={14} strokeWidth={2.8} /> Copied
              </>
            ) : (
              'Copy'
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleShop}
          className="first-customer-popup-cta"
          data-track="first-customer-popup-shop"
        >
          <span>Shop scripts now</span>
          <ArrowRight size={16} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={dismiss}
          className="first-customer-popup-dismiss"
        >
          Maybe later
        </button>

        <div className="first-customer-popup-fineprint">
          One use per customer · valid on first order · single-use code · cannot
          be combined with subscription discounts.
        </div>
      </div>
    </div>,
    document.body
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { SUPPORTED_CURRENCIES, useCurrency } from '../context/CurrencyContext';

const CurrencySwitcher: React.FC = () => {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close-on-outside-click — mirrors the avatar dropdown so behaviour stays
  // consistent across nav menus.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="oxlyn-currency-wrap" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="oxlyn-currency-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Currency: ${currency}. Change currency.`}
      >
        <span className="oxlyn-currency-code">{currency}</span>
        <ChevronDown size={14} className={`oxlyn-currency-caret ${open ? 'is-open' : ''}`} />
      </button>

      {open && (
        <div className="oxlyn-currency-menu" role="menu">
          {SUPPORTED_CURRENCIES.map((c) => {
            const isActive = c === currency;
            return (
              <button
                key={c}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  setCurrency(c);
                  setOpen(false);
                }}
                className={`oxlyn-currency-item ${isActive ? 'is-active' : ''}`}
              >
                <span className="oxlyn-currency-item-code">{c}</span>
                {isActive && <Check size={16} className="oxlyn-currency-item-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CurrencySwitcher;

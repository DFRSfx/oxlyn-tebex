import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { API_URL } from '../config/api';

// Display currencies supported by the storefront. EUR is the canonical price
// on Tebex; the others are derived from EUR via FX rates. Keep this in sync
// with the regional pricing configured in the Tebex dashboard.
export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'CAD'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

interface CurrencyMeta {
  code: Currency;
  symbol: string;
  // Conventional symbol position. CAD reads more naturally as "C$30.53" than
  // "$30.53" since it disambiguates from USD, so we render the prefix label.
  label: string;
  // Locale used for Intl number formatting. Drives thousands separator,
  // decimal mark, and group placement (e.g. EUR uses comma, USD uses dot).
  locale: string;
}

export const CURRENCY_META: Record<Currency, CurrencyMeta> = {
  EUR: { code: 'EUR', symbol: '€',  label: '€',  locale: 'de-DE' },
  USD: { code: 'USD', symbol: '$',  label: '$',  locale: 'en-US' },
  GBP: { code: 'GBP', symbol: '£',  label: '£',  locale: 'en-GB' },
  CAD: { code: 'CAD', symbol: '$',  label: 'C$', locale: 'en-CA' },
};

// Fallback FX rates derived from the Tebex regional pricing configuration —
// kept here too so the UI never shows nonsensical prices when the server is
// unreachable on first paint. Server returns live rates from open.er-api.com.
const FALLBACK_RATES: Record<Currency, number> = {
  EUR: 1,
  USD: 1.166,
  GBP: 0.867,
  CAD: 1.608,
};

const STORAGE_CURRENCY = 'oxlyn_currency';
const STORAGE_RATES = 'oxlyn_currency_rates';
const RATES_TTL_MS = 24 * 60 * 60 * 1000;

interface StoredRates {
  fetchedAt: number;
  rates: Record<Currency, number>;
}

function isSupported(c: unknown): c is Currency {
  return typeof c === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(c);
}

function loadStoredRates(): StoredRates | null {
  try {
    const raw = localStorage.getItem(STORAGE_RATES);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRates;
    if (!parsed?.rates || typeof parsed.fetchedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: Record<Currency, number>;
  /** Converts an EUR price into the active currency (raw number, no formatting). */
  convert: (eurPrice: number) => number;
  /** Formats an EUR price as a localized string in the active currency. */
  format: (eurPrice: number) => string;
  /** True once the active currency has been resolved (from storage or geo-IP). */
  isReady: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
};

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Seed currency synchronously from localStorage so the very first paint
  // doesn't flash EUR → USD when the user has already chosen a non-default.
  const [currency, setCurrencyState] = useState<Currency>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CURRENCY);
      if (isSupported(stored)) return stored;
    } catch { /* ignore */ }
    return 'EUR';
  });
  const [hasUserChoice, setHasUserChoice] = useState<boolean>(() => {
    try {
      return isSupported(localStorage.getItem(STORAGE_CURRENCY));
    } catch {
      return false;
    }
  });
  const [rates, setRates] = useState<Record<Currency, number>>(() => {
    const stored = loadStoredRates();
    if (stored && Date.now() - stored.fetchedAt < RATES_TTL_MS) return stored.rates;
    return FALLBACK_RATES;
  });
  const [isReady, setIsReady] = useState(false);

  // Geo-IP seed — only runs if the user has never explicitly picked. After
  // the first pick, their choice always wins on subsequent visits.
  useEffect(() => {
    let cancelled = false;
    const seedFromGeo = async () => {
      if (hasUserChoice) {
        setIsReady(true);
        return;
      }
      try {
        const r = await fetch(`${API_URL}/currency/detect`, { credentials: 'include' });
        if (!r.ok) throw new Error(`detect failed: ${r.status}`);
        const data = (await r.json()) as { currency?: string };
        if (cancelled) return;
        if (isSupported(data.currency) && data.currency !== currency) {
          setCurrencyState(data.currency);
        }
      } catch {
        /* Stay on EUR — better than blocking the UI on a flaky upstream. */
      } finally {
        if (!cancelled) setIsReady(true);
      }
    };
    seedFromGeo();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh FX rates from the server (24h cache there too). Runs once on
  // mount — the storefront catalog re-renders cheaply enough that we don't
  // need to debounce or batch.
  useEffect(() => {
    let cancelled = false;
    const stored = loadStoredRates();
    if (stored && Date.now() - stored.fetchedAt < RATES_TTL_MS) {
      // Local cache is still fresh — skip the network round-trip.
      return;
    }
    const fetchRates = async () => {
      try {
        const r = await fetch(`${API_URL}/currency/rates`);
        if (!r.ok) throw new Error(`rates failed: ${r.status}`);
        const data = (await r.json()) as { rates?: Record<string, number> };
        if (cancelled || !data?.rates) return;
        const next: Record<Currency, number> = { EUR: 1, USD: 1, GBP: 1, CAD: 1 };
        for (const c of SUPPORTED_CURRENCIES) {
          const v = data.rates[c];
          next[c] = typeof v === 'number' && v > 0 ? v : FALLBACK_RATES[c];
        }
        setRates(next);
        try {
          localStorage.setItem(STORAGE_RATES, JSON.stringify({ fetchedAt: Date.now(), rates: next }));
        } catch { /* quota — ignore */ }
      } catch {
        /* Keep showing fallback / cached rates. */
      }
    };
    fetchRates();
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    if (!isSupported(c)) return;
    setCurrencyState(c);
    setHasUserChoice(true);
    try {
      localStorage.setItem(STORAGE_CURRENCY, c);
    } catch { /* ignore */ }
  }, []);

  const convert = useCallback(
    (eurPrice: number) => {
      const rate = rates[currency] ?? 1;
      return eurPrice * rate;
    },
    [rates, currency]
  );

  const format = useCallback(
    (eurPrice: number) => {
      const meta = CURRENCY_META[currency];
      const converted = convert(eurPrice);
      const formatted = new Intl.NumberFormat(meta.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(converted);
      return `${meta.label}${formatted}`;
    },
    [convert, currency]
  );

  const value = useMemo<CurrencyContextType>(
    () => ({ currency, setCurrency, rates, convert, format, isReady }),
    [currency, setCurrency, rates, convert, format, isReady]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

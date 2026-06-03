import { Router, Request, Response } from 'express';

const router = Router();

// Supported display currencies. EUR is the canonical price on Tebex; everything
// else is derived via FX. Keep this list in sync with the client picker and
// with the Tebex regional pricing configured in the dashboard.
const SUPPORTED = ['EUR', 'USD', 'GBP', 'CAD'] as const;
type Currency = (typeof SUPPORTED)[number];

// Country → currency map. Anything not listed falls back to EUR (the store's
// canonical currency). Keys are ISO 3166-1 alpha-2 country codes.
const COUNTRY_TO_CURRENCY: Record<string, Currency> = {
  US: 'USD',
  GB: 'GBP',
  CA: 'CAD',
};

// Fallback rates derived from the configured Tebex regional pricing
// (EUR 18.99 → USD 22.14, GBP 16.46, CAD 30.53). Used when the upstream FX
// API is unreachable so the catalog never shows broken prices.
const FALLBACK_RATES: Record<Currency, number> = {
  EUR: 1,
  USD: 1.166,
  GBP: 0.867,
  CAD: 1.608,
};

// In-process cache for FX rates. Refreshed at most once per day to stay well
// within open.er-api.com's free-tier limits and to keep the catalog cheap.
const RATES_TTL_MS = 24 * 60 * 60 * 1000;
let ratesCache: { fetchedAt: number; rates: Record<Currency, number> } | null = null;

// In-process cache for geo-IP lookups. Mirrors the pattern in ipConnections.ts
// (ip-api.com free tier, ~45 req/min) so a noisy IP never hits upstream twice
// during the same boot.
const GEO_TTL_MS = 60 * 60 * 1000;
const geoCache = new Map<string, { fetchedAt: number; countryCode: string | null }>();
const GEO_CACHE_MAX = 5000;

function resolveIp(req: Request): string {
  return (
    req.ip ||
    (req.headers['x-forwarded-for']?.toString().split(',')[0].trim()) ||
    req.socket.remoteAddress ||
    ''
  );
}

function isPrivate(ip: string): boolean {
  return (
    !ip ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('169.254.')
  );
}

async function lookupCountry(ip: string): Promise<string | null> {
  if (isPrivate(ip)) return null;
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.fetchedAt < GEO_TTL_MS) {
    return cached.countryCode;
  }
  try {
    const r = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!r.ok) return setGeo(ip, null);
    const data = (await r.json()) as { status: string; countryCode?: string };
    if (data.status !== 'success' || !data.countryCode) return setGeo(ip, null);
    return setGeo(ip, data.countryCode);
  } catch {
    return setGeo(ip, null);
  }
}

function setGeo(ip: string, code: string | null): string | null {
  if (geoCache.size >= GEO_CACHE_MAX) {
    const oldest = geoCache.keys().next().value;
    if (oldest !== undefined) geoCache.delete(oldest);
  }
  geoCache.set(ip, { fetchedAt: Date.now(), countryCode: code });
  return code;
}

async function fetchLiveRates(): Promise<Record<Currency, number> | null> {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/EUR', {
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { result?: string; rates?: Record<string, number> };
    if (data.result !== 'success' || !data.rates) return null;
    const out: Record<Currency, number> = { EUR: 1, USD: 1, GBP: 1, CAD: 1 };
    for (const c of SUPPORTED) {
      const v = data.rates[c];
      if (typeof v === 'number' && v > 0 && Number.isFinite(v)) out[c] = v;
      else out[c] = FALLBACK_RATES[c];
    }
    return out;
  } catch {
    return null;
  }
}

async function getRates(): Promise<{ rates: Record<Currency, number>; source: 'live' | 'cache' | 'fallback' }> {
  if (ratesCache && Date.now() - ratesCache.fetchedAt < RATES_TTL_MS) {
    return { rates: ratesCache.rates, source: 'cache' };
  }
  const live = await fetchLiveRates();
  if (live) {
    ratesCache = { fetchedAt: Date.now(), rates: live };
    return { rates: live, source: 'live' };
  }
  // Keep the stale entry serving rather than silently degrading.
  if (ratesCache) return { rates: ratesCache.rates, source: 'cache' };
  return { rates: FALLBACK_RATES, source: 'fallback' };
}

// Public — returns the visitor's suggested currency based on their IP.
// Client may override and persist locally; this is only a default seed.
router.get('/currency/detect', async (req: Request, res: Response) => {
  try {
    const ip = resolveIp(req);
    const country = await lookupCountry(ip);
    const currency: Currency = (country && COUNTRY_TO_CURRENCY[country]) || 'EUR';
    res.json({ countryCode: country, currency });
  } catch {
    res.json({ countryCode: null, currency: 'EUR' as Currency });
  }
});

// Public — returns FX rates with EUR as base. Cached for 24h server-side.
router.get('/currency/rates', async (_req: Request, res: Response) => {
  try {
    const { rates, source } = await getRates();
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ base: 'EUR', rates, source });
  } catch {
    res.json({ base: 'EUR', rates: FALLBACK_RATES, source: 'fallback' });
  }
});

export default router;

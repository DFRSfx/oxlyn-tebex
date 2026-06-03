import { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

const TEBEX_API_BASE = 'https://headless.tebex.io/api';
const TEBEX_TOKEN = process.env.TEBEX_PUBLIC_TOKEN;

if (!TEBEX_TOKEN) {
  console.error('❌ TEBEX_PUBLIC_TOKEN is not set in environment.');
}

// Validation helpers. Tebex generates basket idents server-side; format varies
// (32-char hex, UUID with hyphens, sometimes longer). Allow common URL-safe
// characters while still blocking path traversal (`/`, `..`) and protocol
// smuggling (`:`, `?`, `#`, whitespace, etc.).
const BASKET_IDENT_RE = /^[A-Za-z0-9_-]{1,128}$/;
const COUPON_CODE_RE = /^[A-Za-z0-9_\-]{1,64}$/;

function isValidIdent(ident: unknown): ident is string {
  if (typeof ident !== 'string') return false;
  if (!BASKET_IDENT_RE.test(ident)) {
    console.warn('Tebex proxy: rejected basket ident:', JSON.stringify(ident).slice(0, 200));
    return false;
  }
  return true;
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0 && n < 1e9;
}

function isValidCoupon(code: unknown): code is string {
  return typeof code === 'string' && COUPON_CODE_RE.test(code);
}

function handleAxiosError(err: unknown, res: Response, fallback: string) {
  const ax = err as AxiosError;
  if (ax?.response) {
    return res.status(ax.response.status).json(ax.response.data ?? { error: fallback });
  }
  console.error(`Tebex proxy error: ${fallback}`, ax?.message ?? err);
  return res.status(502).json({ error: fallback });
}

function ensureToken(res: Response): boolean {
  if (!TEBEX_TOKEN) {
    res.status(500).json({ error: 'Tebex not configured on server' });
    return false;
  }
  return true;
}

export const tebexController = {
  async createBasket(req: Request, res: Response) {
    if (!ensureToken(res)) return;
    try {
      const body = req.body ?? {};
      const payload: Record<string, any> = {
        complete_auto_redirect: typeof body.complete_auto_redirect === 'boolean' ? body.complete_auto_redirect : true,
      };
      if (typeof body.complete_url === 'string' && body.complete_url.length < 2048) {
        payload.complete_url = body.complete_url;
      }
      if (typeof body.cancel_url === 'string' && body.cancel_url.length < 2048) {
        payload.cancel_url = body.cancel_url;
      }
      if (body.custom && typeof body.custom === 'object' && !Array.isArray(body.custom)) {
        payload.custom = body.custom;
      }

      const response = await axios.post(
        `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/baskets`,
        payload,
        { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
      );
      res.status(200).json(response.data);
    } catch (err) {
      handleAxiosError(err, res, 'Failed to create basket');
    }
  },

  async getBasket(req: Request, res: Response) {
    if (!ensureToken(res)) return;
    const { ident } = req.params;
    if (!isValidIdent(ident)) {
      return res.status(400).json({ error: 'Invalid basket ident' });
    }
    try {
      const response = await axios.get(
        `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/baskets/${ident}`,
        { timeout: 10000 }
      );
      res.status(200).json(response.data);
    } catch (err) {
      handleAxiosError(err, res, 'Failed to fetch basket');
    }
  },

  async getAuthUrl(req: Request, res: Response) {
    if (!ensureToken(res)) return;
    const { ident } = req.params;
    const returnUrl = typeof req.query.returnUrl === 'string' ? req.query.returnUrl : '';
    if (!isValidIdent(ident)) {
      return res.status(400).json({ error: 'Invalid basket ident' });
    }
    if (!returnUrl || returnUrl.length > 2048) {
      return res.status(400).json({ error: 'Invalid returnUrl' });
    }
    try {
      const url = `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/baskets/${ident}/auth?returnUrl=${encodeURIComponent(returnUrl)}`;
      const response = await axios.get(url, { timeout: 10000 });
      res.status(200).json(response.data);
    } catch (err) {
      handleAxiosError(err, res, 'Failed to fetch auth URL');
    }
  },

  async addPackage(req: Request, res: Response) {
    if (!ensureToken(res)) return;
    const { ident } = req.params;
    const { package_id, quantity, discord_id } = req.body ?? {};
    if (!isValidIdent(ident)) {
      return res.status(400).json({ error: 'Invalid basket ident' });
    }
    if (!isPositiveInt(package_id)) {
      return res.status(400).json({ error: 'Invalid package_id' });
    }
    const qty = isPositiveInt(quantity) ? Math.min(quantity, 100) : 1;
    const url = `${TEBEX_API_BASE}/baskets/${ident}/packages`;
    const opts = { timeout: 10000, headers: { 'Content-Type': 'application/json' } };
    // Some packages declare a required `discord_id` option (e.g. the install
    // add-on "Oxlyn Installation"). Tebex rejects the add with a 400 "invalid
    // option" unless it's supplied as variable_data. Forward it when present;
    // packages without the option simply don't receive it.
    const body: Record<string, unknown> = { package_id, quantity: qty };
    const cleanDiscordId =
      typeof discord_id === 'string' && /^[0-9]{5,32}$/.test(discord_id.trim())
        ? discord_id.trim()
        : '';
    if (cleanDiscordId) body.variable_data = { discord_id: cleanDiscordId };
    try {
      const response = await axios.post(url, body, opts);
      res.status(200).json(response.data ?? { ok: true });
    } catch (err) {
      handleAxiosError(err, res, 'Failed to add package');
    }
  },

  async removePackage(req: Request, res: Response) {
    if (!ensureToken(res)) return;
    const { ident } = req.params;
    const { package_id } = req.body ?? {};
    if (!isValidIdent(ident)) {
      return res.status(400).json({ error: 'Invalid basket ident' });
    }
    if (!isPositiveInt(package_id)) {
      return res.status(400).json({ error: 'Invalid package_id' });
    }
    try {
      const response = await axios.post(
        `${TEBEX_API_BASE}/baskets/${ident}/packages/remove`,
        { package_id },
        { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
      );
      res.status(200).json(response.data ?? { ok: true });
    } catch (err) {
      handleAxiosError(err, res, 'Failed to remove package');
    }
  },

  async applyCoupon(req: Request, res: Response) {
    if (!ensureToken(res)) return;
    const { ident } = req.params;
    const { coupon_code } = req.body ?? {};
    if (!isValidIdent(ident)) {
      return res.status(400).json({ error: 'Invalid basket ident' });
    }
    if (!isValidCoupon(coupon_code)) {
      return res.status(400).json({ error: 'Invalid coupon_code' });
    }
    try {
      const response = await axios.post(
        `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/baskets/${ident}/coupons`,
        { coupon_code },
        { timeout: 10000, headers: { 'Content-Type': 'application/json', Accept: '*/*' } }
      );
      res.status(200).json(response.data);
    } catch (err) {
      handleAxiosError(err, res, 'Failed to apply coupon');
    }
  },

  async removeCoupon(req: Request, res: Response) {
    if (!ensureToken(res)) return;
    const { ident } = req.params;
    const { coupon_code } = req.body ?? {};
    if (!isValidIdent(ident)) {
      return res.status(400).json({ error: 'Invalid basket ident' });
    }
    if (!isValidCoupon(coupon_code)) {
      return res.status(400).json({ error: 'Invalid coupon_code' });
    }
    try {
      const response = await axios.post(
        `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/baskets/${ident}/coupons/remove`,
        { coupon_code },
        { timeout: 10000, headers: { 'Content-Type': 'application/json', Accept: '*/*' } }
      );
      res.status(200).json(response.data ?? { ok: true });
    } catch (err) {
      handleAxiosError(err, res, 'Failed to remove coupon');
    }
  },

  async listPackages(_req: Request, res: Response) {
    if (!ensureToken(res)) return;
    try {
      const response = await axios.get(
        `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/packages`,
        { timeout: 15000 }
      );
      res.status(200).json(response.data);
    } catch (err) {
      handleAxiosError(err, res, 'Failed to fetch packages');
    }
  },

  async listCategories(_req: Request, res: Response) {
    if (!ensureToken(res)) return;
    try {
      const response = await axios.get(
        `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/categories`,
        { timeout: 15000 }
      );
      res.status(200).json(response.data);
    } catch (err) {
      handleAxiosError(err, res, 'Failed to fetch categories');
    }
  },
};

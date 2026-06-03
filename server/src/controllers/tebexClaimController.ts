import { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

// Dedicated proxy for the secondary Tebex store used by the "Claim Scripts"
// flow on the My Downloads modal. Kept separate from the main /api/tebex/*
// proxy because they hit different stores with different tokens; mixing them
// would let the client influence which store gets queried.

const TEBEX_API_BASE = 'https://headless.tebex.io/api';
const TEBEX_TOKEN = process.env.TEBEX_CLAIM_TOKEN;

if (!TEBEX_TOKEN) {
  console.warn('⚠️  TEBEX_CLAIM_TOKEN not set — /api/tebex-claim/* will return 503.');
}

const BASKET_IDENT_RE = /^[A-Za-z0-9_-]{1,128}$/;

function isValidIdent(ident: unknown): ident is string {
  return typeof ident === 'string' && BASKET_IDENT_RE.test(ident);
}

function ensureToken(res: Response): boolean {
  if (!TEBEX_TOKEN) {
    res.status(503).json({ error: 'Tebex claim store not configured on server' });
    return false;
  }
  return true;
}

function handleAxiosError(err: unknown, res: Response, fallback: string) {
  const ax = err as AxiosError;
  if (ax?.response) {
    return res.status(ax.response.status).json(ax.response.data ?? { error: fallback });
  }
  console.error(`Tebex-claim proxy error: ${fallback}`, ax?.message ?? err);
  return res.status(502).json({ error: fallback });
}

export const tebexClaimController = {
  async listPackages(_req: Request, res: Response) {
    if (!ensureToken(res)) return;
    try {
      const response = await axios.get(
        `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/packages`,
        { timeout: 15000 }
      );
      res.status(200).json(response.data);
    } catch (err) {
      handleAxiosError(err, res, 'Failed to fetch claim packages');
    }
  },

  async createBasket(req: Request, res: Response) {
    if (!ensureToken(res)) return;
    try {
      const body = req.body ?? {};
      const payload: Record<string, any> = {
        complete_auto_redirect:
          typeof body.complete_auto_redirect === 'boolean'
            ? body.complete_auto_redirect
            : true,
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
      handleAxiosError(err, res, 'Failed to create claim basket');
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
      handleAxiosError(err, res, 'Failed to fetch claim auth URL');
    }
  },
};

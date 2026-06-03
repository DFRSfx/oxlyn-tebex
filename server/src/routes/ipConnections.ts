import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { pool } from '../config/database.js';

const router = Router();

// Treat re-hits from the same IP as the same visit if the previous hit
// landed within this window. F5 / fast navigation between pages collapses
// into a single row; a fresh visit ~10 min later opens a new row.
const IP_CONNECTION_WINDOW_MS = 10 * 60 * 1000;

interface GeoLookup {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  isp: string;
}

// In-process cache so repeat IPs within the same boot don't pound ip-api.com
// (free tier: 45 req/min). Entries are tiny — capacity is generous.
const geoCache = new Map<string, GeoLookup | null>();
const GEO_CACHE_MAX = 5000;

async function lookupGeo(ip: string): Promise<GeoLookup | null> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: 'Local', countryCode: 'LOC', region: '', city: 'localhost', isp: '' };
  }
  if (geoCache.has(ip)) return geoCache.get(ip) ?? null;

  try {
    // ip-api.com free tier is HTTP-only — fine here since we call server-side.
    // The `fields=` querystring keeps the payload tight and lets us miss-fast
    // on private/reserved ranges (status=fail).
    const r = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city,isp`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!r.ok) {
      cacheGeo(ip, null);
      return null;
    }
    const data = (await r.json()) as {
      status: string;
      country?: string;
      countryCode?: string;
      regionName?: string;
      city?: string;
      isp?: string;
    };
    if (data.status !== 'success') {
      cacheGeo(ip, null);
      return null;
    }
    const geo: GeoLookup = {
      country: data.country ?? '',
      countryCode: data.countryCode ?? '',
      region: data.regionName ?? '',
      city: data.city ?? '',
      isp: data.isp ?? '',
    };
    cacheGeo(ip, geo);
    return geo;
  } catch {
    cacheGeo(ip, null);
    return null;
  }
}

function cacheGeo(ip: string, value: GeoLookup | null) {
  if (geoCache.size >= GEO_CACHE_MAX) {
    // Cheap LRU: drop oldest insertion.
    const oldest = geoCache.keys().next().value;
    if (oldest !== undefined) geoCache.delete(oldest);
  }
  geoCache.set(ip, value);
}

function resolveIp(req: Request): string {
  // `trust proxy = 1` (set in index.ts) makes req.ip honour the first
  // X-Forwarded-For hop. Fall back to remoteAddress on direct hits.
  return (
    req.ip ||
    (req.headers['x-forwarded-for']?.toString().split(',')[0].trim()) ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

// Public — client calls this once per page session to register the visit.
// The dedupe logic lives here so we don't depend on the client to be honest
// about its session identity.
router.post('/ip-connection', async (req: Request, res: Response) => {
  try {
    const ip = resolveIp(req);
    if (!ip || ip === 'unknown') return res.status(204).end();

    const ua = (req.headers['user-agent'] || '').toString().slice(0, 500);

    // Most recent row for this IP — if its last_seen is within the dedupe
    // window we collapse into it; otherwise we open a fresh row.
    const [rows] = await pool.query(
      `SELECT id, last_seen_at
         FROM ip_connections
         WHERE ip_address = ?
         ORDER BY last_seen_at DESC
         LIMIT 1`,
      [ip]
    ) as [{ id: number; last_seen_at: Date }[], any];

    const latest = rows[0];
    const now = Date.now();
    const within = latest && now - new Date(latest.last_seen_at).getTime() < IP_CONNECTION_WINDOW_MS;

    if (within) {
      await pool.query(
        `UPDATE ip_connections
            SET visit_count = visit_count + 1,
                last_seen_at = CURRENT_TIMESTAMP,
                user_agent = ?
          WHERE id = ?`,
        [ua, latest.id]
      );
    } else {
      const geo = await lookupGeo(ip);
      await pool.query(
        `INSERT INTO ip_connections
           (ip_address, country, country_code, region, city, isp, user_agent, visit_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          ip,
          geo?.country ?? '',
          geo?.countryCode ?? '',
          geo?.region ?? '',
          geo?.city ?? '',
          geo?.isp ?? '',
          ua,
        ]
      );
    }
    res.status(204).end();
  } catch {
    res.status(204).end();
  }
});

// Admin — paginated list. Newest visits first. The admin page expects
// `{ items, total }` so it can drive a simple page counter.
router.get('/admin/ip-connections', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = Math.max(0, parseInt(String(req.query.page ?? '0'), 10) || 0);
    const pageSize = Math.min(200, Math.max(10, parseInt(String(req.query.pageSize ?? '50'), 10) || 50));
    const offset = page * pageSize;

    const search = String(req.query.search ?? '').trim();
    const where: string[] = [];
    const params: any[] = [];
    if (search) {
      where.push('(ip_address LIKE ? OR country LIKE ? OR city LIKE ? OR isp LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT id, ip_address, country, country_code, region, city, isp, user_agent,
              visit_count, first_seen_at, last_seen_at
         FROM ip_connections
         ${whereSql}
         ORDER BY last_seen_at DESC
         LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    ) as [any[], any];

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM ip_connections ${whereSql}`,
      params
    ) as [{ total: number }[], any];

    res.json({
      items: rows.map((r) => ({
        id: r.id,
        ipAddress: r.ip_address,
        country: r.country,
        countryCode: r.country_code,
        region: r.region,
        city: r.city,
        isp: r.isp,
        userAgent: r.user_agent,
        visitCount: r.visit_count,
        firstSeenAt: r.first_seen_at,
        lastSeenAt: r.last_seen_at,
      })),
      total: countRows[0]?.total ?? 0,
      page,
      pageSize,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch IP connections' });
  }
});

router.delete('/admin/ip-connections/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    await pool.query('DELETE FROM ip_connections WHERE id = ?', [id]);
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

router.delete('/admin/ip-connections', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM ip_connections');
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Failed to clear' });
  }
});

export default router;

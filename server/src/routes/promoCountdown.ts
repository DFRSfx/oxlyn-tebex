import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { pool } from '../config/database.js';

const router = Router();

interface PromoCountdownRow {
  end_at: Date;
  code: string;
  title: string;
  subtitle: string;
  enabled: number | boolean;
}

// Serializes a DB row into the public-facing JSON shape. `endAt` is an ISO
// string so the client can `new Date(endAt).getTime()` without timezone
// ambiguity, and every visitor counts down to the same absolute instant.
function serialize(row: PromoCountdownRow) {
  return {
    endAt: new Date(row.end_at).toISOString(),
    code: row.code,
    title: row.title,
    subtitle: row.subtitle,
    enabled: Boolean(row.enabled),
  };
}

router.get('/promo-countdown', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      'SELECT end_at, code, title, subtitle, enabled FROM promo_countdown WHERE id = 1'
    ) as [PromoCountdownRow[], any];

    if (!rows.length) {
      return res.json({
        endAt: new Date(Date.now() + 361810 * 1000).toISOString(),
        code: 'OXLYN-10',
        title: 'Discount Started',
        subtitle: 'The 10% discount is now valid on all scripts.',
        enabled: true,
      });
    }
    res.json(serialize(rows[0]));
  } catch {
    res.status(500).json({ error: 'Failed to fetch promo countdown' });
  }
});

router.put('/admin/promo-countdown', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { endAt, code, title, subtitle, enabled } = req.body as {
      endAt?: string;
      code?: string;
      title?: string;
      subtitle?: string;
      enabled?: boolean;
    };

    // endAt must parse to a valid future-or-past instant; we don't reject
    // past timestamps because admin may want to deliberately expire the bar.
    let endAtDate: Date | null = null;
    if (endAt) {
      const parsed = new Date(endAt);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid endAt' });
      }
      endAtDate = parsed;
    }

    // Build a dynamic UPDATE so unspecified fields stay untouched. The row is
    // always seeded at boot (see database.ts), so we can rely on it existing.
    const updates: string[] = [];
    const values: any[] = [];
    if (endAtDate !== null) {
      updates.push('end_at = ?');
      values.push(endAtDate);
    }
    if (typeof code === 'string') {
      updates.push('code = ?');
      values.push(code.slice(0, 64));
    }
    if (typeof title === 'string') {
      updates.push('title = ?');
      values.push(title.slice(0, 160));
    }
    if (typeof subtitle === 'string') {
      updates.push('subtitle = ?');
      values.push(subtitle.slice(0, 255));
    }
    if (typeof enabled === 'boolean') {
      updates.push('enabled = ?');
      values.push(enabled ? 1 : 0);
    }

    if (updates.length) {
      await pool.query(
        `UPDATE promo_countdown SET ${updates.join(', ')} WHERE id = 1`,
        values
      );
    }

    const [rows] = await pool.query(
      'SELECT end_at, code, title, subtitle, enabled FROM promo_countdown WHERE id = 1'
    ) as [PromoCountdownRow[], any];

    res.json(serialize(rows[0]));
  } catch {
    res.status(500).json({ error: 'Failed to update promo countdown' });
  }
});

export default router;

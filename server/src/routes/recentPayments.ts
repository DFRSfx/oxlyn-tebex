import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { pool } from '../config/database.js';

const router = Router();

interface RecentPaymentRow {
  id: number;
  buyer_name: string;
  avatar_filename: string;
  amount: string | number;
  minutes_ago: number;
  display_order: number;
  enabled: number | boolean;
}

function serialize(row: RecentPaymentRow) {
  return {
    id: row.id,
    buyerName: row.buyer_name,
    avatarFilename: row.avatar_filename,
    amount: Number(row.amount),
    minutesAgo: row.minutes_ago,
    displayOrder: row.display_order,
    enabled: Boolean(row.enabled),
  };
}

// Public — globally-synced "live feed" of recent purchases.
//
// Behaviour:
//   • Pool is rotated by a 10-minute UTC tick so every visitor sees the
//     same names/amounts at any given wall-clock moment.
//   • `minutesAgo` is computed cumulatively per position: each visible
//     card sits 19–98 minutes behind the previous one (deterministic per
//     buyer+cycle). The top of the list is a few minutes ago; the bottom
//     reaches a few hours back — purposely irregular so the carousel never
//     looks like a metronome.
const CYCLE_MS = 10 * 60 * 1000;
const VISIBLE_COUNT = 10;
const GAP_MIN = 19; // smallest gap between adjacent payments
const GAP_MAX = 98; // largest gap

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

router.get('/recent-payments', async (_req: Request, res: Response) => {
  try {
    const [rowsRaw] = await pool.query(
      `SELECT id, buyer_name, avatar_filename, amount, minutes_ago, display_order, enabled
         FROM recent_payments
         WHERE enabled = TRUE
         ORDER BY display_order ASC, id ASC`
    ) as [RecentPaymentRow[], any];
    const rows = rowsRaw as RecentPaymentRow[];
    if (rows.length === 0) return res.json([]);

    const cycleIndex = Math.floor(Date.now() / CYCLE_MS);
    const start = cycleIndex % rows.length;
    const rotated = [...rows.slice(start), ...rows.slice(0, start)];

    // Walk the visible window and accumulate a minutesAgo offset for each
    // position. The first card is 1–9 min ago; every subsequent card adds
    // a deterministic 19–98 min gap.
    let cumulative = 1 + (djb2(`first-${cycleIndex}`) % 9);
    const visible = rotated.slice(0, VISIBLE_COUNT).map((row, i) => {
      if (i > 0) {
        const gap = GAP_MIN + (djb2(`${row.id}-${cycleIndex}-gap`) % (GAP_MAX - GAP_MIN + 1));
        cumulative += gap;
      }
      return {
        id: row.id,
        buyerName: row.buyer_name,
        avatarFilename: row.avatar_filename,
        amount: Number(row.amount),
        minutesAgo: cumulative,
        displayOrder: row.display_order,
        enabled: Boolean(row.enabled),
      };
    });

    res.json(visible);
  } catch {
    res.status(500).json({ error: 'Failed to fetch recent payments' });
  }
});

// Admin: full list (incl. disabled), used to build the admin editor.
router.get('/admin/recent-payments', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, buyer_name, avatar_filename, amount, minutes_ago, display_order, enabled
         FROM recent_payments
         ORDER BY display_order ASC, id ASC`
    ) as [RecentPaymentRow[], any];
    res.json(rows.map(serialize));
  } catch {
    res.status(500).json({ error: 'Failed to fetch recent payments' });
  }
});

// Admin: bulk replace. Accepts the full list and re-syncs the table — adds
// new rows, updates existing ones, deletes the missing ones. Display order
// is taken from the array index so admins can reorder by drag-and-drop.
router.put('/admin/recent-payments', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { payments } = req.body as {
      payments?: Array<{
        id?: number;
        buyerName?: string;
        avatarFilename?: string;
        amount?: number;
        minutesAgo?: number;
        enabled?: boolean;
      }>;
    };

    if (!Array.isArray(payments)) {
      return res.status(400).json({ error: 'payments must be an array' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const keepIds: number[] = [];
      for (let i = 0; i < payments.length; i++) {
        const p = payments[i];
        const buyerName = (p.buyerName ?? '').slice(0, 80).trim();
        const avatar = (p.avatarFilename ?? '').slice(0, 255).trim();
        const amount = Math.max(0, Math.min(99999, Number(p.amount ?? 0)));
        const minutesAgo = Math.max(1, Math.min(120, Math.floor(Number(p.minutesAgo ?? 5))));
        const enabled = p.enabled === false ? 0 : 1;
        const order = i * 10;

        // Only the buyer name is required. An EMPTY avatar is valid — it
        // renders the generative coloured letter-avatar (initial on a colour)
        // on the storefront. Previously this also required `avatar`, so any
        // no-image row was skipped here and then wiped by the "delete missing"
        // step below — that's why saving deleted every image-less payment.
        if (!buyerName) continue;

        if (p.id) {
          await conn.query(
            `UPDATE recent_payments
                SET buyer_name = ?, avatar_filename = ?, amount = ?, minutes_ago = ?, display_order = ?, enabled = ?
              WHERE id = ?`,
            [buyerName, avatar, amount, minutesAgo, order, enabled, p.id]
          );
          keepIds.push(p.id);
        } else {
          const [result] = await conn.query(
            `INSERT INTO recent_payments (buyer_name, avatar_filename, amount, minutes_ago, display_order, enabled)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [buyerName, avatar, amount, minutesAgo, order, enabled]
          ) as [{ insertId: number }, any];
          keepIds.push(result.insertId);
        }
      }

      if (keepIds.length) {
        await conn.query(
          `DELETE FROM recent_payments WHERE id NOT IN (${keepIds.map(() => '?').join(',')})`,
          keepIds
        );
      } else {
        await conn.query('DELETE FROM recent_payments');
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const [rows] = await pool.query(
      `SELECT id, buyer_name, avatar_filename, amount, minutes_ago, display_order, enabled
         FROM recent_payments
         ORDER BY display_order ASC, id ASC`
    ) as [RecentPaymentRow[], any];
    res.json(rows.map(serialize));
  } catch {
    res.status(500).json({ error: 'Failed to update recent payments' });
  }
});

export default router;

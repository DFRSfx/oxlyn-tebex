import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { pool } from '../config/database.js';

const router = Router();

interface TopSellerRow {
  id: number;
  tebex_package_id: number;
  display_order: number;
  enabled: number | boolean;
}

function serialize(row: TopSellerRow) {
  return {
    id: row.id,
    tebexPackageId: row.tebex_package_id,
    displayOrder: row.display_order,
    enabled: Boolean(row.enabled),
  };
}

// Public — list of admin-curated Tebex package IDs to feature in the
// "Top Scripts" carousel on the landing page. The client resolves each ID
// against its loaded catalog and renders a <PackageCard> per item, in the
// display order returned here.
router.get('/top-sellers', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, tebex_package_id, display_order, enabled
         FROM top_sellers
         WHERE enabled = TRUE
         ORDER BY display_order ASC, id ASC`
    ) as [TopSellerRow[], any];
    res.json(rows.map(serialize));
  } catch {
    res.status(500).json({ error: 'Failed to fetch top sellers' });
  }
});

// Admin: full list (including disabled rows), used by the admin editor.
router.get('/admin/top-sellers', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, tebex_package_id, display_order, enabled
         FROM top_sellers
         ORDER BY display_order ASC, id ASC`
    ) as [TopSellerRow[], any];
    res.json(rows.map(serialize));
  } catch {
    res.status(500).json({ error: 'Failed to fetch top sellers' });
  }
});

// Admin: bulk replace. The display order is taken from the array index so
// the admin can drag-and-drop to reorder. Items missing a tebexPackageId are
// silently skipped; duplicates are deduped (first wins).
router.put('/admin/top-sellers', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { items } = req.body as {
      items?: Array<{
        id?: number;
        tebexPackageId?: number;
        enabled?: boolean;
      }>;
    };

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const seen = new Set<number>();
      const keepIds: number[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const tebexId = Number(item.tebexPackageId);
        if (!Number.isFinite(tebexId) || tebexId <= 0) continue;
        if (seen.has(tebexId)) continue;
        seen.add(tebexId);

        const enabled = item.enabled === false ? 0 : 1;
        const order = i * 10;

        // Upsert keyed by tebex_package_id (UNIQUE). When the admin removes a
        // row and adds it back, this collapses the two ops into one.
        await conn.query(
          `INSERT INTO top_sellers (tebex_package_id, display_order, enabled)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE
             display_order = VALUES(display_order),
             enabled = VALUES(enabled)`,
          [tebexId, order, enabled]
        );

        const [rows] = await conn.query(
          `SELECT id FROM top_sellers WHERE tebex_package_id = ? LIMIT 1`,
          [tebexId]
        ) as [{ id: number }[], any];
        if (rows[0]?.id) keepIds.push(rows[0].id);
      }

      if (keepIds.length) {
        await conn.query(
          `DELETE FROM top_sellers WHERE id NOT IN (${keepIds.map(() => '?').join(',')})`,
          keepIds
        );
      } else {
        await conn.query('DELETE FROM top_sellers');
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const [rows] = await pool.query(
      `SELECT id, tebex_package_id, display_order, enabled
         FROM top_sellers
         ORDER BY display_order ASC, id ASC`
    ) as [TopSellerRow[], any];
    res.json(rows.map(serialize));
  } catch {
    res.status(500).json({ error: 'Failed to update top sellers' });
  }
});

export default router;

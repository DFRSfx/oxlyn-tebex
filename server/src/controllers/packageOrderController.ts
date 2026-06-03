import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { RowDataPacket } from 'mysql2';

interface PackageOrderRow extends RowDataPacket {
  id: number;
  tebex_package_id: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

function rowToOrder(r: PackageOrderRow) {
  return {
    id: r.id,
    tebexPackageId: r.tebex_package_id,
    displayOrder: r.display_order,
    updatedAt: r.updated_at,
  };
}

// Public — used by storefront to apply ordering
export async function listOrder(_req: Request, res: Response) {
  try {
    const [rows] = await pool.query<PackageOrderRow[]>(
      `SELECT * FROM package_order ORDER BY display_order ASC, id ASC`
    );
    res.json({ order: rows.map(rowToOrder) });
  } catch (error) {
    console.error('listOrder error:', error);
    res.status(500).json({ error: 'Failed to load order' });
  }
}

// Admin — bulk replace the entire ordering
// Body: { items: [{ tebexPackageId: number, displayOrder: number }, ...] }
export async function saveOrder(req: Request, res: Response) {
  const items = Array.isArray(req.body?.items) ? req.body.items : null;
  if (!items) {
    return res.status(400).json({ error: 'items array is required' });
  }

  // Sanitize
  const cleaned = items
    .map((it: any) => ({
      tebexPackageId: Number(it?.tebexPackageId),
      displayOrder: Number(it?.displayOrder),
    }))
    .filter(
      (it: { tebexPackageId: number; displayOrder: number }) =>
        Number.isFinite(it.tebexPackageId) &&
        it.tebexPackageId > 0 &&
        Number.isFinite(it.displayOrder)
    );

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Upsert each row — INSERT ON DUPLICATE KEY ensures we don't lose unrelated entries
    for (const it of cleaned) {
      await conn.query(
        `INSERT INTO package_order (tebex_package_id, display_order)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE display_order = VALUES(display_order)`,
        [it.tebexPackageId, it.displayOrder]
      );
    }

    await conn.commit();

    const [rows] = await conn.query<PackageOrderRow[]>(
      `SELECT * FROM package_order ORDER BY display_order ASC, id ASC`
    );
    res.json({ order: rows.map(rowToOrder) });
  } catch (error) {
    await conn.rollback();
    console.error('saveOrder error:', error);
    res.status(500).json({ error: 'Failed to save order' });
  } finally {
    conn.release();
  }
}

// Admin — wipe all custom ordering (revert to Tebex default order)
export async function resetOrder(_req: Request, res: Response) {
  try {
    await pool.query(`DELETE FROM package_order`);
    res.json({ ok: true });
  } catch (error) {
    console.error('resetOrder error:', error);
    res.status(500).json({ error: 'Failed to reset order' });
  }
}

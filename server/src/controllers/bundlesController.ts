import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { RowDataPacket } from 'mysql2';

interface BundleContentRow extends RowDataPacket {
  id: number;
  bundle_tebex_id: number;
  resource_tebex_id: number;
  resource_name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

function rowToContent(r: BundleContentRow) {
  return {
    id: r.id,
    bundleTebexId: r.bundle_tebex_id,
    resourceTebexId: r.resource_tebex_id,
    resourceName: r.resource_name,
    displayOrder: r.display_order,
    updatedAt: r.updated_at,
  };
}

// Public — storefront fetches all bundle->resources mappings in one go.
// Returned shape: { contents: [{ bundleTebexId, resourceTebexId, resourceName, displayOrder }, ...] }
export async function listAllBundleContents(_req: Request, res: Response) {
  try {
    const [rows] = await pool.query<BundleContentRow[]>(
      `SELECT * FROM bundle_contents ORDER BY bundle_tebex_id ASC, display_order ASC, id ASC`
    );
    res.json({ contents: rows.map(rowToContent) });
  } catch (error) {
    console.error('listAllBundleContents error:', error);
    res.status(500).json({ error: 'Failed to load bundle contents' });
  }
}

// Public — fetch resources composing a single bundle by its Tebex package id.
export async function getBundleContents(req: Request, res: Response) {
  try {
    const bundleId = Number(req.params.bundleId);
    if (!Number.isFinite(bundleId) || bundleId <= 0) {
      return res.status(400).json({ error: 'Invalid bundle id' });
    }
    const [rows] = await pool.query<BundleContentRow[]>(
      `SELECT * FROM bundle_contents WHERE bundle_tebex_id = ? ORDER BY display_order ASC, id ASC`,
      [bundleId]
    );
    res.json({ contents: rows.map(rowToContent) });
  } catch (error) {
    console.error('getBundleContents error:', error);
    res.status(500).json({ error: 'Failed to load bundle contents' });
  }
}

// Admin — replace the resource list for a single bundle in one shot.
// Body: { resources: [{ resourceTebexId: number, resourceName?: string }, ...] }
// The order of the array becomes display_order.
export async function saveBundleContents(req: Request, res: Response) {
  const bundleId = Number(req.params.bundleId);
  if (!Number.isFinite(bundleId) || bundleId <= 0) {
    return res.status(400).json({ error: 'Invalid bundle id' });
  }

  const resources = Array.isArray(req.body?.resources) ? req.body.resources : null;
  if (!resources) {
    return res.status(400).json({ error: 'resources array is required' });
  }

  const cleaned = resources
    .map((r: any, idx: number) => ({
      resourceTebexId: Number(r?.resourceTebexId),
      resourceName: String(r?.resourceName || '').trim().slice(0, 255),
      displayOrder: idx,
    }))
    .filter(
      (r: { resourceTebexId: number }) =>
        Number.isFinite(r.resourceTebexId) && r.resourceTebexId > 0
    );

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM bundle_contents WHERE bundle_tebex_id = ?`, [bundleId]);

    for (const r of cleaned) {
      await conn.query(
        `INSERT INTO bundle_contents (bundle_tebex_id, resource_tebex_id, resource_name, display_order)
         VALUES (?, ?, ?, ?)`,
        [bundleId, r.resourceTebexId, r.resourceName, r.displayOrder]
      );
    }

    await conn.commit();

    const [rows] = await conn.query<BundleContentRow[]>(
      `SELECT * FROM bundle_contents WHERE bundle_tebex_id = ? ORDER BY display_order ASC, id ASC`,
      [bundleId]
    );
    res.json({ contents: rows.map(rowToContent) });
  } catch (error) {
    await conn.rollback();
    console.error('saveBundleContents error:', error);
    res.status(500).json({ error: 'Failed to save bundle contents' });
  } finally {
    conn.release();
  }
}

// Admin — clear all resources for a bundle.
export async function clearBundleContents(req: Request, res: Response) {
  try {
    const bundleId = Number(req.params.bundleId);
    if (!Number.isFinite(bundleId) || bundleId <= 0) {
      return res.status(400).json({ error: 'Invalid bundle id' });
    }
    await pool.query(`DELETE FROM bundle_contents WHERE bundle_tebex_id = ?`, [bundleId]);
    res.json({ ok: true });
  } catch (error) {
    console.error('clearBundleContents error:', error);
    res.status(500).json({ error: 'Failed to clear bundle contents' });
  }
}

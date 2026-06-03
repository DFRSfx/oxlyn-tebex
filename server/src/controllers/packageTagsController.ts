import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface PackageTagRow extends RowDataPacket {
  id: number;
  package_keyword: string;
  label: string;
  variant: string;
  enabled: number; // 0/1 from MySQL BOOLEAN
  display_order: number;
  created_at: string;
  updated_at: string;
}

const VALID_VARIANTS = new Set([
  'orange',
  'red',
  'green',
  'blue',
  'purple',
  'amber',
  'pink',
]);

function normalizeKeyword(value: string): string {
  return String(value || '').trim().toLowerCase();
}

function sanitizeLabel(value: string): string {
  return String(value || '').trim().slice(0, 64);
}

function sanitizeVariant(value: string): string {
  const v = String(value || '').trim().toLowerCase();
  return VALID_VARIANTS.has(v) ? v : 'orange';
}

function rowToTag(r: PackageTagRow) {
  return {
    id: r.id,
    keyword: r.package_keyword,
    label: r.label,
    variant: r.variant,
    enabled: !!r.enabled,
    displayOrder: r.display_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Public: only enabled tags, used by storefront cards
export async function listEnabledTags(_req: Request, res: Response) {
  try {
    const [rows] = await pool.query<PackageTagRow[]>(
      `SELECT * FROM package_tags WHERE enabled = TRUE ORDER BY display_order ASC, id ASC`
    );
    res.json({ tags: rows.map(rowToTag) });
  } catch (error) {
    console.error('listEnabledTags error:', error);
    res.status(500).json({ error: 'Failed to load tags' });
  }
}

// Admin: all tags (enabled + disabled)
export async function listAllTags(_req: Request, res: Response) {
  try {
    const [rows] = await pool.query<PackageTagRow[]>(
      `SELECT * FROM package_tags ORDER BY display_order ASC, id ASC`
    );
    res.json({ tags: rows.map(rowToTag) });
  } catch (error) {
    console.error('listAllTags error:', error);
    res.status(500).json({ error: 'Failed to load tags' });
  }
}

export async function createTag(req: Request, res: Response) {
  try {
    const keyword = normalizeKeyword(req.body?.keyword);
    const label = sanitizeLabel(req.body?.label);
    const variant = sanitizeVariant(req.body?.variant);
    const enabled = req.body?.enabled === false ? false : true;
    const displayOrder = Number.isFinite(Number(req.body?.displayOrder))
      ? Number(req.body.displayOrder)
      : 0;

    if (!keyword || !label) {
      return res.status(400).json({ error: 'keyword and label are required' });
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO package_tags (package_keyword, label, variant, enabled, display_order)
       VALUES (?, ?, ?, ?, ?)`,
      [keyword, label, variant, enabled, displayOrder]
    );

    const [rows] = await pool.query<PackageTagRow[]>(
      `SELECT * FROM package_tags WHERE id = ?`,
      [result.insertId]
    );
    res.status(201).json({ tag: rowToTag(rows[0]) });
  } catch (error) {
    console.error('createTag error:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
}

export async function updateTag(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid tag id' });
    }

    const fields: string[] = [];
    const values: (string | number | boolean)[] = [];

    if (typeof req.body?.keyword === 'string') {
      fields.push('package_keyword = ?');
      values.push(normalizeKeyword(req.body.keyword));
    }
    if (typeof req.body?.label === 'string') {
      fields.push('label = ?');
      values.push(sanitizeLabel(req.body.label));
    }
    if (typeof req.body?.variant === 'string') {
      fields.push('variant = ?');
      values.push(sanitizeVariant(req.body.variant));
    }
    if (typeof req.body?.enabled === 'boolean') {
      fields.push('enabled = ?');
      values.push(req.body.enabled);
    }
    if (Number.isFinite(Number(req.body?.displayOrder))) {
      fields.push('display_order = ?');
      values.push(Number(req.body.displayOrder));
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    await pool.query(
      `UPDATE package_tags SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const [rows] = await pool.query<PackageTagRow[]>(
      `SELECT * FROM package_tags WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    res.json({ tag: rowToTag(rows[0]) });
  } catch (error) {
    console.error('updateTag error:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
}

export async function deleteTag(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid tag id' });
    }
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM package_tags WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('deleteTag error:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
}

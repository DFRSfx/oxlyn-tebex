import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface CategoryRow extends RowDataPacket {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface PackageCategoryRow extends RowDataPacket {
  category_id: number;
  tebex_package_id: number;
}

function slugify(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 160);
}

function rowToCategory(r: CategoryRow, packageIds: number[] = []) {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description ?? '',
    image: r.image ?? '',
    displayOrder: r.display_order,
    packageIds,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Returns a `Map<categoryId, number[]>` of assigned Tebex package ids,
 * for the given category ids. Avoids N+1 with a single grouped query.
 */
async function loadAssignmentsByCategory(
  ids: number[]
): Promise<Map<number, number[]>> {
  const result = new Map<number, number[]>();
  if (ids.length === 0) return result;
  const [rows] = await pool.query<PackageCategoryRow[]>(
    `SELECT category_id, tebex_package_id FROM package_categories WHERE category_id IN (?)`,
    [ids]
  );
  for (const id of ids) result.set(id, []);
  for (const r of rows) {
    const list = result.get(r.category_id);
    if (list) list.push(r.tebex_package_id);
  }
  return result;
}

// Public — used by the storefront /scripts page to render filter pills and
// match packages against custom categories. Returns categories with their
// assigned tebex package id list for client-side filtering.
export async function listPublicCategories(_req: Request, res: Response) {
  try {
    const [rows] = await pool.query<CategoryRow[]>(
      `SELECT * FROM categories ORDER BY display_order ASC, id ASC`
    );
    const ids = rows.map((r) => r.id);
    const assignments = await loadAssignmentsByCategory(ids);
    res.json({
      categories: rows.map((r) => rowToCategory(r, assignments.get(r.id) || [])),
    });
  } catch (error) {
    console.error('listPublicCategories error:', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
}

// Admin — same payload as public; kept separate so we can extend with
// admin-only fields (e.g. analytics) later without changing the public shape.
export async function listAdminCategories(_req: Request, res: Response) {
  try {
    const [rows] = await pool.query<CategoryRow[]>(
      `SELECT * FROM categories ORDER BY display_order ASC, id ASC`
    );
    const ids = rows.map((r) => r.id);
    const assignments = await loadAssignmentsByCategory(ids);
    res.json({
      categories: rows.map((r) => rowToCategory(r, assignments.get(r.id) || [])),
    });
  } catch (error) {
    console.error('listAdminCategories error:', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
}

export async function createCategory(req: Request, res: Response) {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 120);
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    const providedSlug = String(req.body?.slug || '').trim();
    const slug = providedSlug ? slugify(providedSlug) : slugify(name);
    if (!slug) {
      return res.status(400).json({ error: 'invalid slug' });
    }
    const description = req.body?.description != null ? String(req.body.description).trim() : null;
    const image = req.body?.image != null ? String(req.body.image).trim() : null;
    const displayOrder = Number.isFinite(Number(req.body?.displayOrder))
      ? Number(req.body.displayOrder)
      : 0;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO categories (name, slug, description, image, display_order)
       VALUES (?, ?, ?, ?, ?)`,
      [name, slug, description, image, displayOrder]
    );

    const [rows] = await pool.query<CategoryRow[]>(
      `SELECT * FROM categories WHERE id = ?`,
      [result.insertId]
    );
    res.status(201).json({ category: rowToCategory(rows[0], []) });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A category with this slug already exists' });
    }
    console.error('createCategory error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
}

export async function updateCategory(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid category id' });
    }

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (typeof req.body?.name === 'string') {
      const name = req.body.name.trim().slice(0, 120);
      if (!name) return res.status(400).json({ error: 'name cannot be empty' });
      fields.push('name = ?');
      values.push(name);
    }
    if (typeof req.body?.slug === 'string') {
      const slug = slugify(req.body.slug);
      if (!slug) return res.status(400).json({ error: 'invalid slug' });
      fields.push('slug = ?');
      values.push(slug);
    }
    if ('description' in (req.body || {})) {
      const desc = req.body.description == null ? null : String(req.body.description).trim();
      fields.push('description = ?');
      values.push(desc);
    }
    if ('image' in (req.body || {})) {
      const img = req.body.image == null ? null : String(req.body.image).trim();
      fields.push('image = ?');
      values.push(img);
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
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const [rows] = await pool.query<CategoryRow[]>(
      `SELECT * FROM categories WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    const assignments = await loadAssignmentsByCategory([id]);
    res.json({ category: rowToCategory(rows[0], assignments.get(id) || []) });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A category with this slug already exists' });
    }
    console.error('updateCategory error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
}

export async function deleteCategory(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid category id' });
    }
    // FK cascade drops package_categories rows automatically.
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM categories WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('deleteCategory error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
}

// Replaces the entire package set for a category atomically — cleaner than
// add/remove endpoints when the admin is editing in a multi-select UI.
export async function setCategoryPackages(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid category id' });
  }

  const raw = Array.isArray(req.body?.packageIds) ? req.body.packageIds : null;
  if (!raw) {
    return res.status(400).json({ error: 'packageIds must be an array of numbers' });
  }
  const packageIds = Array.from(
    new Set(
      raw
        .map((v: unknown) => Number(v))
        .filter((n: number) => Number.isFinite(n) && n > 0)
    )
  );

  // Confirm category exists before mutating.
  const [exists] = await pool.query<CategoryRow[]>(
    `SELECT id FROM categories WHERE id = ?`,
    [id]
  );
  if (exists.length === 0) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM package_categories WHERE category_id = ?`, [id]);
    if (packageIds.length > 0) {
      const placeholders = packageIds.map(() => '(?, ?)').join(', ');
      const flat: number[] = [];
      for (const pid of packageIds) flat.push(id, pid);
      await conn.query(
        `INSERT INTO package_categories (category_id, tebex_package_id) VALUES ${placeholders}`,
        flat
      );
    }
    await conn.commit();
    res.json({ ok: true, categoryId: id, packageIds });
  } catch (error) {
    await conn.rollback();
    console.error('setCategoryPackages error:', error);
    res.status(500).json({ error: 'Failed to update category packages' });
  } finally {
    conn.release();
  }
}

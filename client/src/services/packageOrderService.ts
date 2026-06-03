import { API_URL } from '../config/api';
import { Package } from '../types';
import { getAuthHeaders } from '../utils/authFetch';

export interface PackageOrderEntry {
  id: number;
  tebexPackageId: number;
  displayOrder: number;
  updatedAt?: string;
}

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error) msg = err.error;
    } catch {/* ignore */}
    throw new Error(msg);
  }
  return res.json();
}

export const packageOrderService = {
  /** Public — used by storefront to apply ordering. */
  async fetch(): Promise<PackageOrderEntry[]> {
    try {
      const res = await fetch(`${API_URL}/package-order`, { credentials: 'include' });
      const data = await jsonOrThrow(res);
      return Array.isArray(data?.order) ? data.order : [];
    } catch (error) {
      console.warn('[order] fetch failed:', error);
      return [];
    }
  },

  /** Admin — bulk save the entire ordering. */
  async save(items: { tebexPackageId: number; displayOrder: number }[]): Promise<PackageOrderEntry[]> {
    const res = await fetch(`${API_URL}/admin/package-order`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ items }),
    });
    const data = await jsonOrThrow(res);
    return Array.isArray(data?.order) ? data.order : [];
  },

  /** Admin — wipe custom ordering, revert to Tebex default. */
  async reset(): Promise<void> {
    const res = await fetch(`${API_URL}/admin/package-order`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { ...getAuthHeaders() },
    });
    await jsonOrThrow(res);
  },
};

/**
 * Sort packages so the newest Tebex packages appear FIRST automatically.
 * Tebex assigns auto-incrementing IDs, so a higher tebexPackageId == more recent.
 * This is the default ordering when there are no admin overrides.
 */
export function sortByNewestFirst(packages: Package[]): Package[] {
  return [...packages].sort((a, b) => {
    const aId = a.tebexPackageId ?? 0;
    const bId = b.tebexPackageId ?? 0;
    return bId - aId; // DESC: higher id (newer) first
  });
}

/**
 * Apply ordering rules:
 *   1. Packages with admin overrides go first, sorted by displayOrder ASC (lower = earlier).
 *   2. Packages WITHOUT overrides fall back to "newest first" (by Tebex id DESC).
 *
 * This means: when a new package is created on Tebex, it automatically gets the
 * highest id and bubbles to the top of unpinned packages — no admin action needed.
 */
export function applyPackageOrder(
  packages: Package[],
  orderEntries: PackageOrderEntry[]
): Package[] {
  // First, baseline default = newest first
  const sortedByNewest = sortByNewestFirst(packages);

  if (!orderEntries.length) return sortedByNewest;

  const orderMap = new Map<number, number>();
  orderEntries.forEach((o) => orderMap.set(o.tebexPackageId, o.displayOrder));

  return sortedByNewest.sort((a, b) => {
    const ao = a.tebexPackageId !== undefined ? orderMap.get(a.tebexPackageId) : undefined;
    const bo = b.tebexPackageId !== undefined ? orderMap.get(b.tebexPackageId) : undefined;

    // Admin-pinned: lowest displayOrder first
    if (ao !== undefined && bo !== undefined) return ao - bo;
    // Pinned vs unpinned: pinned wins
    if (ao !== undefined) return -1;
    if (bo !== undefined) return 1;
    // Both unpinned: keep newest-first relative order (sort is stable)
    return 0;
  });
}

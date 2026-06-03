import { API_URL } from '../config/api';
import { getAuthHeaders } from '../utils/authFetch';

export type TagVariant =
  | 'orange'
  | 'red'
  | 'green'
  | 'blue'
  | 'purple'
  | 'amber'
  | 'pink';

export interface PackageTag {
  id: number;
  keyword: string;
  label: string;
  variant: TagVariant;
  enabled: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PackageTagInput {
  keyword: string;
  label: string;
  variant: TagVariant;
  enabled?: boolean;
  displayOrder?: number;
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

export const packageTagsService = {
  /** Public — only enabled tags. Used by storefront cards. */
  async fetchPublic(): Promise<PackageTag[]> {
    try {
      const res = await fetch(`${API_URL}/tags`, { credentials: 'include' });
      const data = await jsonOrThrow(res);
      return Array.isArray(data?.tags) ? data.tags : [];
    } catch (error) {
      console.warn('[tags] fetchPublic failed:', error);
      return [];
    }
  },

  /** Admin — all tags including disabled. */
  async fetchAll(): Promise<PackageTag[]> {
    const res = await fetch(`${API_URL}/admin/tags`, {
      credentials: 'include',
      headers: { ...getAuthHeaders() },
    });
    const data = await jsonOrThrow(res);
    return Array.isArray(data?.tags) ? data.tags : [];
  },

  async create(input: PackageTagInput): Promise<PackageTag> {
    const res = await fetch(`${API_URL}/admin/tags`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(input),
    });
    const data = await jsonOrThrow(res);
    return data.tag;
  },

  async update(id: number, input: Partial<PackageTagInput>): Promise<PackageTag> {
    const res = await fetch(`${API_URL}/admin/tags/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(input),
    });
    const data = await jsonOrThrow(res);
    return data.tag;
  },

  async remove(id: number): Promise<void> {
    const res = await fetch(`${API_URL}/admin/tags/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { ...getAuthHeaders() },
    });
    await jsonOrThrow(res);
  },
};

/**
 * Returns the first matching tag for a package. Matches the tag's keyword
 * against the package name first, then falls back to the package's category
 * name — so a "BUNDLE" tag tags every package under a "Bundles" category
 * even when the package name itself doesn't contain the word.
 *
 * Accepts either the raw name string (back-compat) or a package-shaped object.
 */
export function findTagForPackage(
  pkgOrName: string | { name?: string; category?: { name?: string } | null },
  tags: PackageTag[]
): PackageTag | null {
  if (!tags.length) return null;
  const name =
    typeof pkgOrName === 'string' ? pkgOrName : (pkgOrName?.name ?? '');
  const categoryName =
    typeof pkgOrName === 'string' ? '' : (pkgOrName?.category?.name ?? '');
  if (!name && !categoryName) return null;

  const haystack = `${name} ${categoryName}`.toLowerCase();
  for (const tag of tags) {
    if (!tag.enabled) continue;
    if (tag.keyword && haystack.includes(tag.keyword.toLowerCase())) {
      return tag;
    }
  }
  return null;
}

/** Variant → CSS gradient + accent. */
export function getTagStyles(variant: TagVariant) {
  switch (variant) {
    case 'red':
      return {
        background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
        glow: 'rgba(239, 68, 68, 0.55)',
      };
    case 'green':
      return {
        background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
        glow: 'rgba(16, 185, 129, 0.55)',
      };
    case 'blue':
      return {
        background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
        glow: 'rgba(59, 130, 246, 0.55)',
      };
    case 'purple':
      return {
        background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
        glow: 'rgba(168, 85, 247, 0.55)',
      };
    case 'amber':
      return {
        background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
        glow: 'rgba(245, 158, 11, 0.55)',
      };
    case 'pink':
      return {
        background: 'linear-gradient(135deg, #DB2777 0%, #EC4899 100%)',
        glow: 'rgba(236, 72, 153, 0.55)',
      };
    case 'orange':
    default:
      return {
        background: 'linear-gradient(135deg, #FF3B30 0%, #FF9500 100%)',
        glow: 'rgba(255, 149, 0, 0.55)',
      };
  }
}

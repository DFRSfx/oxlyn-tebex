import { API_URL } from '../config/api';
import { getAuthHeaders } from '../utils/authFetch';

export interface StoreCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string;
  displayOrder: number;
  /** Tebex package ids assigned to this category. */
  packageIds: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryInput {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
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

export const categoriesService = {
  /** Public — used by the storefront /scripts page. */
  async fetchPublic(): Promise<StoreCategory[]> {
    try {
      const res = await fetch(`${API_URL}/categories`, { credentials: 'include' });
      const data = await jsonOrThrow(res);
      return Array.isArray(data?.categories) ? data.categories : [];
    } catch (error) {
      console.warn('[categories] fetchPublic failed:', error);
      return [];
    }
  },

  /** Admin — list with full metadata. */
  async fetchAll(): Promise<StoreCategory[]> {
    const res = await fetch(`${API_URL}/admin/categories`, {
      credentials: 'include',
      headers: { ...getAuthHeaders() },
    });
    const data = await jsonOrThrow(res);
    return Array.isArray(data?.categories) ? data.categories : [];
  },

  async create(input: CategoryInput): Promise<StoreCategory> {
    const res = await fetch(`${API_URL}/admin/categories`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(input),
    });
    const data = await jsonOrThrow(res);
    return data.category;
  },

  async update(id: number, input: Partial<CategoryInput>): Promise<StoreCategory> {
    const res = await fetch(`${API_URL}/admin/categories/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(input),
    });
    const data = await jsonOrThrow(res);
    return data.category;
  },

  async remove(id: number): Promise<void> {
    const res = await fetch(`${API_URL}/admin/categories/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { ...getAuthHeaders() },
    });
    await jsonOrThrow(res);
  },

  /** Replaces the full package list assigned to a category. */
  async setPackages(id: number, packageIds: number[]): Promise<void> {
    const res = await fetch(`${API_URL}/admin/categories/${id}/packages`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ packageIds }),
    });
    await jsonOrThrow(res);
  },
};

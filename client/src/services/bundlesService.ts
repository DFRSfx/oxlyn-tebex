import { API_URL } from '../config/api';
import { getAuthHeaders } from '../utils/authFetch';

export interface BundleResourceEntry {
  id: number;
  bundleTebexId: number;
  resourceTebexId: number;
  resourceName: string;
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

export const bundlesService = {
  /** Public — fetch every bundle->resource mapping in one go. */
  async fetchAll(): Promise<BundleResourceEntry[]> {
    try {
      const res = await fetch(`${API_URL}/bundles`, { credentials: 'include' });
      const data = await jsonOrThrow(res);
      return Array.isArray(data?.contents) ? data.contents : [];
    } catch (error) {
      console.warn('[bundles] fetchAll failed:', error);
      return [];
    }
  },

  /** Public — fetch resources for one bundle. */
  async fetchForBundle(bundleTebexId: number): Promise<BundleResourceEntry[]> {
    try {
      const res = await fetch(`${API_URL}/bundles/${bundleTebexId}`, { credentials: 'include' });
      const data = await jsonOrThrow(res);
      return Array.isArray(data?.contents) ? data.contents : [];
    } catch (error) {
      console.warn('[bundles] fetchForBundle failed:', error);
      return [];
    }
  },

  /** Admin — replace the resource list for a bundle. Array order becomes display_order. */
  async save(
    bundleTebexId: number,
    resources: { resourceTebexId: number; resourceName?: string }[]
  ): Promise<BundleResourceEntry[]> {
    const res = await fetch(`${API_URL}/admin/bundles/${bundleTebexId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ resources }),
    });
    const data = await jsonOrThrow(res);
    return Array.isArray(data?.contents) ? data.contents : [];
  },

  /** Admin — clear all resources for a bundle. */
  async clear(bundleTebexId: number): Promise<void> {
    const res = await fetch(`${API_URL}/admin/bundles/${bundleTebexId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { ...getAuthHeaders() },
    });
    await jsonOrThrow(res);
  },
};

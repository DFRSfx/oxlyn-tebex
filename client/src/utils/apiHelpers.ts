import { API_URL } from '../config/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
};

// Categories API
export const categoriesApi = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/admin/categories`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  create: async (data: any) => {
    const response = await fetch(`${API_URL}/admin/categories`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  update: async (id: number, data: any) => {
    const response = await fetch(`${API_URL}/admin/categories/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  delete: async (id: number) => {
    const response = await fetch(`${API_URL}/admin/categories/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// Products API
export const productsApi = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/admin/products`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getById: async (id: number) => {
    const response = await fetch(`${API_URL}/admin/products/${id}`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  create: async (data: any) => {
    const response = await fetch(`${API_URL}/admin/products`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  update: async (id: number, data: any) => {
    const response = await fetch(`${API_URL}/admin/products/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  delete: async (id: number) => {
    const response = await fetch(`${API_URL}/admin/products/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// Orders API
export const ordersApi = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/admin/orders`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getById: async (id: number) => {
    const response = await fetch(`${API_URL}/admin/orders/${id}`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateStatus: async (id: number, status: string) => {
    const response = await fetch(`${API_URL}/admin/orders/${id}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },
};

// Hero Slides API
export const heroSlidesApi = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/admin/hero-slides`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  create: async (data: any) => {
    const response = await fetch(`${API_URL}/admin/hero-slides`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  update: async (id: number, data: any) => {
    const response = await fetch(`${API_URL}/admin/hero-slides/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  delete: async (id: number) => {
    const response = await fetch(`${API_URL}/admin/hero-slides/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

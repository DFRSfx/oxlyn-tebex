import { useState, useEffect } from 'react';
import { categoriesApi } from '../utils/apiHelpers';

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await categoriesApi.getAll();
      setCategories(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
  };
};

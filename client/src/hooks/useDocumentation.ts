import { useState, useEffect, useCallback } from 'react';
import { DocumentationResource } from '../types';
import { documentationService } from '../services/documentationService';

export const useDocumentation = (packageName: string) => {
  const [documentation, setDocumentation] = useState<DocumentationResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocumentation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await documentationService.fetchSubsectionByName(packageName);
      if (result) {
        setDocumentation(result);
      } else {
        setError(`Failed to load documentation for "${packageName}"`);
      }
    } catch (err) {
      console.error('Error fetching documentation:', err);
      setError('An error occurred while fetching documentation');
    } finally {
      setLoading(false);
    }
  }, [packageName]);

  useEffect(() => {
    fetchDocumentation();
  }, [fetchDocumentation]);

  return { documentation, loading, error, refetch: fetchDocumentation };
};

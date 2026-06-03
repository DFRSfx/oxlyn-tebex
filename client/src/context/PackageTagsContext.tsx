import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { packageTagsService, PackageTag } from '../services/packageTagsService';

interface PackageTagsContextValue {
  tags: PackageTag[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const PackageTagsContext = createContext<PackageTagsContextValue>({
  tags: [],
  isLoading: false,
  refetch: async () => {},
});

export const PackageTagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tags, setTags] = useState<PackageTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await packageTagsService.fetchPublic();
      setTags(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <PackageTagsContext.Provider value={{ tags, isLoading, refetch }}>
      {children}
    </PackageTagsContext.Provider>
  );
};

export const usePackageTags = () => useContext(PackageTagsContext);

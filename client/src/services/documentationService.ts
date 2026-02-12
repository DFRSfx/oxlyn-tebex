import { DocumentationSubsection, DocumentationResource, DocumentationSection } from '../types';

interface CacheEntry {
  data: DocumentationResource;
  timestamp: number;
}

/**
 * Reconstruct subsections from flattened sections
 * If the resource has been flattened (has sections array instead of subsections),
 * this rebuilds the subsections structure from the section.subsection_id property
 */
function reconstructSubsections(resource: any): DocumentationSubsection[] {
  if (resource.subsections && Array.isArray(resource.subsections)) {
    return resource.subsections;
  }

  if (!resource.sections || !Array.isArray(resource.sections)) {
    return [];
  }

  // Group sections by subsection_id and extract metadata
  const subsectionMap = new Map<number, DocumentationSection[]>();
  const subsectionTitles = new Map<number, string>();
  const subsectionIcons = new Map<number, string>();

  // Try to extract subsection info from original data structure if available
  if (resource._subsectionInfo && typeof resource._subsectionInfo === 'object') {
    for (const [id, info] of Object.entries(resource._subsectionInfo)) {
      const subsectionId = parseInt(id);
      const subsectionData = info as any;
      if (subsectionData.title) subsectionTitles.set(subsectionId, subsectionData.title);
      if (subsectionData.icon) subsectionIcons.set(subsectionId, subsectionData.icon);
    }
  }

  // Group sections by subsection_id
  for (const section of resource.sections) {
    const subsectionId = section.subsection_id;
    if (!subsectionMap.has(subsectionId)) {
      subsectionMap.set(subsectionId, []);
      // Use extracted title or fallback to generic name
      if (!subsectionTitles.has(subsectionId)) {
        subsectionTitles.set(subsectionId, `Documentation ${subsectionId}`);
      }
      if (!subsectionIcons.has(subsectionId)) {
        subsectionIcons.set(subsectionId, '📖');
      }
    }
    subsectionMap.get(subsectionId)!.push(section);
  }

  // Convert to subsections array, maintaining sort order
  const subsections: DocumentationSubsection[] = [];
  const sortedIds = Array.from(subsectionMap.keys()).sort((a, b) => a - b);

  for (const subsectionId of sortedIds) {
    const sections = subsectionMap.get(subsectionId)!;
    subsections.push({
      id: subsectionId,
      title: subsectionTitles.get(subsectionId) || `Documentation ${subsectionId}`,
      icon: subsectionIcons.get(subsectionId) || '📖',
      sections
    });
  }

  return subsections;
}

class DocumentationService {
  private baseUrl = 'https://docs.oxlynsoftware.com/api/documentation';
  private cache: Map<string, CacheEntry>;
  private cacheDuration = 1000 * 60 * 30; // 30 minutes in milliseconds
  private readonly cacheStorageKey = 'docs_cache';

  constructor() {
    this.cache = new Map();
    // Clear old flattened cache on app start
    try {
      localStorage.removeItem(this.cacheStorageKey);
    } catch (e) {
      console.warn('Failed to clear old cache');
    }
    this.loadCacheFromLocalStorage();
  }

  /**
   * Fetch documentation resource by package name
   * @param title - The package title
   * @returns DocumentationResource or null if not found or error occurs
   */
  async fetchSubsectionByName(title: string): Promise<DocumentationResource | null> {
    try {
      // Check memory cache first
      const cached = this.cache.get(title);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.data;
      }

      // Fetch all documentation resources from external API
      const url = `${this.baseUrl}/`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`Failed to fetch documentation resources for "${title}": ${response.status} ${response.statusText}`);
        return null;
      }

      const responseText = await response.text();
      if (!responseText) {
        console.warn(`Empty response from documentation API for "${title}"`);
        return null;
      }

      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`Failed to parse documentation response for "${title}". Response: ${responseText.substring(0, 500)}`);
        return null;
      }

      if (!data.success || !data.data || !Array.isArray(data.data)) {
        console.warn(`Documentation API returned invalid response for "${title}"`);
        return null;
      }

      // Get first word from package name (e.g., "Notify System" -> "notify")
      const firstWord = title.split(' ')[0].toLowerCase();

      // Find matching resource by first word
      const resources = data.data as DocumentationResource[];
      const matchingResource = resources.find((resource: DocumentationResource) =>
        resource.title.toLowerCase().includes(firstWord) ||
        resource.id.toString().toLowerCase().includes(firstWord)
      );

      if (!matchingResource) {
        console.warn(`No documentation found matching "${title}" (searched for "${firstWord}")`);
        return null;
      }

      // Reconstruct subsections if the resource has been flattened
      const subsections = reconstructSubsections(matchingResource);
      const reconstructedResource: DocumentationResource = {
        ...matchingResource,
        subsections
      };

      // Cache the result
      const cacheEntry: CacheEntry = {
        data: reconstructedResource,
        timestamp: Date.now(),
      };
      this.cache.set(title, cacheEntry);
      this.saveCacheToLocalStorage();

      return reconstructedResource;
    } catch (error) {
      console.error('Error fetching documentation:', error);
      return null;
    }
  }

  /**
   * Check if a cache entry is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheDuration;
  }

  /**
   * Load cache from localStorage
   */
  private loadCacheFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.cacheStorageKey);
      if (!stored) return;

      const parsed = JSON.parse(stored) as Record<string, CacheEntry>;

      // Only load valid cache entries
      for (const [key, entry] of Object.entries(parsed)) {
        if (this.isCacheValid(entry.timestamp)) {
          // Reconstruct subsections in case cached data is flattened
          const subsections = reconstructSubsections(entry.data);
          const reconstructedData: DocumentationResource = {
            ...entry.data,
            subsections
          };
          this.cache.set(key, { data: reconstructedData, timestamp: entry.timestamp });
        }
      }
    } catch (error) {
      console.warn('Failed to load documentation cache from localStorage:', error);
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveCacheToLocalStorage(): void {
    try {
      const cacheObject: Record<string, CacheEntry> = {};
      this.cache.forEach((value, key) => {
        cacheObject[key] = value;
      });
      localStorage.setItem(this.cacheStorageKey, JSON.stringify(cacheObject));
    } catch (error) {
      console.warn('Failed to save documentation cache to localStorage:', error);
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    try {
      localStorage.removeItem(this.cacheStorageKey);
    } catch (error) {
      console.warn('Failed to clear localStorage cache:', error);
    }
  }

  /**
   * Clear specific cache entry
   */
  clearCacheEntry(title: string): void {
    this.cache.delete(title);
    this.saveCacheToLocalStorage();
  }
}

export const documentationService = new DocumentationService();

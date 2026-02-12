export interface Package {
  id: string;
  name: string;
  image: string;
  images?: string[];
  price: number;
  originalPrice: number;
  frameworks: string[];
  description: string;
  fullDescription: string;
  tebexPackageId?: number; // Tebex package ID for cart operations
  category?: {
    id: number;
    name: string;
  };
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  order: number;
}

export type PageType = 'home' | 'scripts' | 'package-details';

export interface DocumentationSection {
  id: number;
  subsection_id: number;
  title: string;
  type: 'text' | 'code' | 'image' | 'video';
  content: string;
  language: string | null;
  sort_order: number;
}

export interface DocumentationSubsection {
  id: number;
  title: string;
  icon: string;
  sections: DocumentationSection[];
}

export interface DocumentationResource {
  id: number;
  title: string;
  version: string;
  category_id: number;
  category: string;
  description: string;
  compatibility: string[];
  subsections: DocumentationSubsection[];
}

export interface DocumentationApiResponse {
  success: boolean;
  data?: DocumentationSubsection | DocumentationResource;
  error?: {
    message: string;
  };
}

// Type guard to check if data is a DocumentationResource
export function isDocumentationResource(data: any): data is DocumentationResource {
  return data && 'subsections' in data && Array.isArray(data.subsections);
}

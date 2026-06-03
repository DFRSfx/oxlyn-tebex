import { Package, PackageMedia } from '../types';
import { TebexPackageDetails } from '../services/tebexService';

/**
 * Strips HTML tags from a string and cleans up text
 */
function cleanDescription(html: string): string {
  if (!html) return '';
  
  // Create a temporary div element to parse HTML
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  
  // Get text content (strips all HTML tags)
  let text = tmp.textContent || tmp.innerText || '';
  
  // Clean up extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Maps Tebex package data to our internal Package type
 * You can customize this mapping based on your needs
 */
export function mapTebexPackageToPackage(tebexPackage: TebexPackageDetails): Package {
  // Parse description for frameworks or set defaults
  const cleanDesc = cleanDescription(tebexPackage.description || '');
  const frameworks = extractFrameworks(cleanDesc);
  
  // Tebex returns price in cents, convert to dollars/euros
  // API returns base_price as cents OR price.value - handle both
  const priceValue = tebexPackage.price?.value 
    ? tebexPackage.price.value / 100 
    : (tebexPackage as any).base_price || 0;
  
  // Original price for the "before discount" strikethrough on cards.
  // priceValue is the current (discounted) price; dividing by 0.7 yields a
  // baseline that's exactly 30% above current price, so the rendered badge
  // reads -30% on the storefront.
  const originalPrice = priceValue > 0 ? priceValue / 0.7 : 0;

  return {
    id: `package-${tebexPackage.id}`,
    name: tebexPackage.name,
    image: tebexPackage.image || 'https://i.imgur.com/LVePQtC.jpeg',
    images: tebexPackage.media && tebexPackage.media.length > 0
      ? tebexPackage.media.map(m => m.url)
      : tebexPackage.image
        ? [tebexPackage.image]
        : ['https://i.imgur.com/LVePQtC.jpeg'],
    price: priceValue,
    originalPrice: originalPrice,
    frameworks: frameworks.length > 0 ? frameworks : ['QBCORE', 'QBOX', 'ESX'],
    description: cleanDesc,
    fullDescription: cleanDesc,
    media: tebexPackage.media as PackageMedia[] | undefined,
    tebexPackageId: tebexPackage.id,
    category: tebexPackage.category,
  };
}

/**
 * Extract framework names from description
 * Looks for patterns like QBCORE, ESX, QBOX in the description
 */
function extractFrameworks(description: string): string[] {
  const frameworks: string[] = [];
  const frameworkKeywords = ['QBCORE', 'QBOX', 'ESX', 'QB-CORE', 'STANDALONE'];
  
  frameworkKeywords.forEach(keyword => {
    if (description.toUpperCase().includes(keyword)) {
      // Normalize QB-CORE to QBCORE
      const normalized = keyword === 'QB-CORE' ? 'QBCORE' : keyword;
      if (!frameworks.includes(normalized)) {
        frameworks.push(normalized);
      }
    }
  });
  
  return frameworks;
}

import { Package } from '../types';

const BUNDLE_RE = /\bbundle\b/i;
const SUBSCRIPTION_RE = /subscription/i;
const VANGUARD_RE = /vanguard/i;

/**
 * Vanguard scripts are the legacy "old Tebex store" catalogue that OXLYN
 * inherited. They live in the same Tebex account but are surfaced on the
 * storefront under a separate "Vanguard Scripts" tab — never mixed with
 * the main OXLYN catalogue on homepage / cart suggestions / subscription
 * page. Detection matches either the package name OR description because
 * the name conventions are inconsistent ("ALL SCRIPTS [UNLOCKED]" has no
 * brand cue in the name but always mentions vanguard in the description).
 */
export function isVanguard(
  pkg: Pick<Package, 'name' | 'description'> | undefined | null
): boolean {
  if (!pkg) return false;
  if (pkg.description && VANGUARD_RE.test(pkg.description)) return true;
  if (pkg.name && VANGUARD_RE.test(pkg.name)) return true;
  return false;
}

/** External docs URLs differ between brands. */
export const OXLYN_DOCS_URL = 'https://docs.oxlynsoftware.com/';
export const VANGUARD_DOCS_URL = 'https://docs.vanguard-labs.xyz/';
export function docsUrlFor(pkg: Pick<Package, 'name' | 'description'> | undefined | null): string {
  return isVanguard(pkg) ? VANGUARD_DOCS_URL : OXLYN_DOCS_URL;
}

/**
 * A package is considered a "bundle" if either its name or its Tebex
 * category name contains the word BUNDLE (case-insensitive). This matches
 * both the `[BUNDLE] Admin` naming convention and a dedicated `Bundles`
 * category on Tebex.
 */
export function isBundle(pkg: Pick<Package, 'name' | 'category'> | undefined | null): boolean {
  if (!pkg) return false;
  if (pkg.name && BUNDLE_RE.test(pkg.name)) return true;
  if (pkg.category?.name && BUNDLE_RE.test(pkg.category.name)) return true;
  return false;
}

/**
 * Detects the dedicated subscription products ("Oxlyn Monthly Subscription",
 * "Oxlyn 3 Months Subscription", "Oxlyn Year Subscription"). These are
 * checkout SKUs for the /subscription page only — they must NOT appear in
 * the storefront catalog, the homepage popular grid, or anywhere else that
 * lists scripts.
 */
export function isSubscriptionPackage(
  pkg: Pick<Package, 'name' | 'category'> | undefined | null
): boolean {
  if (!pkg) return false;
  if (pkg.name && SUBSCRIPTION_RE.test(pkg.name)) return true;
  if (pkg.category?.name && SUBSCRIPTION_RE.test(pkg.category.name)) return true;
  return false;
}

/**
 * Maps a subscription tier to its Tebex package by name pattern. Matching is
 * fuzzy on purpose — small naming changes ("Yearly" vs "Year", "Quarterly"
 * vs "3 Months") shouldn't break the link between the page and the SKU.
 */
export function findSubscriptionPackage(
  tier: 'monthly' | 'quarterly' | 'yearly',
  packages: Package[]
): Package | undefined {
  const subs = packages.filter(isSubscriptionPackage);
  const matchers: Record<typeof tier, RegExp> = {
    monthly: /\bmonthly\b/i,
    quarterly: /\b(3\s*months?|quarterly)\b/i,
    yearly: /\b(year|yearly|annual)\b/i,
  };
  return subs.find((p) => matchers[tier].test(p.name));
}

/**
 * The "Oxlyn Installation" professional-install order bump. It's a real Tebex
 * package (so its price flows into the real checkout) but it must NEVER be
 * browsable — only addable from the cart as the install add-on. Matched by its
 * stable Tebex package id so a rename can't leak it into the catalog.
 */
export const INSTALL_ADDON_TEBEX_ID = 7473819;
export function isInstallationAddon(
  pkg: { id?: number | string; tebexPackageId?: number } | undefined | null
): boolean {
  if (!pkg) return false;
  // CartItem keys on numeric `id`; Package keys on `tebexPackageId` (its `id`
  // is a string slug). Coerce so either shape matches the stable Tebex id.
  return Number(pkg.tebexPackageId) === INSTALL_ADDON_TEBEX_ID || Number(pkg.id) === INSTALL_ADDON_TEBEX_ID;
}

/**
 * A package is considered an official OXLYN package when its description
 * mentions "oxlyn" (case-insensitive). Packages without this marker — e.g.
 * legacy imports like "vanguard" — should be hidden from admin management
 * screens so only our own catalog is editable.
 */
export function isOxlynPackage(pkg: Pick<Package, 'description'> | undefined | null): boolean {
  if (!pkg?.description) return false;
  return pkg.description.toLowerCase().includes('oxlyn');
}

/** Frameworks always advertised on bundle pages, regardless of resource. */
export const BUNDLE_FRAMEWORKS = ['ESX', 'QBCORE', 'QBOX', 'CUSTOM FRAMEWORK'];

/** Compatibility line shown in the Product Info card for bundles. */
export const BUNDLE_COMPATIBILITY = 'ESX / QBCore / QBOX / Custom Framework';

import { Package } from '../types';

const ESCROW_SUFFIX_RE = /\s*\((open[- ]?source|escrow(?:ed)?|qb|qbcore|qbox|esx)\)/gi;

// Strips trailing parenthesised variant suffixes — e.g.
//   "Backpack V3 (Escrowed)" → "Backpack V3"
//   "Notify System (Open Source)" → "Notify System"
// Used to group variants of the same product into a single storefront card.
export function basePackageName(name: string): string {
  return name.replace(ESCROW_SUFFIX_RE, '').trim();
}

function isEscrowVariant(pkg: Package): boolean {
  return /escrow/i.test(pkg.name);
}

// Aggressive normaliser for the Vanguard catalogue. The escrow / unlocked
// pairs in the old store have inconsistent names ("Advanced Wallet System"
// (escrow) vs "Wallet System [UNLOCKED]"), so the standard
// `basePackageName` regex doesn't group them. This helper strips the
// `[UNLOCKED]`/`[BUNDLE]` brackets, the "Advanced" prefix, the
// "+ MLO" addendum, and lowercases everything so the two variants match.
// USE ONLY FOR GROUPING — never for display. The display name comes from
// `vanguardDisplayName` below, which keeps the original casing + brand
// words intact.
const VANGUARD_NORMALISE_RE = /\[\s*(unlocked|bundle)\s*\]|\badvanced\b|\+\s*mlo\b/gi;
export function vanguardBaseName(name: string): string {
  return name
    .replace(VANGUARD_NORMALISE_RE, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Display-friendly name for Vanguard packages. Only strips the variant
// marker `[UNLOCKED]` (purely a SKU suffix the user shouldn't see in the
// page title). Keeps the "Advanced" brand prefix and the original casing
// — so a Tebex name like "Advanced Radial Menu [UNLOCKED]" renders as
// "Advanced Radial Menu" without collapsing to the matching base used
// internally for variant pairing.
export function vanguardDisplayName(name: string): string {
  return name
    .replace(/\s*\[\s*unlocked\s*\]\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Group package variants by their stripped base name and pick the variant we
// want to show on the storefront. Preference order:
//   1. The Escrow build (always added to basket by the "Add to Basket" CTA)
//   2. The cheapest remaining variant (fallback when no Escrow build exists)
//
// The cards on `/scripts`, `/bundles`, etc. surface this single variant; the
// package details page reads all variants when the user clicks through.
export function deduplicatePackages(pkgs: Package[]): Package[] {
  const groups = new Map<string, Package[]>();
  for (const pkg of pkgs) {
    const base = basePackageName(pkg.name);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base)!.push(pkg);
  }
  const out: Package[] = [];
  groups.forEach((variants) => {
    const escrow = variants.find(isEscrowVariant);
    out.push(escrow || variants.reduce((min, cur) => (cur.price < min.price ? cur : min)));
  });
  return out;
}

// Vanguard-specific dedup: groups by the aggressive `vanguardBaseName`
// normaliser and chooses the cheapest variant as the card representative
// (always the escrow build for the listed Vanguard catalogue, since escrow
// is consistently the entry-level price). The detail page later looks up
// ALL variants in the group to render the escrow/unlocked toggle.
export function deduplicateVanguard(pkgs: Package[]): Package[] {
  const groups = new Map<string, Package[]>();
  for (const pkg of pkgs) {
    const base = vanguardBaseName(pkg.name);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base)!.push(pkg);
  }
  const out: Package[] = [];
  groups.forEach((variants) => {
    out.push(variants.reduce((min, cur) => (cur.price < min.price ? cur : min)));
  });
  return out;
}

// Find every variant of a Vanguard package given the full catalogue. Used
// by the details page to render the escrow/unlocked picker.
export function findVanguardVariants(pkg: Package, all: Package[]): Package[] {
  const key = vanguardBaseName(pkg.name);
  return all.filter((p) => vanguardBaseName(p.name) === key);
}

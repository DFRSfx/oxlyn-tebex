import { Package } from '../types';
import { isVanguard } from './isBundle';

/**
 * Cross-sell map — when a Vanguard package has a newer / equivalent OXLYN
 * script, the package details page surfaces a CTA pointing at the OXLYN
 * version. The mapping is intentionally tiny + hard-coded because each
 * pair is a deliberate marketing decision; auto-detecting based on name
 * similarity would catch the wrong matches.
 *
 * Both matchers receive the raw Tebex package name (no normalisation),
 * so they only need to be loose enough to match either variant (escrow
 * or unlocked) of the Vanguard SKU.
 */
interface CrossSellEntry {
  /** Matches the Vanguard package name (escrow + unlocked variants). */
  vanguardMatcher: RegExp;
  /** Matches the OXLYN package name we want to link to. */
  oxlynMatcher: RegExp;
  /** Short label rendered inside the CTA button. */
  ctaLabel: string;
  /** Optional sub-line under the CTA label. */
  ctaSubLabel?: string;
}

const CROSS_SELL_MAP: CrossSellEntry[] = [
  {
    // "Advanced Backpack V2 + MLO" / "Backpack V2 [UNLOCKED]" → OXLYN
    // ships the V3 generation under "Backpack System V3".
    vanguardMatcher: /backpack\s*v2/i,
    oxlynMatcher: /\bbackpack\s*(system\s*)?v3\b/i,
    ctaLabel: 'V3 version available',
    ctaSubLabel: 'Backpack System V3 by OXLYN',
  },
  {
    // "Advanced OBD Tablet System" → succeeded by OXLYN's
    // "ECU Tuning System".
    vanguardMatcher: /obd\s*tablet/i,
    oxlynMatcher: /\becu\s*tuning\b/i,
    ctaLabel: 'New version available',
    ctaSubLabel: 'ECU Tuning System by OXLYN',
  },
  {
    // Crutch System — same name on both catalogues; the OXLYN build is
    // the maintained one and matches an Oxlyn-flavoured name (no
    // "vanguard" in description, which is how `isVanguard` filters).
    vanguardMatcher: /crutch\s*system/i,
    oxlynMatcher: /\bcrutch\s*system\b/i,
    ctaLabel: 'Updated version available',
    ctaSubLabel: 'Crutch System by OXLYN',
  },
];

export interface VanguardUpgrade {
  upgrade: Package;
  ctaLabel: string;
  ctaSubLabel?: string;
}

/**
 * If `pkg` is a Vanguard script with a known OXLYN upgrade, returns the
 * OXLYN package + the CTA copy. Otherwise returns null (no button is
 * rendered). `allPackages` is the full catalogue loaded in App.tsx —
 * usually just `packages` from useTebex or props.
 */
export function findVanguardUpgrade(
  pkg: Package | null | undefined,
  allPackages: Package[]
): VanguardUpgrade | null {
  if (!pkg || !isVanguard(pkg)) return null;
  for (const entry of CROSS_SELL_MAP) {
    if (!entry.vanguardMatcher.test(pkg.name)) continue;
    const upgrade = allPackages.find(
      (p) => !isVanguard(p) && entry.oxlynMatcher.test(p.name)
    );
    if (upgrade) {
      return { upgrade, ctaLabel: entry.ctaLabel, ctaSubLabel: entry.ctaSubLabel };
    }
  }
  return null;
}

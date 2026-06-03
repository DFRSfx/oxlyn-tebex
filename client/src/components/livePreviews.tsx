import { LivePreviewConfig } from './LivePreview';

/**
 * Registry of products that ship an interactive, browser-playable "Live
 * Preview" of their in-game UI on the details page. Each entry embeds the
 * REAL NUI from /public/<id>-preview/demo.html driven by a demo bridge with
 * fictitious data.
 *
 * Matched by package NAME so it survives Tebex SKU renames. Vanguard SKUs and
 * bundles are excluded by default — the demos are the standalone OXLYN scripts,
 * and a demo belongs on its dedicated product page, not on a bundle page.
 */

interface PreviewEntry extends LivePreviewConfig {
  /** Name test — matched against the package name. */
  match: RegExp;
  /** Exclude the legacy Vanguard variants (different UI). Default true. */
  excludeVanguard?: boolean;
  /** Exclude bundle pages. Default true. */
  excludeBundle?: boolean;
}

const FOOTNOTE_FW =
  'The full version runs in-game and syncs with your framework (ESX / QBCore / QBox).';

const PREVIEWS: PreviewEntry[] = [
  {
    id: 'bossmenu',
    match: /boss\s*menu/i,
    titleLead: 'Interact with',
    titleAccent: 'the UI',
    blurb: (
      <>
        This is the <b className="text-white">real interface</b>, running live in your browser with
        sample data. Sign in, open the dashboard and try it — hire &amp; fire staff, edit ranks &amp;
        salaries, pay bonuses, check the timesheet. Nothing here affects a real server.
      </>
    ),
    topLabel: 'OxlynOS — Boss Menu · Interactive Demo',
    footnote: <>100% interactive demo — sample data only. {FOOTNOTE_FW}</>,
  },
  {
    id: 'obdtablet',
    match: /ecu\s*tuning/i,
    titleLead: 'Try the',
    titleAccent: 'ECU Tablet',
    blurb: (
      <>
        This is the <b className="text-white">real tablet UI</b>, running live with sample data.
        Browse vehicles, tweak ECU maps, flash tunes and explore the dyno — all interactive, with
        nothing affecting a real server.
      </>
    ),
    topLabel: 'ECU Tuning — Interactive Demo',
    footnote: <>100% interactive demo — sample data only. {FOOTNOTE_FW}</>,
  },
  {
    id: 'mdt',
    match: /\bmdt\b/i,
    fullscreenHint: 'Recommended for better visualization',
    titleLead: 'Open the',
    titleAccent: 'MDT',
    blurb: (
      <>
        This is the <b className="text-white">real MDT &amp; Dispatch interface</b>, running live with
        sample data. Search citizens &amp; vehicles, file reports, manage warrants and watch dispatch
        calls — fully interactive, with nothing affecting a real server.
      </>
    ),
    topLabel: 'MDT & Dispatch — Interactive Demo',
    footnote: <>100% interactive demo — sample data only. {FOOTNOTE_FW}</>,
  },
  // Truck Job and Containers previews were removed — only the three above
  // (Boss Menu, ECU Tuning, MDT & Dispatch) ship a Live Preview for now.
  // (Their demo assets: containers-preview was deleted; truckjob-preview is
  //  kept on disk but unreferenced — re-add an entry here to re-enable it.)
];

/**
 * Resolve the Live Preview config for a package, or null if it doesn't ship
 * one. `isVanguard` / `isBundle` come from the page's existing brand/variant
 * detection so we don't show the OXLYN demo on a Vanguard SKU or a bundle.
 */
export function getLivePreview(
  packageName: string | undefined,
  opts: { isVanguard: boolean; isBundle: boolean }
): LivePreviewConfig | null {
  const name = packageName || '';
  for (const entry of PREVIEWS) {
    if (!entry.match.test(name)) continue;
    if (entry.excludeVanguard !== false && opts.isVanguard) continue;
    if (entry.excludeBundle !== false && opts.isBundle) continue;
    // Strip the registry-only fields before handing to the component.
    const { match, excludeVanguard, excludeBundle, ...config } = entry;
    void match; void excludeVanguard; void excludeBundle;
    return config;
  }
  return null;
}

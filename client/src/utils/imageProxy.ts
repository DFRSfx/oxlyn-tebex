// Image URL helper.
//
// We used to route every external image through the wsrv.nl proxy to emit
// AVIF/WebP at the exact render size. In practice that proxy was the cause of
// the "black / slow to appear" images: an extra cross-origin round-trip, the
// occasional ORB/rate-limit failure, and a blank frame while it transcoded.
//
// So the proxy is GONE. Images now load straight from their origin via a plain
// native <img> (lazy + async-decode handle the optimization). The only rewrite
// we keep is Imgur's OWN url-based size scheme — it's a pure URL swap on
// Imgur's CDN (never goes black) and turns multi-MB originals into sub-200 KB
// variants, which is a real, reliable bandwidth win for admin-hosted art.

export type ProxyOpts = {
  /** Target rendered width in CSS pixels — used only to pick an Imgur variant. */
  w?: number;
  /** Accepted for call-site compatibility; ignored now (no proxy). */
  h?: number;
  q?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
  fit?: 'cover' | 'contain' | 'inside' | 'outside' | 'fill';
};

// Cap at 2x DPR so retina screens stay sharp without pulling 3x bytes.
const DPR_CAP = 2;

// Imgur's aspect-preserving size suffixes (t/m/l/h). We deliberately avoid the
// square-crop variants (s/b) which would distort non-square art like logos.
//   https://i.imgur.com/<hash>.jpg   (original — can be multi-MB)
//   …t.jpg  160 · …m.jpg 320 · …l.jpg 640 · …h.jpg 1024  (max longest side)
const IMGUR_RE = /^(https?:\/\/i\.imgur\.com\/[A-Za-z0-9]+)(\.[a-z]+)(\?.*)?$/i;
function rewriteImgur(url: string, w?: number): string {
  if (!w) return url;
  const m = IMGUR_RE.exec(url);
  if (!m) return url;
  const [, base, ext, query = ''] = m;
  const target = w * DPR_CAP;
  const suffix =
    target <= 160 ? 't' :
    target <= 320 ? 'm' :
    target <= 640 ? 'l' :
    target <= 1024 ? 'h' :
    '';
  return `${base}${suffix}${ext}${query}`;
}

/**
 * Returns the URL to actually load. For Imgur, swaps in a smaller native
 * variant sized for the render width; for everything else, returns the URL
 * unchanged (loaded directly, no proxy).
 */
export function optimizeImage(
  url: string | undefined | null,
  opts: ProxyOpts = {}
): string {
  if (!url) return '';
  if (url.includes('i.imgur.com')) return rewriteImgur(url, opts.w);
  return url;
}

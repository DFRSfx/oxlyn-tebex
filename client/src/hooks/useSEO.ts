import { useEffect } from 'react';

const SITE_URL = 'https://oxlynsoftware.com';
// OG image hosted on the brand domain — survives even if upstream image hosts
// rate-limit or change URL schemes.
const DEFAULT_OG_IMAGE = 'https://oxlynsoftware.com/og-cover.png';

export interface SEOOptions {
  /** Page title — site name is appended automatically. */
  title: string;
  /** Meta description (recommended ~150-160 chars). */
  description: string;
  /** Path-only canonical, e.g. "/scripts". Falls back to current pathname. */
  canonical?: string;
  /** OG image URL (defaults to brand image). */
  image?: string;
  /** Open Graph type, e.g. "website" | "article" | "product". */
  type?: 'website' | 'article' | 'product';
  /** Whether to allow indexing on this page. Most pages: true. */
  index?: boolean;
  /** Optional JSON-LD payload appended to <head> (object, not stringified). */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SEO_TAG_KEY = 'data-seo-managed';
const JSON_LD_KEY = 'data-seo-jsonld';

function setMeta(selector: string, value: string) {
  if (!value) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${selector}]`);
  if (!el) {
    el = document.createElement('meta');
    const [attr, attrVal] = selector.split('=');
    el.setAttribute(attr, attrVal.replace(/^["']|["']$/g, ''));
    el.setAttribute(SEO_TAG_KEY, '1');
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setLink(rel: string, href: string) {
  if (!href) return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    el.setAttribute(SEO_TAG_KEY, '1');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function useSEO(opts: SEOOptions) {
  const {
    title,
    description,
    canonical,
    image = DEFAULT_OG_IMAGE,
    type = 'website',
    index = true,
    jsonLd,
  } = opts;

  useEffect(() => {
    const fullTitle =
      title.toLowerCase().includes('oxlyn') ? title : `${title} | OXLYN Software`;
    document.title = fullTitle;

    const path = canonical ?? window.location.pathname + window.location.search;
    const canonicalUrl = path.startsWith('http') ? path : `${SITE_URL}${path}`;

    setMeta('name="description"', description);
    setMeta(
      'name="robots"',
      index
        ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
        : 'noindex, nofollow'
    );

    setMeta('property="og:title"', fullTitle);
    setMeta('property="og:description"', description);
    setMeta('property="og:type"', type);
    setMeta('property="og:url"', canonicalUrl);
    setMeta('property="og:image"', image);

    setMeta('name="twitter:title"', fullTitle);
    setMeta('name="twitter:description"', description);
    setMeta('name="twitter:image"', image);

    setLink('canonical', canonicalUrl);

    // Inject / replace per-route JSON-LD
    document.head.querySelectorAll(`script[${JSON_LD_KEY}]`).forEach((s) => s.remove());
    if (jsonLd) {
      const arr = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      arr.forEach((payload) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute(JSON_LD_KEY, '1');
        script.textContent = JSON.stringify(payload);
        document.head.appendChild(script);
      });
    }
  }, [title, description, canonical, image, type, index, JSON.stringify(jsonLd)]);
}

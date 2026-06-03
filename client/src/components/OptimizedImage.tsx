import React from 'react';
import { optimizeImage, ProxyOpts } from '../utils/imageProxy';

type ImgProps = React.ImgHTMLAttributes<HTMLImageElement>;

interface OptimizedImageProps extends Omit<ImgProps, 'src'> {
  src: string | undefined | null;
  /** Rendered width in CSS px — forwarded as the HTML attr (reserves the box
   *  to kill layout shift) and used to pick an Imgur size variant. */
  width?: number;
  /** Rendered height in CSS px — forwarded as the HTML attr. */
  height?: number;
  /** Accepted for call-site compatibility; no longer used (no proxy). */
  quality?: number;
  format?: ProxyOpts['format'];
  fit?: ProxyOpts['fit'];
}

/**
 * Plain, reliable <img>.
 *
 * Previously this routed every image through the wsrv.nl proxy to emit
 * AVIF/WebP via a <picture> + srcset. That proxy was the source of the
 * "black / slow to load" images (extra cross-origin hop + occasional
 * failures), so it's removed. We now load the image straight from its origin
 * and lean on the browser's native optimizations instead:
 *   - loading="lazy"  → offscreen images don't block anything,
 *   - decoding="async" → decode off the main thread,
 *   - width/height     → the box is reserved before load (zero CLS).
 * Imgur URLs still get their native size-suffix variant (a pure CDN URL swap,
 * never black) so admin-hosted art stays lightweight.
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  width,
  height,
  quality,
  format,
  fit,
  ...rest
}) => {
  // Accepted for backwards-compatible call sites; a native <img> needs none of
  // these (no transcoding proxy anymore).
  void quality;
  void format;
  void fit;

  const mergedRest: ImgProps = {
    loading: rest.loading ?? 'lazy',
    decoding: rest.decoding ?? 'async',
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...rest,
  };

  if (!src) {
    return <img {...mergedRest} src="" alt={rest.alt} />;
  }

  return <img {...mergedRest} src={optimizeImage(src, { w: width })} />;
};

export default OptimizedImage;

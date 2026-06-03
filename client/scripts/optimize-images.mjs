// One-shot image optimizer for the OXLYN landing page assets.
// Converts the heavy PNGs in /public to WebP at sensible display sizes —
// the originals are ~1.6-1.7 MB each (multiple times bigger than the
// 440px max width they actually render at), which was the LCP bottleneck.
//
// Run with: `node scripts/optimize-images.mjs`
//
// Original PNGs are kept as fallback for browsers without WebP support.
import sharp from 'sharp';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

const TARGETS = [
  // Hero parcels: max display ~440px wide on desktop, but on retina that's
  // 880px CSS pixels of detail. Export at 1.5× for a touch of headroom
  // without paying for unused sharpness.
  { src: 'oxlynparcel-1.png', width: 880, quality: 86 },
  { src: 'oxlynparcel-2.png', width: 460, quality: 86 },
  { src: 'oxlynparcel-3.png', width: 380, quality: 86 },
  // Logo appears at ~96px tops; retina headroom up to 192. Going slightly
  // bigger (256) covers admin sidebar usage and login modal at the same
  // time.
  { src: 'logo.png', width: 256, quality: 90 },
  // Cfx login chip image is small but PNG; convert anyway.
  { src: 'cfxre.png', width: 200, quality: 88 },
];

async function processOne({ src, width, quality, out }) {
  const inputPath = path.join(PUBLIC_DIR, src);
  const baseName = out ?? src.replace(/\.png$/i, '');
  const outputPath = path.join(PUBLIC_DIR, `${baseName}.webp`);

  let originalSize = 0;
  try {
    originalSize = (await stat(inputPath)).size;
  } catch {
    console.warn(`! skip: ${src} not found`);
    return;
  }

  await sharp(inputPath)
    .resize(width, null, { withoutEnlargement: true, fit: 'inside' })
    .webp({ quality, effort: 6 })
    .toFile(outputPath);

  const outSize = (await stat(outputPath)).size;
  const pct = ((1 - outSize / originalSize) * 100).toFixed(1);
  const fmt = (b) => (b / 1024).toFixed(1) + ' KB';
  console.log(`✓ ${src.padEnd(22)} → ${baseName}.webp   ${fmt(originalSize).padStart(10)} → ${fmt(outSize).padStart(10)}  (-${pct}%)`);
}

console.log('Optimizing landing-page images…\n');
for (const target of TARGETS) {
  // eslint-disable-next-line no-await-in-loop
  await processOne(target);
}
console.log('\nDone. Originals retained as PNG fallback.');

// Right-hand hero animation — three OXLYN 3D parcel marks floating in the
// foreground. Each <picture> serves a tiny .webp (generated locally, see
// /scripts/optimize-images.mjs) with the original .png as a fallback for
// browsers without WebP (vanishingly small share today). The originals
// were 1.5–1.7 MB each — that was the LCP bottleneck on the landing page.
//
// Explicit width/height attributes give the browser an aspect ratio
// before the image decodes, which keeps CLS at zero while the layer
// reserves its space.
//
// `fetchPriority="high"` on parcel-1 marks it as the LCP candidate so
// Chrome prioritises its download even though it's not the first image
// in the DOM.
export default function HeroParcelsAnimation() {
  return (
    <div className="hero-parcels" aria-hidden="true">
      <div className="hero-parcels-grid" />
      <div className="hero-parcels-glow" />

      <picture>
        <img
          src="/oxlynparcel-1.webp"
          alt=""
          loading="eager"
          decoding="async"
          fetchPriority="high"
          width={880}
          height={880}
          className="hero-parcel hero-parcel-1"
          draggable={false}
        />
      </picture>
      <picture>
        <img
          src="/oxlynparcel-2.webp"
          alt=""
          loading="eager"
          decoding="async"
          width={460}
          height={460}
          className="hero-parcel hero-parcel-2"
          draggable={false}
        />
      </picture>
      <picture>
        <img
          src="/oxlynparcel-3.webp"
          alt=""
          loading="eager"
          decoding="async"
          width={380}
          height={380}
          className="hero-parcel hero-parcel-3"
          draggable={false}
        />
      </picture>
    </div>
  );
}

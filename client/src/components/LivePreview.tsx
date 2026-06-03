import { useEffect, useRef, useState } from 'react';
import { MousePointerClick, RotateCcw, Sparkles, Maximize2 } from 'lucide-react';

/**
 * Generic "Live Preview — Interact with the UI" section.
 *
 * Embeds the REAL in-game NUI of a product inside an iframe so visitors can
 * click around a fully interactive replica before buying. Each product points
 * at its own standalone demo under /public/<id>-preview/demo.html, where a
 * "demo bridge" boots the NUI and answers every NUI fetch with fictitious,
 * in-memory data (see the per-product folders).
 *
 * The iframe is mounted lazily (only once it scrolls near the viewport) and
 * starts behind a "click to interact" overlay so it never traps page scroll
 * or eats accidental clicks. A reset button reloads the demo from scratch.
 *
 * This is presentational + behavioural only — what each product shows is
 * declared in `livePreviews.tsx`.
 */

export interface LivePreviewConfig {
  /** Stable id; also the public folder name: /public/<id>-preview/ */
  id: string;
  /** Demo entry URL. Defaults to `/${id}-preview/demo.html`. */
  src?: string;
  /** Heading lead (white) — e.g. "Interact with". */
  titleLead: string;
  /** Heading accent (gradient) — e.g. "the UI". */
  titleAccent: string;
  /** One-paragraph description below the heading (supports plain text). */
  blurb: React.ReactNode;
  /** Label shown in the demo window's top bar. */
  topLabel: string;
  /** Small footer note under the viewport. */
  footnote: React.ReactNode;
  /** Viewport aspect ratio, e.g. "16 / 10". Defaults to "16 / 10". */
  aspectRatio?: string;
  /** Optional hint shown next to the Fullscreen button (e.g. for dense UIs
   *  that read better at full size). */
  fullscreenHint?: string;
}

export default function LivePreview({ config }: { config: LivePreviewConfig }) {
  const src = config.src ?? `/${config.id}-preview/demo.html`;
  const aspectRatio = config.aspectRatio ?? '16 / 10';

  // The embedded demos are full desktop/tablet NUIs (built for a large
  // viewport) — on phones they overflow and read as broken. So the Live
  // Preview is desktop-only; on smaller screens we render nothing (the iframe
  // never even mounts). Threshold = Tailwind's `lg` (1024px).
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const sectionRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [active, setActive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Mount the iframe only when the section nears the viewport — each NUI
  // pulls its own CSS/JS bundle, so we don't want every product-page visitor
  // paying for it on load.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || shouldLoad) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoad(true);
          obs.disconnect();
        }
      },
      { rootMargin: '300px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [shouldLoad]);

  const reset = () => {
    setLoaded(false);
    setActive(false);
    setReloadKey((k) => k + 1);
  };

  const openFullscreen = () => {
    const node = iframeRef.current;
    if (node?.requestFullscreen) node.requestFullscreen().catch(() => {});
  };

  // Tell the embedded demo to start once the visitor activates it (and the
  // iframe has loaded). Demos that play a boot/loading sequence (e.g. the ECU
  // tablet) wait for this signal so the sequence plays on interaction instead
  // of silently behind the overlay. Demos that auto-boot simply ignore it.
  useEffect(() => {
    if (active && loaded) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'oxlyn-live-preview:start' },
        '*'
      );
    }
  }, [active, loaded]);

  // Desktop-only — hide entirely on phones/small tablets (see note above).
  if (!isDesktop) return null;

  return (
    <section ref={sectionRef} className="relative py-12 sm:py-16" id="live-preview">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        {/* Heading */}
        <div className="text-center mb-6 sm:mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-orange/10 border border-primary-orange/30 text-[11px] font-bold tracking-[0.18em] text-primary-orange uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Live Preview
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
            <span className="text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.20)]">{config.titleLead} </span>
            <span className="gradient-text-brand">{config.titleAccent}</span>
          </h2>
          <p className="text-sm text-gray-500 mt-4 font-light max-w-2xl mx-auto">{config.blurb}</p>
        </div>

        {/* Stage */}
        <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-br from-zinc-900/70 via-zinc-950/60 to-black shadow-2xl shadow-black/50">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 border-b border-zinc-800/80 bg-black/40">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-400/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-3 text-xs text-zinc-500 font-medium hidden sm:inline">{config.topLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              {config.fullscreenHint && (
                <span className="hidden md:inline text-[11px] text-primary-orange/90 font-medium mr-0.5">
                  {config.fullscreenHint}
                </span>
              )}
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
                title="Reset the demo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
              <button
                onClick={openFullscreen}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                  config.fullscreenHint
                    ? 'text-primary-orange bg-primary-orange/10 border-primary-orange/30 hover:bg-primary-orange/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10'
                }`}
                title={config.fullscreenHint || 'Fullscreen'}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>
            </div>
          </div>

          {/* Viewport */}
          <div className="relative w-full bg-black" style={{ aspectRatio, maxHeight: '76vh' }}>
            {shouldLoad && (
              <iframe
                key={reloadKey}
                ref={iframeRef}
                src={src}
                title={config.topLabel}
                onLoad={() => setLoaded(true)}
                loading="lazy"
                className="absolute inset-0 w-full h-full border-0"
                style={{ pointerEvents: active ? 'auto' : 'none' }}
                allow="fullscreen"
              />
            )}

            {/* Loading shimmer */}
            {shouldLoad && !loaded && (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-zinc-600 border-t-primary-orange animate-spin" />
                  Loading preview…
                </span>
              </div>
            )}

            {/* Click-to-interact overlay — keeps the iframe inert until the
                visitor opts in, so it never traps scroll on the product page. */}
            {(!active || !shouldLoad) && (
              <button
                onClick={() => {
                  if (!shouldLoad) setShouldLoad(true);
                  setActive(true);
                }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/45 backdrop-blur-[2px] transition-opacity hover:bg-black/35 group"
                aria-label="Click to interact with the live demo"
              >
                <span className="flex items-center justify-center w-16 h-16 rounded-full bg-primary-orange/20 border border-primary-orange/40 text-primary-orange group-hover:scale-110 transition-transform">
                  <MousePointerClick className="w-7 h-7" />
                </span>
                <span className="text-white font-bold text-base sm:text-lg">Click to interact</span>
                <span className="text-zinc-400 text-xs sm:text-sm">Try the real UI — live, with demo data</span>
              </button>
            )}
          </div>

          {/* Footer note */}
          <div className="px-4 sm:px-5 py-2.5 border-t border-zinc-800/80 bg-black/40 flex items-center gap-2 text-[11px] text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {config.footnote}
          </div>
        </div>
      </div>
    </section>
  );
}

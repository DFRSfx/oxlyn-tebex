import React, { useState, useEffect } from 'react';
import { Sparkles, Code2 } from 'lucide-react';
import { formatCategoryName } from '../utils/helpers';
import { Package, Category } from '../types';
import PackageCard from '../components/PackageCard';
import FilterButton from '../components/FilterButton';
import { tebexService } from '../services/tebexService';

interface ScriptsPageProps {
  isLoaded: boolean;
  packages: Package[];
  openPackageDetails: (pkg: Package) => void;
}

const COUPON_CODE = 'OXLYN-10';
const COUPON_DISCOUNT = '10%';

// =============================================================
// NATIVE DOM POPUP — bypasses React entirely
// -------------------------------------------------------------
// We discovered the cause: the <body> has `overflow-x: hidden`
// (set in index.html) AND the App.tsx wrapper has
// `min-h-screen ... overflow-x-hidden relative`. This combination
// breaks `position:fixed` when the document is taller than the
// viewport.
//
// The fix: build the popup with VANILLA JS / native DOM and append
// it to document.documentElement (the <html> element) — NOT to
// <body>. The <html> element is the absolute root and is unaffected
// by body styles.
// =============================================================

interface PopupCallbacks {
  onClose: () => void;
  onCopy: () => void;
}

const POPUP_ID = 'oxlyn-coupon-native-popup';

function buildPopupHTML(state: { copied: boolean }): string {
  return `
    <div class="oxlyn-popup-glow"></div>
    <div class="oxlyn-popup-card">
      <div class="oxlyn-popup-corner-glow oxlyn-popup-corner-glow-tr"></div>
      <div class="oxlyn-popup-corner-glow oxlyn-popup-corner-glow-bl"></div>

      <button class="oxlyn-popup-close" data-action="close" aria-label="Close coupon">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <div class="oxlyn-popup-content">
        <div class="oxlyn-popup-header">
          <div class="oxlyn-popup-icon-wrapper">
            <div class="oxlyn-popup-icon-glow"></div>
            <div class="oxlyn-popup-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                <line x1="7" y1="7" x2="7.01" y2="7"></line>
              </svg>
            </div>
          </div>
          <div class="oxlyn-popup-header-text">
            <div class="oxlyn-popup-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"></path>
              </svg>
              <span>LIMITED OFFER</span>
            </div>
            <h3 class="oxlyn-popup-title">Get <span class="oxlyn-popup-title-accent">${COUPON_DISCOUNT} OFF</span> on all scripts</h3>
          </div>
        </div>

        <p class="oxlyn-popup-description">
          Use the code below at checkout to save ${COUPON_DISCOUNT} on your order. Don't miss out!
        </p>

        <div class="oxlyn-popup-code-box">
          <div class="oxlyn-popup-shimmer-wrapper">
            <div class="oxlyn-popup-shimmer"></div>
          </div>
          <div class="oxlyn-popup-code-info">
            <p class="oxlyn-popup-code-label">COUPON CODE</p>
            <p class="oxlyn-popup-code-value">${COUPON_CODE}</p>
          </div>
          <button class="oxlyn-popup-copy ${state.copied ? 'oxlyn-popup-copy--copied' : ''}" data-action="copy">
            ${state.copied ? `
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Copied</span>
            ` : `
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            `}
          </button>
        </div>

        <p class="oxlyn-popup-footer-hint">Apply at checkout to redeem your discount</p>
      </div>
    </div>
  `;
}

function injectPopupStyles() {
  if (document.getElementById('oxlyn-popup-styles')) return;

  const styleEl = document.createElement('style');
  styleEl.id = 'oxlyn-popup-styles';
  styleEl.textContent = `
    @keyframes oxlynPopupSlideIn {
      0% { opacity: 0; transform: translateY(40px) scale(0.9); }
      60% { transform: translateY(-6px) scale(1.02); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes oxlynPopupSlideOut {
      0% { opacity: 1; transform: translateY(0) scale(1); }
      100% { opacity: 0; transform: translateY(40px) scale(0.95); }
    }
    @keyframes oxlynPopupShimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    #${POPUP_ID} {
      position: fixed !important;
      bottom: 16px !important;
      right: 16px !important;
      left: 16px !important;
      z-index: 2147483647 !important;
      max-width: min(360px, calc(100vw - 32px)) !important;
      width: auto !important;
      pointer-events: auto !important;
      transform: none;
      font-family: 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: oxlynPopupSlideIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      margin-left: auto;
    }
    @media (min-width: 640px) {
      #${POPUP_ID} {
        bottom: 24px !important;
        right: 24px !important;
        left: auto !important;
        max-width: min(384px, calc(100vw - 32px)) !important;
        width: 100% !important;
      }
    }
    #${POPUP_ID}.oxlyn-popup-closing {
      animation: oxlynPopupSlideOut 0.3s ease-in forwards !important;
    }

    #${POPUP_ID} *,
    #${POPUP_ID} *::before,
    #${POPUP_ID} *::after {
      box-sizing: border-box;
    }

    #${POPUP_ID} .oxlyn-popup-glow {
      position: absolute;
      inset: -4px;
      background: linear-gradient(90deg, rgba(249, 115, 22, 0.4), rgba(239, 68, 68, 0.4), rgba(249, 115, 22, 0.4));
      border-radius: 18px;
      filter: blur(12px);
      opacity: 0.75;
      pointer-events: none;
    }

    #${POPUP_ID} .oxlyn-popup-card {
      position: relative;
      background: linear-gradient(135deg, #18181b, #0d0d0d, #000000);
      border-radius: 16px;
      border: 1px solid rgba(249, 115, 22, 0.3);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      overflow: hidden;
    }

    #${POPUP_ID} .oxlyn-popup-corner-glow {
      position: absolute;
      width: 160px;
      height: 160px;
      border-radius: 9999px;
      filter: blur(48px);
      pointer-events: none;
    }
    #${POPUP_ID} .oxlyn-popup-corner-glow-tr {
      top: -64px;
      right: -64px;
      background: rgba(249, 115, 22, 0.2);
    }
    #${POPUP_ID} .oxlyn-popup-corner-glow-bl {
      bottom: -64px;
      left: -64px;
      background: rgba(239, 68, 68, 0.15);
    }

    #${POPUP_ID} .oxlyn-popup-close {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 10;
      width: 28px;
      height: 28px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #9ca3af;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      padding: 0;
    }
    #${POPUP_ID} .oxlyn-popup-close:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }

    #${POPUP_ID} .oxlyn-popup-content {
      position: relative;
      padding: 20px;
    }

    #${POPUP_ID} .oxlyn-popup-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }

    #${POPUP_ID} .oxlyn-popup-icon-wrapper {
      position: relative;
      flex-shrink: 0;
    }
    #${POPUP_ID} .oxlyn-popup-icon-glow {
      position: absolute;
      inset: 0;
      background: rgba(249, 115, 22, 0.4);
      filter: blur(12px);
      border-radius: 12px;
    }
    #${POPUP_ID} .oxlyn-popup-icon {
      position: relative;
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #f97316, #dc2626);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      box-shadow: 0 10px 15px -3px rgba(249, 115, 22, 0.3);
    }

    #${POPUP_ID} .oxlyn-popup-header-text {
      flex: 1;
      padding-top: 2px;
      padding-right: 24px;
      min-width: 0;
    }

    #${POPUP_ID} .oxlyn-popup-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      margin-bottom: 6px;
      border-radius: 9999px;
      background: rgba(249, 115, 22, 0.15);
      border: 1px solid rgba(249, 115, 22, 0.25);
      font-size: 9px;
      font-weight: 700;
      color: #fb923c;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    #${POPUP_ID} .oxlyn-popup-title {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.25;
      margin: 0;
    }
    #${POPUP_ID} .oxlyn-popup-title-accent {
      color: #fb923c;
    }

    #${POPUP_ID} .oxlyn-popup-description {
      font-size: 12px;
      color: #9ca3af;
      margin: 0 0 16px 0;
      line-height: 1.5;
    }

    #${POPUP_ID} .oxlyn-popup-code-box {
      position: relative;
      background: rgba(0, 0, 0, 0.6);
      border: 1px dashed rgba(249, 115, 22, 0.4);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      overflow: hidden;
    }

    #${POPUP_ID} .oxlyn-popup-shimmer-wrapper {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }
    #${POPUP_ID} .oxlyn-popup-shimmer {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 33.333%;
      background: linear-gradient(90deg, transparent, rgba(249, 115, 22, 0.1), transparent);
      animation: oxlynPopupShimmer 2.5s ease-in-out infinite;
      animation-delay: 1s;
    }

    #${POPUP_ID} .oxlyn-popup-code-info {
      position: relative;
      flex: 1;
      min-width: 0;
    }
    #${POPUP_ID} .oxlyn-popup-code-label {
      font-size: 9px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 600;
      margin: 0 0 2px 0;
    }
    #${POPUP_ID} .oxlyn-popup-code-value {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      font-family: ui-monospace, SFMono-Regular, monospace;
      letter-spacing: 0.05em;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #${POPUP_ID} .oxlyn-popup-copy {
      position: relative;
      flex-shrink: 0;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      border: none;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.3s;
      background: linear-gradient(135deg, #f97316, #dc2626);
      color: #ffffff;
      box-shadow: 0 10px 15px -3px rgba(249, 115, 22, 0.4);
    }
    #${POPUP_ID} .oxlyn-popup-copy:hover {
      background: linear-gradient(135deg, #fb923c, #ef4444);
      box-shadow: 0 10px 15px -3px rgba(249, 115, 22, 0.6);
      transform: scale(1.05);
    }
    #${POPUP_ID} .oxlyn-popup-copy:active {
      transform: scale(0.95);
    }
    #${POPUP_ID} .oxlyn-popup-copy--copied {
      background: #10b981 !important;
      box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.4) !important;
    }
    #${POPUP_ID} .oxlyn-popup-copy--copied:hover {
      background: #10b981 !important;
      transform: none !important;
    }

    #${POPUP_ID} .oxlyn-popup-footer-hint {
      font-size: 10px;
      color: #6b7280;
      margin: 12px 0 0 0;
      text-align: center;
    }
  `;
  document.head.appendChild(styleEl);
}

function createNativePopup(callbacks: PopupCallbacks): {
  destroy: () => void;
  setCopied: (copied: boolean) => void;
  startClosing: () => void;
} {
  // Inject styles if not already present
  injectPopupStyles();

  // Remove any existing popup with same ID first
  const existing = document.getElementById(POPUP_ID);
  if (existing) existing.remove();

  // Create popup element
  const popup = document.createElement('div');
  popup.id = POPUP_ID;
  popup.innerHTML = buildPopupHTML({ copied: false });

  // ATTACH TO documentElement (<html>) — NOT to <body>!
  // This is the key fix: <body> has overflow-x:hidden which combined with
  // the long content can break position:fixed. <html> is the absolute root.
  document.documentElement.appendChild(popup);

  // Wire up event handlers using event delegation
  const handleClick = (e: Event) => {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-action]') as HTMLButtonElement | null;
    if (!button) return;

    const action = button.dataset.action;
    if (action === 'close') {
      callbacks.onClose();
    } else if (action === 'copy') {
      callbacks.onCopy();
    }
  };

  popup.addEventListener('click', handleClick);

  return {
    destroy: () => {
      popup.removeEventListener('click', handleClick);
      if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
    },
    setCopied: (copied: boolean) => {
      popup.innerHTML = buildPopupHTML({ copied });
    },
    startClosing: () => {
      popup.classList.add('oxlyn-popup-closing');
    },
  };
}

const ScriptsPage: React.FC<ScriptsPageProps> = ({
  isLoaded,
  packages,
  openPackageDetails,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const tebexCategories = await tebexService.fetchCategories();

        const mappedCategories: Category[] = tebexCategories
          .map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            order: cat.order,
          }))
          .filter(cat => {
            const slugLower = cat.slug?.toLowerCase() || '';
            const nameLower = cat.name?.toLowerCase() || '';
            return (
              slugLower.includes('escrow') ||
              slugLower.includes('open-source') ||
              slugLower.includes('opensource') ||
              nameLower.includes('escrow') ||
              nameLower.includes('open source') ||
              nameLower.includes('opensource')
            );
          });

        setCategories(mappedCategories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // ============================================================
  // NATIVE POPUP LIFECYCLE — managed via useEffect
  // ============================================================
  useEffect(() => {
    if (!isLoaded) return;

    // Don't show if dismissed
    if (sessionStorage.getItem('oxlyn_coupon_dismissed')) return;

    let popupHandle: ReturnType<typeof createNativePopup> | null = null;
    let isClosing = false;

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(COUPON_CODE);
      } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = COUPON_CODE;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      if (popupHandle) {
        popupHandle.setCopied(true);
        setTimeout(() => {
          if (popupHandle) popupHandle.setCopied(false);
        }, 2000);
      }
    };

    const handleClose = () => {
      if (isClosing || !popupHandle) return;
      isClosing = true;
      sessionStorage.setItem('oxlyn_coupon_dismissed', '1');
      popupHandle.startClosing();
      setTimeout(() => {
        if (popupHandle) {
          popupHandle.destroy();
          popupHandle = null;
        }
      }, 300);
    };

    // Show popup after delay
    const showTimer = setTimeout(() => {
      popupHandle = createNativePopup({
        onClose: handleClose,
        onCopy: handleCopy,
      });
    }, 2500);

    // Cleanup on unmount (route change, etc.)
    return () => {
      clearTimeout(showTimer);
      if (popupHandle) {
        popupHandle.destroy();
        popupHandle = null;
      }
    };
  }, [isLoaded]);

  const deduplicatePackages = (pkgs: Package[]): Package[] => {
    const packageGroups = new Map<string, Package[]>();

    pkgs.forEach(pkg => {
      const baseName = pkg.name
        .replace(/\s*\(OPEN-SOURCE\)/gi, '')
        .replace(/\s*\(ESCROWED\)/gi, '')
        .replace(/\s*\(Open Source\)/gi, '')
        .replace(/\s*\(Escrow\)/gi, '')
        .trim();

      if (!packageGroups.has(baseName)) {
        packageGroups.set(baseName, []);
      }
      packageGroups.get(baseName)!.push(pkg);
    });

    const deduplicated: Package[] = [];
    packageGroups.forEach((variants) => {
      const lowestPricePackage = variants.reduce((min, current) =>
        current.price < min.price ? current : min
      );
      deduplicated.push(lowestPricePackage);
    });

    return deduplicated;
  };

  const filteredPackages = deduplicatePackages(
    (selectedCategory === 'all'
      ? packages
      : packages.filter(pkg => pkg.category?.id === selectedCategory))
      .filter(pkg => !pkg.description?.toLowerCase().includes('vanguard'))
  );

  return (
    <section className="py-20 sm:py-28 lg:py-32 relative min-h-screen">
      <style>{`
        @keyframes scriptsCardEnter {
          0% {
            opacity: 0;
            transform: translateY(28px) scale(0.95);
            filter: blur(6px);
          }
          60% {
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        .scripts-grid-item {
          opacity: 0;
          animation: scriptsCardEnter 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          will-change: transform, opacity, filter;
        }
      `}</style>

      <div className="absolute inset-0 grid-background opacity-20" />
      <div className="hero-gradient-enhanced absolute inset-0" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="geometric-shape geometric-shape-1" />
        <div className="geometric-shape geometric-shape-2" />
        <div className="geometric-shape geometric-shape-3" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className={`text-center mb-12 sm:mb-16 transition-all duration-1200 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-20'}`}>
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-500/15 to-red-500/15 border border-orange-500/30 mb-6 sm:mb-8 backdrop-blur-sm hover:from-orange-500/25 hover:to-red-500/25 hover:border-orange-500/50 transition-all duration-300 hover:scale-105 cursor-default">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold text-orange-400 uppercase tracking-widest">All Scripts</span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-4 sm:mb-6 tracking-tight">
            Our <span className="gradient-text-brand">Scripts</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-400 max-w-3xl mx-auto font-light leading-relaxed px-2">
            {packages.length > 0
              ? "Explore our complete collection of premium scripts"
              : "We're cooking up the best scripts just for you — greatness is on the way."}
          </p>

          {filteredPackages.length > 0 && (
            <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 sm:mt-8 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50" />
                <span className="text-xs sm:text-sm text-gray-400">
                  <span className="text-white font-bold">{filteredPackages.length}</span> scripts available
                </span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-zinc-700" />
              <div className="flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
                <span className="text-xs sm:text-sm text-gray-400">Premium Quality</span>
              </div>
            </div>
          )}
        </div>

        {filteredPackages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-7 lg:gap-10 xl:gap-12">
            {filteredPackages.map((pkg, index) => (
              <div
                key={pkg.id}
                className="scripts-grid-item h-full"
                style={{
                  animationDelay: `${Math.min(index * 80, 1200)}ms`,
                }}
              >
                <PackageCard
                  package={pkg}
                  onClick={openPackageDetails}
                  isLoaded={isLoaded}
                  delay={400 + index * 100}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center py-12 sm:py-20 px-4 transition-all duration-1000 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-10'}`}>
            <div className="relative mb-6 sm:mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/30 to-red-500/30 blur-3xl rounded-full animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 blur-2xl rounded-full" />

              <div className="relative bg-gradient-to-br from-zinc-900/95 to-black/95 p-6 sm:p-10 rounded-3xl border border-zinc-800 backdrop-blur-sm">
                <div className="absolute top-2 right-4 w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                <div className="absolute bottom-4 left-3 w-1 h-1 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0.7s' }} />
                <div className="absolute top-1/2 left-2 w-1 h-1 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '1.2s' }} />

                <Code2 className="w-14 h-14 sm:w-20 sm:h-20 text-gray-400" />
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4 text-center">
              No Scripts Found
            </h3>
            {selectedCategory !== 'all' && (
              <>
                <p className="text-gray-400 text-base sm:text-lg mb-5 sm:mb-6 max-w-md text-center">
                  Nothing here yet in this category. We're crafting top-tier scripts worth the wait.
                </p>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="group relative overflow-hidden px-6 sm:px-7 py-3 sm:py-3.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-orange-500/40 hover:shadow-orange-500/60 text-sm sm:text-base"
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <span className="relative">View All Scripts</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ScriptsPage;
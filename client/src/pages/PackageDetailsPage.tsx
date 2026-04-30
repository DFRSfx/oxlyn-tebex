import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ShoppingCart, Check, Home, Shield, Zap, Server, Info, FileText, ZoomIn, X } from 'lucide-react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Package } from '../types';
import { useTebex } from '../context/TebexContext';
import { useDocumentation } from '../hooks/useDocumentation';
import DocumentationTabs from '../components/DocumentationTabs';
import { API_URL } from '../config/api';
import { useAnalytics } from '../hooks/useAnalytics';

interface PackageDetailsPageProps {
  packages: Package[];
}

const PackageDetailsPage: React.FC<PackageDetailsPageProps> = ({ packages }) => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, addToCart, isInCart, login } = useTebex();
  const { trackPackageView } = useAnalytics();
  const [isAdding, setIsAdding] = useState(false);
  const [currentProductImageIndex, setCurrentProductImageIndex] = useState(0);

  const statePackage: Package | undefined = location.state?.package;
  const selectedPackage: Package | undefined =
    packages.find(pkg => {
      if (statePackage?.tebexPackageId) {
        return pkg.tebexPackageId === statePackage.tebexPackageId;
      }
      const slug = pkg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return slug === productSlug;
    }) ||
    packages.find(pkg => {
      const slug = pkg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return slug === productSlug;
    }) ||
    statePackage;

  const getBaseName = (name: string) => {
    return name
      .replace(/\s*\(OPEN-SOURCE\)/gi, '')
      .replace(/\s*\(ESCROWED\)/gi, '')
      .replace(/\s*\(Open Source\)/gi, '')
      .replace(/\s*\(Escrow\)/gi, '')
      .trim();
  };

  const packageVariants = selectedPackage
    ? packages.filter(pkg => {
        const baseName1 = getBaseName(pkg.name);
        const baseName2 = getBaseName(selectedPackage.name);
        return baseName1 === baseName2;
      })
    : [];

  const openSourceVersion = packageVariants.find(
    pkg => pkg.name.toLowerCase().includes('open-source') ||
           pkg.name.toLowerCase().includes('opensource') ||
           pkg.name.toLowerCase().includes('open source')
  );

  const escrowVersion = packageVariants.find(
    pkg => (pkg.name.toLowerCase().includes('escrow') ||
            pkg.name.toLowerCase().includes('escrowed')) &&
           !pkg.name.toLowerCase().includes('open')
  ) || packageVariants.find(pkg => pkg !== openSourceVersion);

  const [selectedVersion, setSelectedVersion] = useState<Package | undefined>(selectedPackage);

  useEffect(() => {
    if (selectedPackage && packageVariants.length > 0) {
      const packageInVariants = packageVariants.find(
        v => v.tebexPackageId === selectedPackage.tebexPackageId
      );

      if (packageInVariants) {
        setSelectedVersion(packageInVariants);
      } else {
        const cheapest = packageVariants.reduce((min, current) =>
          current.price < min.price ? current : min
        );
        setSelectedVersion(cheapest);
      }
    }
  }, [selectedPackage, packageVariants.length]);

  useEffect(() => {
    if (!selectedPackage?.name) return;
    let active = true;
    const timer = setTimeout(() => {
      if (active) trackPackageView(selectedPackage.name);
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedPackage?.name, trackPackageView]);

  const fromScripts = location.state?.fromScripts || false;
  const baseName = selectedPackage ? getBaseName(selectedPackage.name) : '';
  const { documentation, loading: docsLoading, error: _docsError } = useDocumentation(baseName);

  useEffect(() => {
    if (documentation) {
      console.log('📚 Full Documentation Object:', documentation);
      console.log('📚 Version:', documentation.version);
      console.log('📚 Compatibility:', documentation.compatibility);
      console.log('📚 Subsections (Tabs):', documentation.subsections);
      if (documentation.subsections) {
        documentation.subsections.forEach((subsection, i) => {
          console.log(`📑 Subsection ${i}:`, subsection.title);
          if (subsection.sections) {
            subsection.sections.forEach((section, j) => {
              console.log(`  📄 Section ${j}:`, section.title, '(type:', section.type + ')');
              console.log(`  📝 Content preview:`, section.content?.substring(0, 200));
            });
          }
        });
      }
    }
  }, [documentation]);

  useEffect(() => {
    if (!selectedPackage?.name) return;

    const controller = new AbortController();

    fetch(`${API_URL}/orders/stats/record-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ packageName: selectedPackage.name }),
      signal: controller.signal,
    }).catch(error => {
      if (error.name !== 'AbortError') {
        console.error(`❌ [STATS] Failed to record package view:`, error);
      }
    });

    return () => {
      controller.abort();
    };
  }, [selectedPackage?.name]);

  if (!selectedPackage || !selectedVersion) {
    navigate('/');
    return null;
  }

  const [inCart, setInCart] = useState(false);

  useEffect(() => {
    if (selectedVersion?.tebexPackageId) {
      setInCart(isInCart(selectedVersion.tebexPackageId));
    }
  }, [selectedVersion?.tebexPackageId, isInCart]);

  const mediaItems = selectedPackage.media ?? selectedPackage.images?.map(url => ({ type: 'image', name: '', url })) ?? [];

  const [isFading, setIsFading] = useState(false);

  const changeImage = (newIndex: number) => {
    if (newIndex === currentProductImageIndex) return;
    setIsFading(true);
    setTimeout(() => {
      setCurrentProductImageIndex(newIndex);
      setIsFading(false);
    }, 200);
  };

  const nextProductImage = () => {
    if (mediaItems.length > 1) {
      changeImage((currentProductImageIndex + 1) % mediaItems.length);
    }
  };

  const prevProductImage = () => {
    if (mediaItems.length > 1) {
      changeImage((currentProductImageIndex - 1 + mediaItems.length) % mediaItems.length);
    }
  };

  // ===== Lightbox state =====
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Close on Escape, navigate with arrows, lock body scroll while open
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowRight') {
        if (mediaItems.length > 1) {
          changeImage((currentProductImageIndex + 1) % mediaItems.length);
        }
      } else if (e.key === 'ArrowLeft') {
        if (mediaItems.length > 1) {
          changeImage((currentProductImageIndex - 1 + mediaItems.length) % mediaItems.length);
        }
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, currentProductImageIndex, mediaItems.length]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 relative z-10 font-sans selection:bg-primary-orange/30">
      {/* Same background as homepage */}
      <div className="fixed inset-0 grid-background opacity-20 pointer-events-none" />
      <div className="fixed inset-0 hero-gradient-enhanced pointer-events-none" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="geometric-shape geometric-shape-1" />
        <div className="geometric-shape geometric-shape-2" />
        <div className="geometric-shape geometric-shape-3" />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-20 sm:py-28 lg:py-32 relative z-10">
        
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          <nav aria-label="Breadcrumb" className="mb-3 sm:mb-4">
            <ol className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 flex-wrap">
              <li className="flex items-center gap-2">
                <button onClick={() => navigate(-1)} className="hover:text-zinc-300 transition-colors">
                  <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <ChevronRight className="h-3 w-3" />
              </li>
              {fromScripts && (
                <li className="flex items-center gap-2">
                  <button onClick={() => navigate('/scripts')} className="hover:text-zinc-300 transition-colors">Scripts</button>
                  <ChevronRight className="h-3 w-3" />
                </li>
              )}
              <li className="text-zinc-300 font-medium truncate max-w-[180px] sm:max-w-none">{baseName}</li>
            </ol>
          </nav>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight break-words">{baseName}</h1>
          <div className="flex gap-1.5 sm:gap-2 mt-3 sm:mt-4 flex-wrap">
            {selectedPackage.frameworks.map((framework) => (
              <span key={framework} className="px-2.5 sm:px-3 py-1 rounded bg-zinc-800 border border-zinc-700 text-[10px] sm:text-xs font-bold text-zinc-300 uppercase tracking-wider">
                {framework}
              </span>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12">
          
          {/* LEFT COLUMN - Media & Features */}
          <div className="lg:col-span-8 space-y-6 sm:space-y-8">
            {/* Main Media Player */}
            <div className="rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-2xl shadow-black/50 group relative">
              <div className="aspect-video relative">
                <img
                  src={mediaItems[currentProductImageIndex]?.url ?? selectedPackage.image}
                  alt={selectedPackage.name}
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setIsLightboxOpen(true)}
                />

                {/* Expand button — appears on hover */}
                <button
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/10 hover:border-white/30 rounded-lg text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105"
                  aria-label="Expand image"
                  title="Click to expand"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Expand</span>
                </button>

                <div className={`absolute inset-0 bg-black pointer-events-none transition-opacity duration-200 ${isFading ? 'opacity-100' : 'opacity-0'}`} />

                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

                {mediaItems.length > 1 && (
                  <>
                    <button
                      onClick={prevProductImage}
                      className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                      onClick={nextProductImage}
                      className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Thumbnails — smaller on mobile, horizontally scrollable */}
            {mediaItems.length > 1 && (
              <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-4 overflow-x-auto py-2 px-1 scrollbar-thin scrollbar-thumb-zinc-700 -mx-1">
                {mediaItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => changeImage(index)}
                    className={`relative aspect-video rounded-lg border-2 transition-all duration-300 hover:shadow-xl flex-shrink-0 w-20 sm:w-28 lg:w-36 ${
                      index === currentProductImageIndex
                        ? 'border-primary-orange shadow-sm shadow-primary-orange/40 scale-105 ring-2 ring-primary-orange/30 opacity-100'
                        : 'border-white/10 shadow-sm opacity-60 hover:opacity-100 hover:scale-105 hover:border-white/30 hover:shadow-white/10'
                    }`}
                  >
                    <img src={item.url} alt="" className="w-full h-full object-cover rounded-md" />
                  </button>
                ))}
              </div>
            )}

            {/* Key Features */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 sm:p-6 md:p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary-orange" />
                Key Features
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                {(() => {
                  let features: string[] = [];

                  if (documentation?.subsections) {
                    const aboutSubsection = documentation.subsections.find(sub =>
                      sub.title.toLowerCase().includes('about')
                    );

                    if (aboutSubsection?.sections) {
                      const overviewSection = aboutSubsection.sections.find(s =>
                        s.title.toLowerCase().includes('overview') && s.type === 'text'
                      );

                      if (overviewSection?.content) {
                        const content = overviewSection.content;
                        const featuresMatch = content.match(/Features?:([\s\S]*?)(?=\n\n|$)/i);

                        if (featuresMatch && featuresMatch[1]) {
                          features = featuresMatch[1]
                            .split(/\n/)
                            .map((line: string) => line.trim())
                            .filter((line: string) => line.startsWith('•') || line.startsWith('-'))
                            .map((line: string) => line.replace(/^[•\-]\s*/, '').trim())
                            .filter(Boolean);
                        }
                      }
                    }
                  }

                  if (features.length === 0) {
                    features = [
                      "Optimized for 0.00ms resmon",
                      "Fully Configurable via config.lua",
                      "Secure server-side validation",
                      "Clean and modern User Interface",
                      "Compatible with ESX & QB-Core",
                      "Regular updates & support"
                    ];
                  }

                  return features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                      <div className="mt-1 w-5 h-5 rounded-full bg-primary-orange/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-primary-orange" />
                      </div>
                      <span className="text-zinc-300 text-sm font-medium">{feature}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
           
            {/* Documentation Tabs */}
            {(docsLoading || documentation) && (
              <div className="pt-6 sm:pt-8 border-t border-zinc-800">
                <div className="w-full mb-6 sm:mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Detailed Breakdown</h2>
                  <div className="w-16 h-1 bg-primary-orange rounded-full"></div>
                </div>

                {docsLoading ? (
                  <div className="h-40 flex items-center justify-center text-zinc-500 bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800">Loading details...</div>
                ) : (
                  <div className="bg-[#0e0e10] border border-zinc-800 rounded-2xl p-2">
                    <DocumentationTabs resource={documentation!} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Purchase & Info */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Purchase Card */}
            <div className="bg-[#111] border border-zinc-800 rounded-xl p-4 sm:p-6 lg:sticky lg:top-24 shadow-xl">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Select Version</h2>
                
                <div className="space-y-3">
                  {escrowVersion && (
                    <div 
                      onClick={() => setSelectedVersion(escrowVersion)}
                      className={`cursor-pointer group relative p-4 rounded-lg border-2 transition-all duration-200 ${
                        selectedVersion?.tebexPackageId === escrowVersion.tebexPackageId
                          ? 'border-white bg-zinc-900'
                          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-bold text-base">Escrow</div>
                          <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Protected Code
                          </div>
                        </div>
                        <div className="text-xl font-bold text-white">
                          {escrowVersion.price === 0 ? 'Free' : `€${escrowVersion.price.toFixed(2)}`}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {openSourceVersion && (
                    <div 
                      onClick={() => setSelectedVersion(openSourceVersion)}
                      className={`cursor-pointer group relative p-4 rounded-lg border-2 transition-all duration-200 ${
                        selectedVersion?.tebexPackageId === openSourceVersion.tebexPackageId
                          ? 'border-white bg-zinc-900'
                          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-bold text-base">Open Source</div>
                          <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Full Code Access
                          </div>
                        </div>
                        <div className="text-xl font-bold text-white">
                          {openSourceVersion.price === 0 ? 'Free' : `€${openSourceVersion.price.toFixed(2)}`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-zinc-800 my-6"></div>

              <button
                onClick={async () => {
                  if (!isLoggedIn) { login(); return; }
                  if (!inCart && selectedVersion.tebexPackageId) {
                    setIsAdding(true);
                    await addToCart({
                      id: selectedVersion.tebexPackageId,
                      name: selectedVersion.name,
                      price: selectedVersion.price,
                      currency: 'EUR',
                      image: selectedVersion.image,
                      qty: 1,
                      category: selectedVersion.category,
                    });
                    setIsAdding(false);
                  }
                }}
                disabled={inCart || isAdding}
                className={`w-full h-14 text-base font-bold uppercase tracking-wide rounded hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 
                  ${inCart 
                    ? 'bg-zinc-800 text-zinc-300 cursor-default' 
                    : 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                  }`}
              >
                {inCart ? (
                  <><Check className="w-5 h-5" /> In Cart</>
                ) : isAdding ? (
                  <><ShoppingCart className="w-5 h-5 animate-bounce" /> Processing...</>
                ) : (
                  <><ShoppingCart className="w-5 h-5" /> Add to Cart</>
                )}
              </button>
              
              <div className="mt-4 text-center">
                <p className="text-xs text-zinc-500">Instant delivery via email & Keymaster</p>
              </div>
            </div>

            {/* Description Card */}
            <div className="bg-[#111] border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-3">Description</h3>
              <div className="prose prose-invert prose-sm max-w-none text-zinc-400 leading-relaxed">
                <p>{selectedPackage.fullDescription}</p>
                
                {!selectedPackage.fullDescription && (
                  <p>Enhance your server with this premium resource. Featuring high performance, easy configuration, and professional support.</p>
                )}
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-[#111] border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Product Info</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                  <span className="text-sm text-zinc-500 flex items-center gap-2">
                    <Server className="w-4 h-4" /> Compatibility
                  </span>
                  <span className="text-xs font-medium text-white text-right max-w-[60%] truncate">
                    {documentation?.compatibility && documentation.compatibility.length > 0
                      ? documentation.compatibility.join(' / ')
                      : 'QBCore / ESX'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                  <span className="text-sm text-zinc-500 flex items-center gap-2">
                    <Info className="w-4 h-4" /> Version
                  </span>
                  <span className="text-sm font-medium text-white">
                    {documentation?.version
                      ? `${documentation.version} (Latest)`
                      : '1.0.0 (Latest)'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-500 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Support
                  </span>
                  <span className="text-sm font-medium text-green-400">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* LIGHTBOX — rendered via Portal directly into <body>           */}
      {/* This escapes any parent stacking-context / overflow issues.   */}
      {/* ============================================================ */}
      {isLightboxOpen && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setIsLightboxOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'lightboxFadeIn 0.25s ease-out',
          }}
        >
          {/* Inline animation keyframes */}
          <style>{`
            @keyframes lightboxFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes lightboxImageZoom {
              from { opacity: 0; transform: scale(0.92); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(false);
            }}
            style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10 }}
            className="w-12 h-12 bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
            aria-label="Close lightbox"
            title="Close (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Image counter */}
          {mediaItems.length > 1 && (
            <div
              style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10 }}
              className="px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-white text-sm font-medium"
            >
              {currentProductImageIndex + 1} <span className="text-white/40">/</span> {mediaItems.length}
            </div>
          )}

          {/* Prev button */}
          {mediaItems.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevProductImage();
              }}
              style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
              className="w-14 h-14 bg-white/5 hover:bg-white/15 backdrop-blur-md border border-white/10 hover:border-white/30 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}

          {/* IMAGE — using inline styles to bypass any tailwind/CSS conflicts */}
          <img
            src={mediaItems[currentProductImageIndex]?.url ?? selectedPackage.image}
            alt={selectedPackage.name}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.95)',
              cursor: 'default',
              animation: 'lightboxImageZoom 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
              display: 'block',
            }}
          />

          {/* Next button */}
          {mediaItems.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextProductImage();
              }}
              style={{ position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
              className="w-14 h-14 bg-white/5 hover:bg-white/15 backdrop-blur-md border border-white/10 hover:border-white/30 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
              aria-label="Next image"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          )}

          {/* Hint */}
          <div
            style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
            className="px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-white/60 text-xs font-medium"
          >
            Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">Esc</kbd> to close
            {mediaItems.length > 1 && (
              <> · <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">←</kbd> <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">→</kbd> to navigate</>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PackageDetailsPage;
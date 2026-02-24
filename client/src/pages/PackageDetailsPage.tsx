import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ShoppingCart, Check, Home, Shield, Zap, Server, Info, FileText } from 'lucide-react';
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

  // Always resolve from fresh packages prop (has up-to-date media/images).
  // location.state?.package is only used as a last resort if packages haven't loaded yet.
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

  // Find all package variants (Escrow and Open Source)
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

  // State for selected version (default to the clicked package)
  const [selectedVersion, setSelectedVersion] = useState<Package | undefined>(selectedPackage);

  // Update selected version when package variants are found
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

  // Track package view when user opens package details page
  useEffect(() => {
    if (!selectedPackage?.name) return;
    let active = true;
    // Defer slightly so StrictMode cleanup can cancel before the call fires
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

  // Debug logging for documentation structure
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

  // 📊 Record package view on mount/change.
  // AbortController ensures that React StrictMode's double-invocation only
  // sends one request: the first fetch is aborted during cleanup, the second
  // (real) mount completes successfully.
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

  // Make inCart reactive to cart changes
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

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 relative z-10 font-sans selection:bg-primary-orange/30">
        {/* Subtle Background Elements */}
        <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary-orange/5 to-transparent pointer-events-none" />
        
      <div className="max-w-[1400px] mx-auto px-6 py-32 relative">
        
        {/* Header Section */}
        <div className="mb-8">
            <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-2 text-sm text-zinc-500">
                <li className="flex items-center gap-2">
                <button onClick={() => navigate(-1)} className="hover:text-zinc-300 transition-colors">
                    <Home className="h-4 w-4" />
                </button>
                <ChevronRight className="h-3 w-3" />
                </li>
                {fromScripts && (
                    <li className="flex items-center gap-2">
                    <button onClick={() => navigate('/scripts')} className="hover:text-zinc-300 transition-colors">Scripts</button>
                    <ChevronRight className="h-3 w-3" />
                    </li>
                )}
                <li className="text-zinc-300 font-medium">{baseName}</li>
            </ol>
            </nav>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">{baseName}</h1>
            <div className="flex gap-2 mt-4">
                {selectedPackage.frameworks.map((framework) => (
                    <span key={framework} className="px-3 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        {framework}
                    </span>
                ))}
            </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* LEFT COLUMN - Media & Features (Wider: 8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Main Media Player Look */}
            <div className="rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-2xl shadow-black/50 group relative">
                <div className="aspect-video relative">
                    <img
                        src={mediaItems[currentProductImageIndex]?.url ?? selectedPackage.image}
                        alt={selectedPackage.name}
                        className="w-full h-full object-cover"
                    />

                    {/* Fade-to-black transition overlay */}
                    <div className={`absolute inset-0 bg-black pointer-events-none transition-opacity duration-200 ${isFading ? 'opacity-100' : 'opacity-0'}`} />

                    {/* Dark gradient overlay at bottom for cinematic feel */}
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

                    {mediaItems.length > 1 && (
                        <>
                        <button
                            onClick={prevProductImage}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all opacity-0 group-hover:opacity-100"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={nextProductImage}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all opacity-0 group-hover:opacity-100"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        </>
                    )}
                </div>
            </div>

            {/* Thumbnails */}
            {mediaItems.length > 1 && (
                <div className="flex gap-3 mt-4 overflow-x-auto py-2 px-1 scrollbar-thin scrollbar-thumb-zinc-700">
                {mediaItems.map((item, index) => (
                    <button
                    key={index}
                    onClick={() => changeImage(index)}
                    className={`relative aspect-video rounded-lg border-2 transition-all duration-300 hover:shadow-xl flex-shrink-0 w-28 lg:w-36 ${
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

            {/* Key Features List (Styled like Reference Left Bottom) */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 md:p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary-orange" />
                    Key Features
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                    {(() => {
                        // Extract features from documentation
                        let features: string[] = [];

                        if (documentation?.subsections) {
                            // Look for "About" subsection
                            const aboutSubsection = documentation.subsections.find(sub =>
                                sub.title.toLowerCase().includes('about')
                            );

                            if (aboutSubsection?.sections) {
                                // Find "Overview" section inside About subsection
                                const overviewSection = aboutSubsection.sections.find(s =>
                                    s.title.toLowerCase().includes('overview') && s.type === 'text'
                                );

                                if (overviewSection?.content) {
                                    // Look for "Features:" section in content
                                    const content = overviewSection.content;
                                    const featuresMatch = content.match(/Features?:([\s\S]*?)(?=\n\n|$)/i);

                                    if (featuresMatch && featuresMatch[1]) {
                                        // Split by bullet points (•) or newlines starting with •
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

                        // Fallback to default features if none found
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
           
            {/* Documentation Tabs Area */}
            {(docsLoading || documentation) && (
            <div className="pt-8 border-t border-zinc-800">
                 <div className="w-full mb-8">
                    <h2 className="text-3xl font-bold mb-4">Detailed Breakdown</h2>
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

          {/* RIGHT COLUMN - Purchase & Info (Narrower: 4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Purchase Card */}
            <div className="bg-[#111] border border-zinc-800 rounded-xl p-6 sticky top-24 shadow-xl">
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

            {/* 2. Description Card */}
            <div className="bg-[#111] border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-3">Description</h3>
                <div className="prose prose-invert prose-sm max-w-none text-zinc-400 leading-relaxed">
                    <p>{selectedPackage.fullDescription}</p>
                    
                    {/* Fallback description text if the prop is short */}
                    {!selectedPackage.fullDescription && (
                        <p>Enhance your server with this premium resource. Featuring high performance, easy configuration, and professional support.</p>
                    )}
                </div>
            </div>

            {/* 3. Info / Stats Card */}
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
    </div>
  );
};

export default PackageDetailsPage;
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ShoppingCart, Check, Home } from 'lucide-react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Package } from '../types';
import { useTebex } from '../context/TebexContext';
import { useDocumentation } from '../hooks/useDocumentation';
import DocumentationTabs from '../components/DocumentationTabs';
import { API_URL } from '../config/api';

interface PackageDetailsPageProps {
  packages: Package[];
}

const PackageDetailsPage: React.FC<PackageDetailsPageProps> = ({ packages }) => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, addToCart, isInCart, login } = useTebex();
  const [isAdding, setIsAdding] = useState(false);
  const [currentProductImageIndex, setCurrentProductImageIndex] = useState(0);

  // Try to get package from location state first, then fallback to finding by slug
  const selectedPackage: Package | undefined = location.state?.package || packages.find(pkg => {
    const slug = pkg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return slug === productSlug;
  });

  // Check if user came from scripts page
  const fromScripts = location.state?.fromScripts || false;

  // Fetch documentation for this package
  const { documentation, loading: docsLoading, error: docsError } = useDocumentation(selectedPackage?.name || '');

  // 📊 Record package view on mount/change
  useEffect(() => {
    if (selectedPackage?.name) {
      console.log(`📊 [VIEW] User viewing package details page: ${selectedPackage.name}`);
      const recordView = async () => {
        try {
          const response = await fetch(`${API_URL}/orders/stats/record-view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ packageName: selectedPackage.name })
          });
          if (response.ok) {
            console.log(`✅ [STATS] Successfully recorded package view: ${selectedPackage.name}`);
          } else {
            console.warn(`⚠️ [STATS] Failed to record view (HTTP ${response.status}): ${selectedPackage.name}`);
          }
        } catch (error) {
          console.error(`❌ [STATS] Failed to record package view:`, error);
        }
      };
      recordView();
    }
  }, [selectedPackage?.name]);

  // If package not found, redirect to home
  if (!selectedPackage) {
    navigate('/');
    return null;
  }

  const inCart = selectedPackage.tebexPackageId ? isInCart(selectedPackage.tebexPackageId) : false;

  const nextProductImage = () => {
    if (selectedPackage.images) {
      setCurrentProductImageIndex((currentProductImageIndex + 1) % selectedPackage.images.length);
    }
  };

  const prevProductImage = () => {
    if (selectedPackage.images) {
      setCurrentProductImageIndex((currentProductImageIndex - 1 + selectedPackage.images.length) % selectedPackage.images.length);
    }
  };


  return (
    <div className="min-h-screen page-gradient relative z-10">
      <div className="max-w-7xl mx-auto px-6 py-32">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1 hover:text-foreground hover:scale-105 transition-all duration-200 active:scale-95"
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </button>
              <ChevronRight className="h-4 w-4" />
            </li>
            {fromScripts && (
                <li className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/scripts')}
                    className="hover:text-foreground hover:scale-105 transition-all duration-200 active:scale-95"
                  >
                    Scripts
                  </button>
                  <ChevronRight className="h-4 w-4" />
                </li>
              )}
            <li className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">
              {selectedPackage.name}
            </li>
          </ol>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Side - Images */}
          <div className="space-y-6">
            <div className="aspect-video rounded-3xl overflow-hidden relative glass-effect">
              <img
                src={selectedPackage.images![currentProductImageIndex]}
                alt={selectedPackage.name}
                className="w-full h-full object-cover"
              />

              {selectedPackage.images!.length > 1 && (
                <>
                  <button
                    onClick={prevProductImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 glass-effect rounded-full flex items-center justify-center hover:bg-white/10 transition-all duration-300"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>

                  <button
                    onClick={nextProductImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 glass-effect rounded-full flex items-center justify-center hover:bg-white/10 transition-all duration-300"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                </>
              )}
            </div>

            {selectedPackage.images && selectedPackage.images.length > 1 && (
              <div className="relative">
                <div className="overflow-x-auto scrollbar-hide" dir="ltr" data-slot="scroll-area" style={{ position: 'relative' }}>
                  <div className="flex gap-2 lg:gap-3 py-2 px-1">
                    {selectedPackage.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentProductImageIndex(index)}
                        className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all duration-300 hover:shadow-xl flex-shrink-0 w-28 lg:w-36 ${
                          index === currentProductImageIndex
                            ? 'border-primary-orange shadow-sm shadow-primary-orange/40 scale-105 ring-2 ring-primary-orange/30'
                            : 'border-white/10 shadow-sm opacity-60 hover:opacity-100 hover:scale-105 hover:border-primary-orange/50 hover:shadow-primary-orange/20'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${selectedPackage.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

            {/* Right Side - Info */}
          <div className="space-y-8">
            <div className="flex gap-2 flex-wrap">
              {selectedPackage.frameworks.map((framework) => (
                <span
                  key={framework}
                  className="inline-flex items-center justify-center rounded-full border w-fit whitespace-nowrap shrink-0 gap-1 text-xs font-bold border-white/30 text-white bg-white/5 hover:bg-white/10 px-3 py-1 transition-all uppercase"
                >
                  {framework}
                </span>
              ))}
            </div>

            <div>
              <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight font-display">
                {selectedPackage.name}
              </h1>

              <div className="flex items-baseline gap-4 flex-wrap mt-6">
                <span className="text-2xl lg:text-3xl font-black text-primary-orange tracking-tight">
                  {selectedPackage.price.toFixed(2)} EUR
                </span>
                <span className="text-lg lg:text-xl text-neutral-500 line-through opacity-80">
                  {selectedPackage.originalPrice.toFixed(2)} EUR
                </span>
                <span className="inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs w-fit whitespace-nowrap shrink-0 border-transparent bg-primary-orange text-black font-bold relative bottom-1">
                  -{Math.round(((selectedPackage.originalPrice - selectedPackage.price) / selectedPackage.originalPrice) * 100)}%
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (!isLoggedIn) {
                      login();
                      return;
                    }
                    if (!inCart && selectedPackage.tebexPackageId) {
                      setIsAdding(true);
                      addToCart({
                        id: selectedPackage.tebexPackageId,
                        name: selectedPackage.name,
                        price: selectedPackage.price,
                        currency: 'EUR',
                        image: selectedPackage.image,
                        qty: 1,
                        category: selectedPackage.category,
                      });
                      setTimeout(() => setIsAdding(false), 1000);
                    }
                  }}
                  disabled={inCart}
                  className="whitespace-nowrap text-sm disabled:pointer-events-none disabled:opacity-50 shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] h-10 rounded-md has-[>svg]:px-4 relative overflow-hidden font-bold transition-all duration-300 hover:cursor-pointer bg-gradient-to-r from-primary-orange via-orange-500 to-primary-orange text-white border-2 border-primary-orange hover:scale-105 hover:shadow-lg hover:shadow-primary-orange/50 active:scale-95 flex items-center justify-center gap-2.5 px-8"
                >
                  {inCart ? (
                    <>
                      <Check className="h-5 w-5" />
                      Added to Cart
                    </>
                  ) : isAdding ? (
                    <>
                      <ShoppingCart className="h-5 w-5 animate-bounce" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5" />
                      Add to Cart
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-4 lg:pt-6 space-y-3">
              <h2 className="text-xl lg:text-2xl font-bold text-white">Resource Description</h2>
              <p className="text-sm lg:text-base text-white/80 leading-relaxed font-light">
                {selectedPackage.fullDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="sep my-12"></div>

        {/* Intro Text from Documentation */}
        {!docsLoading && documentation && (
          <div className="prose prose-invert prose-lg mx-auto text-center max-w-7xl [&_p]:text-elegant-cream/90 [&_p]:leading-relaxed [&_p]:mb-6 [&_p]:font-light [&_p]:tracking-wide [&_p]:text-balance [&_strong]:text-elegant-cream [&_strong]:font-semibold [&_em]:text-accent-gold [&_em]:not-italic [&_ul]:list-none [&_ul]:space-y-3 [&_li]:pl-6 [&_li]:relative [&_li]:before:content-['→'] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:text-accent-gold">
            <p>{documentation.description}</p>
          </div>
        )}

        <div className="sep my-12"></div>
        <br></br>
        <div className="w-[95%] mx-auto text-foreground min-h-96 rounded-lg">
          <div className="w-full mb-16 text-center">
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-black mb-4 gradient-text-brand leading-none tracking-tighter font-display">
              Product Features
            </h2>
            <div className="w-24 h-1 mx-auto bg-gradient-to-r from-transparent via-primary-orange to-transparent rounded-full"></div>
          </div>

          {/* Documentation Tabs */}
          {docsLoading ? (
            <div className="text-center py-12">
              <p className="text-white/60">Loading documentation...</p>
            </div>
          ) : documentation ? (
            <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-8">
              <DocumentationTabs resource={documentation} />
            </div>
          ) : !docsError ? (
            /* Fallback to hardcoded features if no documentation */
            <>
              {/* Feature 1 */}
              <section className="relative w-full py-2 pb-12">
                <div className="mx-auto max-w-7xl bg-zinc-900/40 border-white/10 overflow-hidden group hover:border-primary-orange/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-orange/10 backdrop-blur-sm rounded-2xl py-0 border border-card">
                  <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center p-2">
                    <div className="order-2 md:order-1">
                      <div className="w-full h-64 md:h-80 lg:h-96 p-0 m-0 rounded-2xl shadow-md mx-auto overflow-hidden relative group shadow-xl hover:shadow-2xl transition-shadow duration-300 ease-in-out">
                        <img alt="Asset" className="w-full h-full object-cover object-center" src="https://i.imgur.com/LVePQtC.jpeg" />
                      </div>
                    </div>
                    <div className="order-1 md:order-2">
                      <div className="space-y-6 text-left max-w-lg mx-auto md:mx-0 md:ml-0 md:mr-auto">
                        <div className="w-full text-2xl md:text-3xl lg:text-4xl font-bold text-left text-foreground leading-normal tracking-normal leading-tight tracking-tight">
                          <p className="outline-none min-h-[1.2em] w-full">Full Metadata Integration Across Apps</p>
                        </div>
                        <div className="w-full text-base md:text-lg lg:text-xl font-normal text-left text-muted-foreground leading-normal tracking-normal leading-relaxed opacity-90">
                          <p className="outline-none min-h-[1.2em] w-full">Apps access live job, account, and character data, enabling dynamic features such as job-only menus, live stats, or conditional access.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Feature 2 */}
              <section className="relative w-full py-2 mb-6">
                <div className="mx-auto max-w-7xl bg-zinc-900/40 border-white/10 overflow-hidden group hover:border-primary-orange/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-orange/10 backdrop-blur-sm rounded-2xl py-0 border border-card">
                  <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center p-2">
                    <div className="order-1 md:order-2">
                      <div className="w-full h-64 md:h-80 lg:h-96 p-0 m-0 rounded-2xl shadow-md mx-auto overflow-hidden relative group shadow-xl hover:shadow-2xl transition-shadow duration-300 ease-in-out">
                        <img alt="Asset" className="w-full h-full object-cover object-center" src="https://i.imgur.com/LVePQtC.jpeg" />
                      </div>
                    </div>
                    <div className="order-2 md:order-1">
                      <div className="space-y-6 text-left md:text-right max-w-lg mx-auto md:mx-0 md:mr-0 md:ml-auto">
                        <div className="w-full text-2xl md:text-3xl lg:text-4xl font-bold text-left text-foreground leading-normal tracking-normal leading-tight tracking-tight">
                          <p className="outline-none min-h-[1.2em] w-full">Large Collection of Hyper-Realistic Apps</p>
                        </div>
                        <div className="w-full text-base md:text-lg lg:text-xl font-normal text-left text-muted-foreground leading-normal tracking-normal leading-relaxed opacity-90">
                          <p className="outline-none min-h-[1.2em] w-full">The system includes a wide range of polished, real-world-inspired apps—banking, maps, messages, mail, social media, emergency tools, and more—each built with modern UI and immersive functionality.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Feature 3 */}
              <section className="relative w-full py-2 mb-6">
                <div className="mx-auto max-w-7xl bg-zinc-900/40 border-white/10 overflow-hidden group hover:border-primary-orange/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-orange/10 backdrop-blur-sm rounded-2xl py-0 border border-card">
                  <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center p-2">
                    <div className="order-2 md:order-1">
                      <div className="w-full h-64 md:h-80 lg:h-96 p-0 m-0 rounded-2xl shadow-md mx-auto overflow-hidden relative group shadow-xl hover:shadow-2xl transition-shadow duration-300 ease-in-out">
                        <img alt="Asset" className="w-full h-full object-cover object-center" src="https://i.imgur.com/LVePQtC.jpeg" />
                      </div>
                    </div>
                    <div className="order-1 md:order-2">
                      <div className="space-y-6 text-left max-w-lg mx-auto md:mx-0 md:ml-0 md:mr-auto">
                        <div className="w-full text-2xl md:text-3xl lg:text-4xl font-bold text-left text-foreground leading-normal tracking-normal leading-tight tracking-tight">
                          <p className="outline-none min-h-[1.2em] w-full">Advanced Camera With Streaming & Gallery</p>
                        </div>
                        <div className="w-full text-base md:text-lg lg:text-xl font-normal text-left text-muted-foreground leading-normal tracking-normal leading-relaxed opacity-90">
                          <p className="outline-none min-h-[1.2em] w-full">Players can take photos, record or stream content, and manage a full gallery with saved images, offering creative tools for RP, reporting, or events.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Feature 4 */}
              <section className="relative w-full py-2 mb-6">
                <div className="mx-auto max-w-7xl bg-zinc-900/40 border-white/10 overflow-hidden group hover:border-primary-orange/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-orange/10 backdrop-blur-sm rounded-2xl py-0 border border-card">
                  <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center p-2">
                    <div className="order-1 md:order-2">
                      <div className="w-full h-64 md:h-80 lg:h-96 p-0 m-0 rounded-2xl shadow-md mx-auto overflow-hidden relative group shadow-xl hover:shadow-2xl transition-shadow duration-300 ease-in-out">
                        <img alt="Asset" className="w-full h-full object-cover object-center" src="https://i.imgur.com/LVePQtC.jpeg" />
                      </div>
                    </div>
                    <div className="order-2 md:order-1">
                      <div className="space-y-6 text-left md:text-right max-w-lg mx-auto md:mx-0 md:mr-0 md:ml-auto">
                        <div className="w-full text-2xl md:text-3xl lg:text-4xl font-bold text-left text-foreground leading-normal tracking-normal leading-tight tracking-tight">
                          <p className="outline-none min-h-[1.2em] w-full">Customizable Widgets & Home Personalization</p>
                        </div>
                        <div className="w-full text-base md:text-lg lg:text-xl font-normal text-left text-muted-foreground leading-normal tracking-normal leading-relaxed opacity-90">
                          <p className="outline-none min-h-[1.2em] w-full">Users personalize their homescreen with widgets, themes, and shortcuts, making each phone feel unique and tailored to their playstyle.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Feature 5 */}
              <section className="relative w-full py-2 mb-6">
                <div className="mx-auto max-w-7xl bg-zinc-900/40 border-white/10 overflow-hidden group hover:border-primary-orange/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-orange/10 backdrop-blur-sm rounded-2xl py-0 border border-card">
                  <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center p-2">
                    <div className="order-2 md:order-1">
                      <div className="w-full h-64 md:h-80 lg:h-96 p-0 m-0 rounded-2xl shadow-md mx-auto overflow-hidden relative group shadow-xl hover:shadow-2xl transition-shadow duration-300 ease-in-out">
                        <img alt="Asset" className="w-full h-full object-cover object-center" src="https://i.imgur.com/LVePQtC.jpeg" />
                      </div>
                    </div>
                    <div className="order-1 md:order-2">
                      <div className="space-y-6 text-left max-w-lg mx-auto md:mx-0 md:ml-0 md:mr-auto">
                        <div className="w-full text-2xl md:text-3xl lg:text-4xl font-bold text-left text-foreground leading-normal tracking-normal leading-tight tracking-tight">
                          <p className="outline-none min-h-[1.2em] w-full">Create Folders to Organize Your Apps</p>
                        </div>
                        <div className="w-full text-base md:text-lg lg:text-xl font-normal text-left text-muted-foreground leading-normal tracking-normal leading-relaxed opacity-90">
                          <p className="outline-none min-h-[1.2em] w-full">Players can group apps into folders for cleaner navigation, organization, and a more realistic smartphone experience.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Feature 6 */}
              <section className="relative w-full py-2 pb-12">
                <div className="mx-auto max-w-7xl bg-zinc-900/40 border-white/10 overflow-hidden group hover:border-primary-orange/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-orange/10 backdrop-blur-sm rounded-2xl py-0 border border-card">
                  <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center p-2">
                    <div className="order-1 md:order-2">
                      <div className="w-full h-64 md:h-80 lg:h-96 p-0 m-0 rounded-2xl shadow-md mx-auto overflow-hidden relative group shadow-xl hover:shadow-2xl transition-shadow duration-300 ease-in-out">
                        <img alt="Asset" className="w-full h-full object-cover object-center" src="https://i.imgur.com/LVePQtC.jpeg" />
                      </div>
                    </div>
                    <div className="order-2 md:order-1">
                      <div className="space-y-6 text-left md:text-right max-w-lg mx-auto md:mx-0 md:mr-0 md:ml-auto">
                        <div className="w-full text-2xl md:text-3xl lg:text-4xl font-bold text-left text-foreground leading-normal tracking-normal leading-tight tracking-tight">
                          <p className="outline-none min-h-[1.2em] w-full">Strong Security & Custom App Template</p>
                        </div>
                        <div className="w-full text-base md:text-lg lg:text-xl font-normal text-left text-muted-foreground leading-normal tracking-normal leading-relaxed opacity-90">
                          <p className="outline-none min-h-[1.2em] w-full">Includes PIN, password, and recovery systems, plus a developer-ready template for creating custom apps with minimal setup.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-white/60">Failed to load features. Please try refreshing the page.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PackageDetailsPage;

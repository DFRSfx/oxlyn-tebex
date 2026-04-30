import React, { useState, useEffect } from 'react';
import { ChevronDown, Sparkles, ShoppingCart, Users, ArrowRight, Clock, CreditCard, Shield, Wrench, Code2, Zap, Star, Terminal } from 'lucide-react';
import { Package } from '../types';
import FeatureCard from '../components/FeatureCard';
import PackageCard from '../components/PackageCard';

interface HomePageProps {
  isLoaded: boolean;
  packages: Package[];
  navigateToScripts: () => void;
  openPackageDetails: (pkg: Package) => void;
  handleDiscordRedirect: () => void;
}

const HomePage: React.FC<HomePageProps> = ({
  isLoaded,
  packages,
  navigateToScripts,
  openPackageDetails,
  handleDiscordRedirect,
}) => {
  const [typewriterText, setTypewriterText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const fullText = 'Professional quality guaranteed.';

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (!isDeleting && typewriterText === fullText) {
      timeout = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && typewriterText === '') {
      timeout = setTimeout(() => setIsDeleting(false), 500);
    } else {
      const nextChar = isDeleting
        ? typewriterText.slice(0, -1)
        : fullText.slice(0, typewriterText.length + 1);
      
      timeout = setTimeout(() => {
        setTypewriterText(nextChar);
      }, isDeleting ? 50 : 100);
    }

    return () => clearTimeout(timeout);
  }, [typewriterText, isDeleting, fullText]);

  // Deduplicate packages by base name, keeping the one with the lowest price
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

  const features = [
    {
      icon: Clock,
      title: "Instant Delivery",
      description: "Available within minutes in your Cfx.re Keymaster account."
    },
    {
      icon: CreditCard,
      title: "No Price Increases",
      description: "No price increases while you remain subscribed. Cancel anytime."
    },
    {
      icon: Shield,
      title: "Secure & Performant",
      description: "Low resmon usage, secured events & designed for scale."
    },
    {
      icon: Wrench,
      title: "Easy Setup",
      description: "Quick and easy setup, with support available 7 days a week."
    }
  ];

  return (
    <>
      {/* Enhanced Hero Section with Grid Background */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        id="hero"
      >
        {/* Animated Grid Background */}
        <div className="absolute inset-0 grid-background opacity-20" />
        
        {/* Gradient Overlays */}
        <div className="hero-gradient-enhanced absolute inset-0" />
        
        {/* Floating Geometric Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="geometric-shape geometric-shape-1" />
          <div className="geometric-shape geometric-shape-2" />
          <div className="geometric-shape geometric-shape-3" />
        </div>

        <div className={`relative z-10 text-center max-w-7xl mx-auto px-6 transition-all duration-1600 ${isLoaded ? 'apple-slide-up' : 'opacity-0 translate-y-20'}`} style={{ transitionDelay: '400ms' }}>
          
          {/* Main Heading - Single Line Format */}
          <h1 className="text-7xl md:text-9xl font-black mb-6 text-white leading-none tracking-tighter">
            <span className="gradient-text-brand">OXLYN</span>
            <span className="text-white"> Software</span>
          </h1>

          <p className="text-xl md:text-2xl mb-6 text-gray-300 font-light max-w-3xl mx-auto leading-relaxed">
            Premium Scripts for FiveM Servers
          </p>

          <p className="text-base md:text-lg mb-6 text-gray-400 font-light max-w-4xl mx-auto leading-relaxed">
            We develop high-quality, secure and optimized scripts to elevate your FiveM server experience.
          </p>

          {/* Typewriter Effect */}
          <div className="mb-12 flex justify-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-black/60 border border-orange-500/30 font-mono text-base backdrop-blur-sm">
              <Terminal className="w-4 h-4 text-orange-400" />
              <span className="text-orange-400 font-bold">{'>'}</span>
              <span className="text-orange-400">{typewriterText}</span>
              <span className="inline-block w-2 h-5 bg-orange-400 animate-pulse ml-1"></span>
            </div>
          </div>

          {/* CTA Buttons with Enhanced Design */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button
              onClick={navigateToScripts}
              className="group relative overflow-hidden px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <ShoppingCart className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Browse Scripts</span>
              <ArrowRight className="w-5 h-5 relative z-10 transform group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={handleDiscordRedirect}
              className="group px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105"
            >
              <Users className="w-5 h-5" />
              <span>Join Community</span>
            </button>
          </div>

          <div className="scroll-indicator mt-16">
            <ChevronDown className="w-8 h-8 text-orange-400 mx-auto animate-bounce" />
          </div>
        </div>
      </section>

      {/* Features Section with Same Background */}
      <section id="features" className="py-32 relative">
        {/* Same background as hero */}
        <div className="absolute inset-0 grid-background opacity-20" />
        <div className="hero-gradient-enhanced absolute inset-0" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="geometric-shape geometric-shape-1" />
          <div className="geometric-shape geometric-shape-2" />
          <div className="geometric-shape geometric-shape-3" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className={`text-center mb-20 transition-all duration-1200 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-20'}`} style={{ transitionDelay: '600ms' }}>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500/15 to-red-500/15 border border-orange-500/30 mb-8 backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-bold text-orange-400 uppercase tracking-widest">Features</span>
            </div>
            <h2 className="text-6xl md:text-7xl font-black text-white mb-6 tracking-tight">
              Why Choose <span className="gradient-text-brand">OXLYN</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
              Built by developers, for developers. Experience the difference.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group relative p-8 rounded-3xl bg-gradient-to-br from-zinc-900/90 to-black/90 border border-zinc-800 hover:border-orange-500/50 backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/20 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-20'}`}
                style={{ transitionDelay: `${800 + index * 100}ms` }}
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-500/0 to-red-500/0 group-hover:from-orange-500/10 group-hover:to-red-500/10 transition-all duration-500" />
                
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/40 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <feature.icon className="w-7 h-7 text-orange-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-base leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Best Sellers Section with Same Background */}
      <section id="best-sellers" className="py-32 relative">
        {/* Same background as hero */}
        <div className="absolute inset-0 grid-background opacity-20" />
        <div className="hero-gradient-enhanced absolute inset-0" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="geometric-shape geometric-shape-1" />
          <div className="geometric-shape geometric-shape-2" />
          <div className="geometric-shape geometric-shape-3" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {packages.length > 0 ? (
            <>
              <div className={`text-center mb-20 transition-all duration-1200 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-20'}`} style={{ transitionDelay: '1000ms' }}>
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500/15 to-red-500/15 border border-orange-500/30 mb-8 backdrop-blur-sm">
                  <Star className="w-5 h-5 text-orange-400 fill-orange-400" />
                  <span className="text-sm font-bold text-orange-400 uppercase tracking-widest">Best Sellers</span>
                </div>
                <h2 className="text-6xl md:text-7xl font-black text-white mb-6 tracking-tight">
                  Popular <span className="gradient-text-brand">Scripts</span>
                </h2>
                <p className="text-xl text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
                  Our most trusted scripts, battle-tested by thousands of servers
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {deduplicatePackages(
                  packages.filter(pkg => !pkg.description?.toLowerCase().includes('vanguard'))
                )
                  .slice(0, 6)
                  .map((pkg, index) => (
                    <div
                      key={pkg.id}
                      onClick={() => {
                        console.log(`📊 [VIEW] User viewing package: ${pkg.name}`);
                      }}
                    >
                      <PackageCard
                        package={pkg}
                        onClick={(clickedPkg) => {
                          console.log(`📊 [CLICK] User clicked package details: ${clickedPkg.name}`);
                          openPackageDetails(clickedPkg);
                        }}
                        isLoaded={isLoaded}
                        delay={1200 + index * 100}
                      />
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className={`flex flex-col items-center justify-center py-20 transition-all duration-1000 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '1000ms' }}>
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 blur-3xl rounded-full" />
                <div className="relative bg-gradient-to-br from-zinc-900/90 to-black/90 p-8 rounded-3xl border border-zinc-800">
                  <Code2 className="w-20 h-20 text-gray-400" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">
                Coming Soon
              </h3>
              <p className="text-gray-400 text-lg mb-8 max-w-md text-center">
                We're working on bringing you amazing scripts. Check back soon!
              </p>
              <button
                onClick={handleDiscordRedirect}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/50 flex items-center gap-2"
              >
                <Users className="w-5 h-5" />
                Join Our Community
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default HomePage;

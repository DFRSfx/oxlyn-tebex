import React from 'react';
import { ChevronDown, Sparkles, ShoppingCart, Users, ArrowRight, Clock, CreditCard, Shield, Wrench } from 'lucide-react';
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
      {/* Enhanced Hero Section */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        id="hero"
      >
        <div className="hero-gradient absolute inset-0" />

        <div className={`relative z-10 text-center max-w-7xl mx-auto px-6 transition-all duration-1600 ${isLoaded ? 'apple-slide-up' : 'opacity-0 translate-y-20'}`} style={{ transitionDelay: '600ms' }}>
          <div className="mb-8">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20 ">
              <Sparkles className="w-4 h-4 mr-2" />
              Premium FiveM Scripts
            </span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black mb-8 text-white leading-none tracking-tighter font-display">
            <span className="gradient-text-brand">OXLYN</span> Software
          </h1>

          <p className="text-2xl md:text-3xl mb-8 text-gray-100 font-light tracking-wide leading-tight">
            Premium Scripts for FiveM Servers
          </p>

          <p className="text-lg mb-16 text-gray-300 max-w-4xl mx-auto leading-relaxed font-light">
            We develop high-quality, secure and optimized scripts to elevate your FiveM server experience.<br />
            <span className="block mt-4 text-red-400 font-semibold text-xl gradient-text-brand">Professional quality guaranteed.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
            <button
              onClick={navigateToScripts}
              className="group button-primary text-xl flex items-center space-x-4 animate-glow px-8 py-4 rounded-2xl font-semibold"
            >
              <ShoppingCart className="w-6 h-6" />
              <span>View Scripts</span>
              <ArrowRight className="w-5 h-5 transform group-hover:translate-x-2 transition-transform duration-300" />
            </button>

            <button
              onClick={handleDiscordRedirect}
              className="group button-secondary text-xl flex items-center space-x-4 px-8 py-4 rounded-2xl font-semibold text-white"
            >
              <Users className="w-6 h-6" />
              <span>Community</span>
            </button>
          </div>

          <div className="scroll-indicator">
            <ChevronDown className="w-8 h-8 text-red-400 mx-auto animate-bounce" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                isLoaded={isLoaded}
                delay={800 + index * 200}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Best Sellers Section */}
      <section id="best-sellers" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-6">
          {packages.length > 0 ? (
            <>
              <div className={`text-center mb-20 transition-all duration-1200 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-20'}`} style={{ transitionDelay: '1400ms' }}>
                <h2 className="text-5xl md:text-6xl font-black mb-8 text-white font-display">
                  Best <span className="gradient-text-brand">Sellers</span>
                </h2>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
                  Our most popular scripts, trusted by developers worldwide
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto" style={{ gridAutoRows: '1fr' }}>
                {packages
                  .filter(pkg => !pkg.description?.toLowerCase().includes('vanguard'))
                  .slice(0, 6)
                  .map((pkg, index) => {
                    return (
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
                          delay={1600 + index * 100}
                        />
                      </div>
                    );
                  })}
              </div>
            </>
          ) : (
            <div className={`flex flex-col items-center justify-center py-20 transition-all duration-1000 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '1400ms' }}>
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-purple-500/20 blur-3xl rounded-full"></div>
                <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90  p-8 rounded-3xl border border-gray-700/50">
                  <svg 
                    className="w-20 h-20 text-gray-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4 font-display">
                Coming Soon
              </h3>
              <p className="text-gray-400 text-lg mb-8 max-w-md text-center">
                We're working on bringing you amazing scripts. Check back soon!
              </p>
              <button
                onClick={handleDiscordRedirect}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-red-500/50 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-discord" viewBox="0 0 16 16">
                  <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
                </svg>
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

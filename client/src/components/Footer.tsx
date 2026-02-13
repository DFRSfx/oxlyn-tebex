import React from 'react';
import { Link } from 'react-router-dom';

interface FooterProps {
  scrollToSection?: (sectionId: string) => void;
}

const Footer: React.FC<FooterProps> = ({ scrollToSection }) => {
  const currentYear = new Date().getFullYear();

  // Logo URLs
  const oxlynLogo = "https://i.imgur.com/ndYSTED.png";
  const vanguardLogo = "https://www.vanguard-labs.xyz/vanguard-icon.webp";

  const handleScrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="border-t border-white/5 py-20 bg-[#050505] relative z-10 font-sans">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-4 gap-12 mb-20">
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-6">
            <Link to="/" className="flex items-center space-x-4 group w-fit">
              <img
                src={oxlynLogo}
                alt="OXLYN Logo"
                className="h-12 w-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              />
              <div>
                <h3 className="font-black text-2xl text-white tracking-tight">
                  <span className="text-orange-500">⌞OXLYN⌝</span> Software®
                </h3>
                <p className="text-xs text-neutral-400 font-medium tracking-widest uppercase">Premium FiveM Scripts</p>
              </div>
            </Link>
            <p className="text-neutral-400 leading-relaxed font-light max-w-md text-lg">
              OXLYN Software® specializes in developing premium FiveM scripts,
              offering high-quality solutions with optimized performance.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6">Links</h4>
            <ul className="space-y-3 text-neutral-400">
              <li>
                <Link to="/scripts" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors duration-200">
                  Scripts
                </Link>
              </li>
              <li>
                <span className="text-neutral-600 cursor-not-allowed text-sm" title="Coming Soon">Subscription</span>
              </li>
              <li>
                <button 
                  onClick={() => handleScrollToSection('docs')} 
                  className="hover:text-white transition-colors duration-200 text-left"
                >
                  Docs
                </button>
              </li>
              <li>
                <a 
                  href="https://discord.gg/yourlink" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-[#5865F2] transition-colors duration-200"
                >
                  Discord
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6">Support</h4>
            <ul className="space-y-3 text-neutral-400">
              <li>
                <a href="https://checkout.tebex.io/terms" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-200">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="https://www.tebex.io/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-200">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="https://checkout.tebex.io/impressum" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-200">
                  Impressum
                </a>
              </li>
              <li>
                <a href="https://docs.oxlynsoftware.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-200">
                  Documentation
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* "We also founded..." Cards Section - UPDATED */}
        <div className="mb-20">
          <h4 className="text-white font-bold text-2xl mb-10 text-center">
            We also founded and <span className="text-orange-500">developed</span>
          </h4>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            
            {/* Vanguard Labs Card - Improved & Logo Added */}
            <a
              href="https://vanguard-labs.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative bg-[#0a0a0a] rounded-xl p-6 border border-white/5 hover:border-[#00e5cc]/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              {/* Subtle Cyan gradient background hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#00e5cc]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-5">
                  <img 
                    src={vanguardLogo} 
                    alt="Vanguard Labs Logo" 
                    className="w-12 h-12 drop-shadow-[0_0_12px_rgba(0,229,204,0.4)] transition-transform group-hover:scale-105" 
                  />
                  <div>
                    <h4 className="font-bold text-xl text-white group-hover:text-[#00e5cc] transition-colors">Vanguard Labs</h4>
                    <p className="text-[#00e5cc] text-xs font-bold tracking-wider uppercase">Next-Gen FiveM Scripts</p>
                  </div>
                </div>
                <p className="text-neutral-400 text-sm leading-relaxed mb-6 flex-grow">
                  High-quality, performance-optimized scripts at affordable prices. The premier choice for modern roleplay servers.
                </p>
                <div className="flex">
                  <span className="inline-block bg-[#00e5cc]/10 text-[#00e5cc] px-3 py-1 rounded-full text-xs font-bold border border-[#00e5cc]/20 group-hover:bg-[#00e5cc]/20 transition-colors">
                    Explore Scripts
                  </span>
                </div>
              </div>
            </a>

            {/* OXLYN Software Card - Improved & Logo Added */}
            <a
              href="https://oxlynsoftware.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative bg-[#0a0a0a] rounded-xl p-6 border border-white/5 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              {/* Subtle Orange gradient background hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-5">
                  <img 
                    src={oxlynLogo} 
                    alt="Oxlyn Software Logo" 
                    className="w-12 h-12 drop-shadow-[0_0_12px_rgba(249,115,22,0.4)] transition-transform group-hover:scale-105" 
                  />
                   <div>
                    <h4 className="font-bold text-xl text-white group-hover:text-orange-500 transition-colors">⌞OXLYN⌝ Software®</h4>
                    <p className="text-orange-500 text-xs font-bold tracking-wider uppercase">Premium Development</p>
                  </div>
                </div>
                <p className="text-neutral-400 text-sm leading-relaxed mb-6 flex-grow">
                  Specialized in enterprise-grade applications, custom solutions, and professional software development.
                </p>
                 <div className="flex">
                  <span className="inline-block bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-xs font-bold border border-orange-500/20 group-hover:bg-orange-500/20 transition-colors">
                    Professional Solutions
                  </span>
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-white/5 pt-12 flex flex-col items-center">
          
          {/* Made With */}
          <div className="text-center mb-8 space-y-4">
            <p className="text-white text-lg font-medium flex items-center justify-center gap-2">
              Made with 
              <svg fill="currentColor" viewBox="0 0 512 512" className="text-red-600 w-5 h-5 animate-pulse">
                <path d="M462.3 62.6C407.5 15.9 326 24.3 275.7 76.2L256 96.5l-19.7-20.3C186.1 24.3 104.5 15.9 49.7 62.6c-62.8 53.6-66.1 149.8-9.9 207.9l193.5 199.8c12.5 12.9 32.8 12.9 45.3 0l193.5-199.8c56.3-58.1 53-154.3-9.8-207.9z" />
              </svg>
              by <a href="https://github.com/DFRSfx/" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400 font-bold transition-colors">SoaresDev</a>
            </p>
            
            <div className="text-neutral-500 text-sm space-y-1">
               <p>© {currentYear} <span className="text-orange-500 font-bold">⌞OXLYN⌝ Software®</span>. All rights reserved.</p>
               <p>Premium FiveM Scripts • Developed with excellence for the community</p>
            </div>

            {/* DMCA Badge */}
            <div className="pt-2">
               <a href="//www.dmca.com/Protection/Status.aspx" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  <span className="text-xs text-neutral-300 font-medium">Protected by DMCA.com</span>
               </a>
            </div>
          </div>

          {/* Legal Links Row */}
          <div className="flex flex-wrap justify-center gap-6 mb-12 text-sm text-neutral-500 font-medium">
            <a href="https://checkout.tebex.io/terms" className="hover:text-white transition-colors">Terms & Conditions</a>
            <span className="text-neutral-700">•</span>
            <a href="https://www.tebex.io/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <span className="text-neutral-700">•</span>
            <a href="https://checkout.tebex.io/impressum" className="hover:text-white transition-colors">Impressum</a>
          </div>

          {/* Tebex Box */}
          <div className="w-full max-w-2xl">
            <div className="bg-[#111] rounded-lg p-5 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <button
                      onClick={() => window.location.href = 'https://tebex.io'}
                      className="transition-all duration-300 hover:scale-110 hover:brightness-125 bg-white/10 p-3 rounded-lg"
                    >
                      <img
                        src="https://i.imgur.com/lSi89zm.png"
                        alt="Tebex"
                        className="h-8 w-auto filter brightness-100 hover:brightness-110 transition-all duration-300"
                      />
                    </button>
                <div className="flex flex-col">
                   <span className="text-white text-sm font-bold leading-tight">Powered by Tebex</span>
                   <span className="text-neutral-500 text-xs">Secure checkout partner</span>
                </div>
              </div>
              <p className="text-neutral-500 text-xs text-center sm:text-right max-w-xs leading-relaxed">
                This website is owned & operated by <span className="text-neutral-300">Tebex Limited</span>, handling billing & fulfillment.
              </p>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
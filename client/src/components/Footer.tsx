import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Code2 } from 'lucide-react';

interface FooterProps {
  scrollToSection?: (sectionId: string) => void;
}

const Footer: React.FC<FooterProps> = ({ scrollToSection }) => {
  const currentYear = new Date().getFullYear();

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
      {/* Same background as homepage */}
      <div className="absolute inset-0 grid-background opacity-20 pointer-events-none" />
      <div className="absolute inset-0 hero-gradient-enhanced pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="geometric-shape geometric-shape-1" />
        <div className="geometric-shape geometric-shape-2" />
        <div className="geometric-shape geometric-shape-3" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
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

        {/* "We also founded..." Cards Section */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500/15 to-red-500/15 border border-orange-500/30 mb-4 backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-bold text-orange-400 uppercase tracking-widest">Our Projects</span>
            </div>
            <h4 className="text-white font-bold text-2xl">
              We also founded and <span className="text-orange-500">developed</span>
            </h4>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            
            {/* Vanguard Labs Card */}
            <a
              href="https://vanguard-labs.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative bg-zinc-900/30 rounded-xl p-6 border border-zinc-800 hover:border-[#00e5cc]/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
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

            {/* OXLYN Software Card */}
            <a
              href="https://oxlynsoftware.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative bg-zinc-900/30 rounded-xl p-6 border border-zinc-800 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
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
          
          <div className="text-center mb-8 space-y-4">
            <div className="text-neutral-500 text-sm space-y-1">
              <p>© {currentYear} <span className="text-orange-500 font-bold">⌞OXLYN⌝ Software®</span>. All rights reserved.</p>
              <p>Premium FiveM Scripts • Developed with excellence for the community</p>
            </div>

            {/* Developer Credit Note */}
            <div className="flex items-center justify-center gap-2 text-xs text-neutral-600 mt-4">
              <Code2 className="w-3.5 h-3.5 text-orange-500/60" />
              <span>This website was made with the help of <span className="text-neutral-400 font-medium">Soares</span> <span className="text-orange-500/80">(Oxlyn CO-Founder)</span></span>
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
            <div className="bg-zinc-900/30 rounded-lg p-5 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6">
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

import React from 'react';
import { useNavigate } from 'react-router-dom';

interface FooterProps {
  navigateToScripts: () => void;
  scrollToSection: (sectionId: string) => void;
  handleDiscordRedirect: () => void;
  handleTebexRedirect: () => void;
}

const Footer: React.FC<FooterProps> = ({
  navigateToScripts,
  scrollToSection,
  handleDiscordRedirect,
  handleTebexRedirect,
}) => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate(path);
  };

  const handleScriptsClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigateToScripts();
  };

  const handleExternalLink = (url: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  return (
    <footer className="border-t border-gray-700/50 py-20 bg-gradient-to-b from-transparent to-black/50 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-4 mb-6">
              <img
                src="https://i.imgur.com/ndYSTED.png"
                alt="OXLYN Logo"
                className="h-12 w-auto logo-glow"
              />
              <div>
                <h3 className="font-black gradient-text-brand text-2xl font-display">
                  ⌞OXLYN⌝ Software®
                </h3>
                <p className="text-sm text-white font-medium tracking-wider">Premium FiveM Scripts</p>
              </div>
            </div>
            <p className="text-white leading-relaxed font-light max-w-md mb-6 text-lg">
              OXLYN Software® specializes in developing premium FiveM scripts,
              offering high-quality solutions with optimized performance.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6 font-display">Links</h4>
            <ul className="space-y-4 text-white">
              <li><button onClick={handleScriptsClick} className="hover:text-red-400 transition-colors duration-300 text-left">Scripts</button></li>
              <li><span className="text-gray-400 cursor-not-allowed">Subscription</span></li>
              <li><button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); scrollToSection('docs'); }} className="hover:text-red-400 transition-colors duration-300 text-left">Docs</button></li>
              <li><button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); handleDiscordRedirect(); }} className="hover:text-red-400 transition-colors duration-300 text-left">Discord</button></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6 font-display">Support</h4>
            <ul className="space-y-4 text-white">
              <li><button onClick={() => handleNavigation('/terms')} className="hover:text-red-400 transition-colors duration-300 text-left">Terms of Service</button></li>
              <li><button onClick={() => handleNavigation('/privacy')} className="hover:text-red-400 transition-colors duration-300 text-left">Privacy Policy</button></li>
              <li><button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); window.open('https://docs.oxlynsoftware.com', '_blank'); }} className="hover:text-red-400 transition-colors duration-300 text-left">Documentation</button></li>
              <li><button onClick={() => handleNavigation('/faq')} className="hover:text-red-400 transition-colors duration-300 text-left">FAQ</button></li>
            </ul>
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-16">
          <h4 className="text-white font-bold text-2xl mb-8 text-center font-display">
            We also founded and <span className="gradient-text-brand">developed</span>
          </h4>
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Vanguard Labs */}
            <button
              onClick={() => handleExternalLink('https://vanguard-labs.xyz')}
              className="group bg-gradient-to-br from-[#092218] to-[#092218]/50 rounded-xl p-6 border border-[#00e5cc]/30 hover:border-[#00ef93]/60 transition-all duration-300 hover:scale-[1.02] text-left w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-xl bg-gradient-to-r from-[#00e5cc] to-[#00ef93] bg-clip-text text-transparent">Vanguard Labs</h4>
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 512 512"
                  className="text-[#00e5cc] group-hover:text-[#00ef93] transition-colors"
                  height="20"
                  width="20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M432,320H400a16,16,0,0,0-16,16V448H64V128H208a16,16,0,0,0,16-16V80a16,16,0,0,0-16-16H48A48,48,0,0,0,0,112V464a48,48,0,0,0,48,48H400a48,48,0,0,0,48-48V336A16,16,0,0,0,432,320ZM488,0h-128c-21.37,0-32.05,25.91-17,41l35.73,35.73L135,320.37a24,24,0,0,0,0,34L157.67,377a24,24,0,0,0,34,0L435.28,133.32,471,169c15,15,41,4.5,41-17V24A24,24,0,0,0,488,0Z"></path>
                </svg>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                High-quality FiveM scripts at affordable prices. Our main store offering premium solutions for roleplay servers with excellent value for money.
              </p>
              <span className="inline-block bg-[#00e5cc]/20 text-[#00ef93] px-3 py-1 rounded-full text-xs font-semibold border border-[#00e5cc]/30">
                Low Cost Scripts
              </span>
            </button>

            {/* OXLYN Software */}
            <button
              onClick={() => handleExternalLink('https://oxlynsoftware.com')}
              className="group bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-xl p-6 border border-amber-500/30 hover:border-amber-500/60 transition-all duration-300 hover:scale-[1.02] text-left w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-bold text-xl gradient-text-brand">⌞OXLYN⌝ Software®</h4>
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 512 512"
                  className="text-amber-500 group-hover:text-amber-400 transition-colors"
                  height="20"
                  width="20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M432,320H400a16,16,0,0,0-16,16V448H64V128H208a16,16,0,0,0,16-16V80a16,16,0,0,0-16-16H48A48,48,0,0,0,0,112V464a48,48,0,0,0,48,48H400a48,48,0,0,0,48-48V336A16,16,0,0,0,432,320ZM488,0h-128c-21.37,0-32.05,25.91-17,41l35.73,35.73L135,320.37a24,24,0,0,0,0,34L157.67,377a24,24,0,0,0,34,0L435.28,133.32,471,169c15,15,41,4.5,41-17V24A24,24,0,0,0,488,0Z"></path>
                </svg>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                Professional development of high-quality scripts and custom solutions. Specialized in enterprise-grade applications and premium software development.
              </p>
              <span className="inline-block bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-semibold border border-amber-500/30">
                Professional Development
              </span>
            </button>
          </div>
        </div>

        {/* Footer Bottom - Reorganized */}
        <div className="border-t border-gray-700/50 pt-12">
          {/* Made with Section - Top & Center */}
          <div className="text-center mb-8">
            <p className="text-white text-lg font-medium mb-3 flex items-center justify-center gap-2">
              Made with 
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="text-red-500 animate-pulse" height="20" width="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M462.3 62.6C407.5 15.9 326 24.3 275.7 76.2L256 96.5l-19.7-20.3C186.1 24.3 104.5 15.9 49.7 62.6c-62.8 53.6-66.1 149.8-9.9 207.9l193.5 199.8c12.5 12.9 32.8 12.9 45.3 0l193.5-199.8c56.3-58.1 53-154.3-9.8-207.9z"></path>
              </svg>
              by <button onClick={() => handleExternalLink('https://github.com/DFRSfx/')} className="gradient-text-brand font-bold hover:opacity-80 transition-opacity">SoaresDev</button>
            </p>
            <p className="text-white text-base mb-2">
              © {new Date().getFullYear()} <span className="gradient-text-brand font-bold">⌞OXLYN⌝ Software®</span>. All rights reserved.
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Premium FiveM Scripts • Developed with excellence for the community
            </p>
            
            {/* DMCA Badge */}
            <div className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-gray-300 font-medium">Protected by DMCA.com</span>
            </div>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap justify-center gap-6 mb-10 text-sm text-gray-400">
            <button onClick={() => handleNavigation('/terms')} className="hover:text-white transition-colors hover:underline">Terms & Conditions</button>
            <span className="text-gray-600">•</span>
            <button onClick={() => handleNavigation('/privacy')} className="hover:text-white transition-colors hover:underline">Privacy Policy</button>
            <span className="text-gray-600">•</span>
            <button onClick={() => handleNavigation('/impressum')} className="hover:text-white transition-colors hover:underline">Impressum</button>
            <span className="text-gray-600">•</span>
            <button onClick={() => handleNavigation('/refunds')} className="hover:text-white transition-colors hover:underline">Refund Policy</button>
          </div>

          {/* Tebex Section - Bottom */}
          <div className="border-t border-gray-700/30 pt-8">
            <div className="max-w-3xl mx-auto">
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl p-6 border border-white/10 ">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleTebexRedirect}
                      className="transition-all duration-300 hover:scale-110 hover:brightness-125 bg-white/10 p-3 rounded-lg"
                    >
                      <img
                        src="https://i.imgur.com/lSi89zm.png"
                        alt="Tebex"
                        className="h-8 w-auto filter brightness-100 hover:brightness-110 transition-all duration-300"
                      />
                    </button>
                    <div className="text-left">
                      <p className="text-white text-sm font-semibold">Powered by Tebex</p>
                      <p className="text-gray-400 text-xs">Secure checkout & fulfillment partner</p>
                    </div>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-gray-300 text-xs leading-relaxed max-w-md">
                      This website and its checkout process is owned & operated by <span className="text-white font-medium">Tebex Limited</span>, who handle product fulfillment, billing support and refunds.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

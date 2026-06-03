import React from 'react';
import { Link } from 'react-router-dom';
import OptimizedImage from './OptimizedImage';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const oxlynLogo = "/logo.webp";

  return (
    <footer className="border-t border-white/5 py-12 sm:py-20 relative z-10 font-sans">
      {/* No local background — global page-gradient (in App.tsx) flows through */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid lg:grid-cols-4 gap-10 sm:gap-12 mb-12 sm:mb-20">
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Link to="/" className="flex items-center space-x-3 sm:space-x-4 group w-fit">
              <OptimizedImage
                src={oxlynLogo}
                alt="OXLYN Logo"
                width={96}
                format="webp"
                className="h-10 sm:h-12 w-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              />
              <div>
                <h3 className="font-black text-xl sm:text-2xl text-white tracking-tight">
                  <span className="text-orange-500">⌞OXLYN⌝</span> Software®
                </h3>
                <p className="text-[10px] sm:text-xs text-neutral-400 font-medium tracking-widest uppercase">Premium FiveM Scripts</p>
              </div>
            </Link>
            <p className="text-neutral-400 leading-relaxed font-light max-w-md text-base sm:text-lg">
              OXLYN Software® specializes in developing premium FiveM scripts,
              offering high-quality solutions with optimized performance.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-base sm:text-lg mb-4 sm:mb-6">Links</h4>
            <ul className="space-y-2.5 sm:space-y-3 text-neutral-400">
              <li>
                <Link to="/scripts" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors duration-200">
                  Scripts
                </Link>
              </li>
              <li>
                <Link to="/subscription" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors duration-200 inline-flex items-center gap-1.5">
                  Subscription
                  <span className="text-[0.55rem] px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-wider text-white bg-gradient-to-r from-red-500 to-orange-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                    Hot
                  </span>
                </Link>
              </li>
              <li>
                <a
                  href="https://docs.oxlynsoftware.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors duration-200"
                >
                  Docs
                </a>
              </li>
              <li>
                <a
                  href="https://discord.com/invite/KjWmrSwMXg"
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
            <h4 className="text-white font-bold text-base sm:text-lg mb-4 sm:mb-6">Support</h4>
            <ul className="space-y-2.5 sm:space-y-3 text-neutral-400">
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
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-white/5 pt-8 sm:pt-12 flex flex-col items-center">

          <div className="text-center mb-6 sm:mb-8 space-y-3 sm:space-y-4">
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
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 sm:gap-6 mb-8 sm:mb-12 text-xs sm:text-sm text-neutral-500 font-medium px-2">
            <a href="https://checkout.tebex.io/terms" className="hover:text-white transition-colors">Terms & Conditions</a>
            <span className="text-neutral-700">•</span>
            <a href="https://www.tebex.io/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <span className="text-neutral-700">•</span>
            <a href="https://checkout.tebex.io/impressum" className="hover:text-white transition-colors">Impressum</a>
          </div>

          {/* Tebex Box */}
          <div className="w-full max-w-2xl">
            <div className="bg-zinc-900/30 rounded-lg p-4 sm:p-5 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  onClick={() => window.location.href = 'https://tebex.io'}
                  className="transition-all duration-300 hover:scale-110 hover:brightness-125 flex-shrink-0"
                  aria-label="Tebex"
                >
                  {/* Local monochrome PNG (gray+alpha — clean transparent
                      background). The Imgur source we used before had a dark
                      square baked into the file itself, which read as a black
                      box on the footer card. */}
                  <img
                    src="/tebex-logo.png"
                    alt="Tebex"
                    loading="lazy"
                    decoding="async"
                    width={14}
                    height={32}
                    className="h-7 sm:h-8 w-auto"
                    draggable={false}
                  />
                </button>
                <div className="flex flex-col min-w-0">
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

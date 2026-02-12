import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import {
  ShoppingCart,
  LogOut,
  Settings,
  Package as PackageIcon,
  Menu,
  X,
  ChevronDown,
  History
} from 'lucide-react';
import { PageType, Package } from '../types';
import { useTebex } from '../context/TebexContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import UserAvatar from './UserAvatar';
import MyDownloadsModal from './MyDownloadsModal';
import CheckoutModal from './CheckoutModal';
import { API_URL } from '../config/api';

interface NavigationProps {
  scrollY: number;
  isLoaded: boolean;
  currentPage: PageType;
  packages: Package[];
  navigateToScripts: () => void;
  navigateToHome: () => void;
  handleDiscordRedirect: () => void;
  openPackageDetails: (pkg: Package) => void;
}

const Navigation: React.FC<NavigationProps> = ({
  scrollY,
  isLoaded,
  currentPage,
  packages,
  navigateToScripts,
  navigateToHome,
  handleDiscordRedirect,
  openPackageDetails,
}) => {
  const { isLoggedIn, cartItems, login, logout, cfxUserData } = useTebex();
  const { user: discordUser, isAuthenticated: isDiscordAuth, getDiscordAuthUrl, logout: discordLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  const [hasAvailableTokens, setHasAvailableTokens] = useState(false);
  const [showDownloadsModal, setShowDownloadsModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  
  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Optimized Token Check
  useEffect(() => {
    const checkTokens = async () => {
      if (document.hidden || !discordUser?.discordId) return;

      try {
        const response = await fetch(`${API_URL}/downloads/available`, {
          credentials: 'include',
        });
        const data = await response.json();
        setHasAvailableTokens(data.hasAvailableTokens || false);
      } catch (error) {
        console.error('Error checking tokens:', error);
      }
    };

    if (discordUser?.discordId) {
      checkTokens();
      const interval = setInterval(checkTokens, 30000);
      return () => clearInterval(interval);
    }
  }, [discordUser?.discordId]);

  // Check for pending Tebex basket
  useEffect(() => {
    const completePendingBasket = async (basketInfo: any) => {
      const TEBEX_API_BASE = 'https://headless.tebex.io/api';
      const { basketIdent, packageId, token } = basketInfo;

      try {
        const addPackageResponse = await fetch(`${TEBEX_API_BASE}/baskets/${basketIdent}/packages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ package_id: packageId.toString(), quantity: 1 }),
        });

        if (!addPackageResponse.ok) return;

        const checkoutResponse = await fetch(`${TEBEX_API_BASE}/accounts/${token}/baskets/${basketIdent}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!checkoutResponse.ok) return;

        const checkoutData = await checkoutResponse.json();
        const checkoutUrl = checkoutData.data?.links?.checkout;

        if (checkoutUrl) {
          flushSync(() => {
            setCheckoutUrl(checkoutUrl);
            setShowCheckoutModal(true);
          });
        }
      } catch (error) {
        console.error('❌ Error completing pending basket:', error);
      }
    };

    const pendingBasket = localStorage.getItem('tebex_pending_basket');
    if (pendingBasket) {
      completePendingBasket(JSON.parse(pendingBasket));
      localStorage.removeItem('tebex_pending_basket');
    }
  }, []);

  // Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const username = cfxUserData?.username || 'Guest';
  const userId = cfxUserData?.user_id || 'N/A';

  const handleDiscordLogin = async () => {
    try {
      const authUrl = await getDiscordAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Discord login failed:', error);
    }
  };

  return (
    <>
      <nav className={`fixed top-0 w-full z-50 transition-all duration-700 ${scrollY > 80 ? 'nav-blur' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo Section (Maintained from original code) */}
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                navigate('/');
              }}
              className={`flex items-center space-x-4 transition-all duration-1000 hover:opacity-80 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-4'}`}
            >
              <img
                src="https://i.imgur.com/ndYSTED.png"
                alt="OXLYN Logo"
                className="h-10 w-auto transition-transform duration-300 hover:scale-110 logo-glow"
              />
              <div>
                <h1 className="text-xl font-bold gradient-text-brand font-display">
                  ⌞OXLYN⌝
                </h1>
                <p className="text-xs text-gray-400 font-medium tracking-wider">Software®</p>
              </div>
            </button>

            {/* Desktop Navigation Links (Maintained from original code) */}
            <div className={`hidden lg:flex items-center space-x-6 text-sm font-medium transition-all duration-1200 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '200ms' }}>
              <button onClick={navigateToScripts} className="nav-link">Scripts</button>

              <div className="relative group">
                <span className="coming-soon-tag-small group-hover:opacity-100 transition-opacity">COMING SOON</span>
                <button className="nav-link flex items-center opacity-50 cursor-not-allowed">
                  Subscription
                </button>
              </div>

              <button onClick={() => window.open('https://docs.oxlynsoftware.com', '_blank')} className="nav-link">
                Documentation
              </button>

              <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); navigate('/terms'); }} className="nav-link">
                Terms
              </button>

              <button onClick={handleDiscordRedirect} className="nav-link">
                Support
              </button>
            </div>

            {/* Desktop Auth & Cart (UPDATED to New Design) */}
            <div className={`hidden lg:flex items-center gap-2 transition-all duration-1400 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '400ms' }}>
              
              {isLoggedIn ? (
                <>
                  {/* User Button */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="cursor-pointer gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border bg-background shadow-xs hover:bg-zinc-800 hover:text-zinc-100 border-zinc-800 bg-[#0f0f11] text-zinc-200 h-9 px-4 py-2 flex items-center justify-between"
                      aria-haspopup="menu"
                      aria-expanded={isDropdownOpen}
                    >
                      <div className="flex items-center gap-0">
                        <span className="relative flex size-6 shrink-0 overflow-hidden rounded-full mr-2">
                           <UserAvatar className="aspect-square size-full" />
                        </span>
                        {username}
                      </div>
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                      <div 
                        className="absolute right-0 top-full mt-2 z-50 min-w-[14rem] overflow-hidden rounded-md border border-zinc-800 bg-[#0f0f11] p-1 text-zinc-200 shadow-md animate-in fade-in zoom-in-95 duration-200"
                        role="menu"
                        dir="ltr"
                      >
                        <div className="px-2 py-1.5 text-sm font-semibold text-zinc-100">
                          Signed in as {username}
                        </div>
                        <div role="separator" className="-mx-1 my-1 h-px bg-zinc-800"></div>
                        
                        {/* Discord Item */}
                        <div 
                           role="menuitem" 
                           onClick={!isDiscordAuth ? handleDiscordLogin : discordLogout}
                           className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                        >
                            {!isDiscordAuth ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-discord mr-2" viewBox="0 0 16 16"><path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"></path></svg>
                                    Connect Discord
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-discord mr-2 text-[#5865F2]" viewBox="0 0 16 16"><path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"></path></svg>
                                    Disconnect {discordUser?.discordUsername ? `.${discordUser.discordUsername}` : ''}
                                </>
                            )}
                        </div>

                        {/* My Downloads - Only show if has tokens */}
                        {hasAvailableTokens && (
                          <div
                            role="menuitem"
                            onClick={() => {
                              setIsDropdownOpen(false);
                              setShowDownloadsModal(true);
                            }}
                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                          >
                            <PackageIcon className="mr-2 h-4 w-4" />
                            My Downloads
                            <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                          </div>
                        )}

                        {/* Order History - Always show */}
                        <div
                          role="menuitem"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            window.open('https://checkout.tebex.io/payment-history/login', '_blank', 'noopener,noreferrer');
                          }}
                          className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                        >
                          <History className="mr-2 h-4 w-4" />
                          Order History
                        </div>

                        <div role="separator" className="-mx-1 my-1 h-px bg-zinc-800"></div>

                        {/* Logout */}
                        <div 
                          role="menuitem"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            logout();
                          }}
                          className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-red-500/10 text-red-400 hover:text-red-300"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Logout
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cart Button */}
                  <button
                    onClick={() => {
                        navigate('/cart');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border bg-background shadow-xs hover:bg-zinc-800 hover:text-zinc-100 border-zinc-800 bg-[#0f0f11] text-zinc-200 size-9 relative"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {cartItems.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary-orange text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                            {cartItems.length}
                        </span>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={login}
                  className="fivem-signin-button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="19" viewBox="0 0 48 48">
                    <polygon fill="#fff" points="5,45 9,34 21,22 15,45"></polygon>
                    <polygon fill="#fff" points="25,18 33,45 43,45 32,12"></polygon>
                    <polygon fill="#fff" points="16.059,14.164 20,3 28,3"></polygon>
                    <polygon fill="#fff" points="10.731,29.002 23,17 23,15 11.58,26.667"></polygon>
                    <polygon fill="#fff" points="15.142,16.429 13,22 29.724,5.725 28.818,3.178"></polygon>
                    <polygon fill="#fff" points="23.932,14.055 24.377,15.626 30.941,9.178 30.385,7.702"></polygon>
                  </svg>
                  Sign in with FiveM
                </button>
              )}
            </div>

            {/* Mobile Toggle & Cart (Visible on Small Screens) */}
            <div className="lg:hidden flex items-center gap-3">
              {isLoggedIn && (
                <button
                  onClick={() => navigate('/cart')}
                  className="relative p-2 text-gray-300 hover:text-white"
                >
                  <ShoppingCart className="w-6 h-6" />
                  {cartItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {cartItems.length}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-300 hover:text-white transition-colors"
                aria-label="Toggle Menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div 
          className={`lg:hidden fixed inset-x-0 top-[72px] bg-black/98 border-b border-white/10 transition-all duration-300 ease-in-out overflow-hidden ${
            isMobileMenuOpen ? 'max-h-screen opacity-100 py-6' : 'max-h-0 opacity-0 py-0'
          }`}
        >
          <div className="px-6 space-y-4">
             {/* Mobile Links */}
             <div className="flex flex-col space-y-3">
              <button onClick={navigateToScripts} className="text-lg font-medium text-white hover:text-red-400 text-left">Scripts</button>
              <button onClick={() => window.open('https://docs.oxlynsoftware.com', '_blank')} className="text-lg font-medium text-white hover:text-red-400 text-left">
                Documentation
              </button>
              <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); navigate('/terms'); }} className="text-lg font-medium text-white hover:text-red-400 text-left">
                Terms
              </button>
              <button onClick={handleDiscordRedirect} className="text-lg font-medium text-white hover:text-red-400 text-left">
                Support
              </button>
             </div>

             <div className="border-t border-white/10 pt-4">
              {isLoggedIn ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar className="w-10 h-10 border" />
                    <div>
                      <p className="font-medium text-white">{username}</p>
                      <p className="text-xs text-gray-400">ID: {userId}</p>
                    </div>
                  </div>
                  
                  {!isDiscordAuth ? (
                    <button onClick={handleDiscordLogin} className="w-full flex items-center justify-center gap-2 py-2 border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 rounded-lg">
                      Sign in with Discord
                    </button>
                  ) : (
                    <button onClick={() => setShowDownloadsModal(true)} className="w-full flex items-center justify-between px-4 py-3 bg-white/5 rounded-lg text-white">
                      <span>My Downloads</span>
                      {hasAvailableTokens && <span className="bg-red-500 w-2 h-2 rounded-full"></span>}
                    </button>
                  )}
                  
                  <button onClick={logout} className="w-full text-left text-red-400 py-2">Log out</button>
                </div>
              ) : (
                <button onClick={login} className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-lg text-white font-bold">
                  Sign in with FiveM
                </button>
              )}
             </div>
          </div>
        </div>
      </nav>

      <MyDownloadsModal
        isOpen={showDownloadsModal}
        onClose={() => {
          setShowDownloadsModal(false);
          if (discordUser?.discordId) {
            fetch(`${API_URL}/downloads/available`, { credentials: 'include' })
              .then(res => res.json())
              .then(data => setHasAvailableTokens(data.hasAvailableTokens || false))
              .catch(console.error);
          }
        }}
      />

      <CheckoutModal
        isOpen={showCheckoutModal}
        checkoutUrl={checkoutUrl}
        onClose={() => setShowCheckoutModal(false)}
      />
    </>
  );
};

export default Navigation;
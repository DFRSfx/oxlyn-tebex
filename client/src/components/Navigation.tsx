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
  History,
  BookOpen,
  MessageCircle,
  ChevronRight
} from 'lucide-react';
import { PageType, Package } from '../types';
import { useTebex } from '../context/TebexContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import UserAvatar from './UserAvatar';
import MyDownloadsModal from './MyDownloadsModal';
import CheckoutModal from './CheckoutModal';
import { API_URL } from '../config/api';
import { useAnalytics } from '../hooks/useAnalytics';

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
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Mobile Menu Animation States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Controls mounting
  const [isVisible, setIsVisible] = useState(false); // Controls transition/opacity

  const [hasAvailableTokens, setHasAvailableTokens] = useState(false);
  const [showDownloadsModal, setShowDownloadsModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  
  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- Animation Handlers ---
  const handleOpenMobileMenu = () => {
    setIsMobileMenuOpen(true);
    // Tiny delay to ensure DOM is mounted before adding the opacity/translate classes
    setTimeout(() => setIsVisible(true), 10);
  };

  const handleCloseMobileMenu = () => {
    setIsVisible(false); // Start slide-out/fade-out
    // Wait for animation duration (300ms) before unmounting
    setTimeout(() => {
      setIsMobileMenuOpen(false);
    }, 300);
  };

  // Close mobile menu on route change
  useEffect(() => {
    if (isMobileMenuOpen) handleCloseMobileMenu();
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
      trackEvent('discord_login_clicked', {
        eventData: { is_authenticated: isDiscordAuth, cfx_logged_in: isLoggedIn },
      });
      const authUrl = await getDiscordAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Discord login failed:', error);
    }
  };

  const handleDiscordLogout = () => {
    trackEvent('discord_logout_clicked', { eventData: { discord_username: discordUser?.discordUsername } });
    discordLogout();
  };

  const handleCFXLogin = () => {
    trackEvent('cfx_login_clicked');
    login();
  };

  const handleLogout = () => {
    trackEvent('logout_clicked', { eventData: { username: cfxUserData?.username, had_discord: isDiscordAuth } });
    setIsDropdownOpen(false);
    logout();
  };

  const handleMyDownloads = () => {
    trackEvent('my_downloads_clicked');
    setIsDropdownOpen(false);
    setShowDownloadsModal(true);
  };

  const handleAdminAccess = () => {
    trackEvent('admin_access_clicked', { eventData: { discord_username: discordUser?.discordUsername } });
    setIsDropdownOpen(false);
    navigate('/admin');
  };

  const handleCartClick = () => {
    trackEvent('cart_icon_clicked', { eventData: { cart_items: cartItems.length } });
    navigate('/cart');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <nav className={`fixed top-0 w-full z-50 transition-all duration-700 ${scrollY > 80 ? 'nav-blur' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo Section (Maintained from original) */}
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

            {/* Desktop Navigation Links (Maintained from original) */}
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

            {/* Desktop Auth & Cart (Maintained from original) */}
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
                           onClick={!isDiscordAuth ? handleDiscordLogin : handleDiscordLogout}
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

                        {/* My Downloads */}
                        {hasAvailableTokens && (
                          <div
                            role="menuitem"
                            onClick={handleMyDownloads}
                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                          >
                            <PackageIcon className="mr-2 h-4 w-4" />
                            My Downloads
                            <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                          </div>
                        )}

                        {/* Order History */}
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

                        {/* Admin Panel */}
                        {discordUser?.role === 'admin' && (
                          <>
                            <div role="separator" className="-mx-1 my-1 h-px bg-zinc-800"></div>
                            <div
                              role="menuitem"
                              onClick={handleAdminAccess}
                              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-amber-500/10 text-amber-500 hover:text-amber-400"
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              Admin Panel
                            </div>
                          </>
                        )}

                        <div role="separator" className="-mx-1 my-1 h-px bg-zinc-800"></div>

                        {/* Logout */}
                        <div
                          role="menuitem"
                          onClick={handleLogout}
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
                    onClick={handleCartClick}
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
                  onClick={handleCFXLogin}
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
                onClick={handleOpenMobileMenu}
                className="p-2 text-gray-300 hover:text-white transition-colors"
                aria-label="Toggle Menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ---------------------------------------------------------
        NEW MOBILE MENU (SLIDE FROM RIGHT)
        ---------------------------------------------------------
      */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          {/* Backdrop with Fade Transition */}
          <div
            className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={handleCloseMobileMenu}
          />

          {/* Sidebar with Slide Transition (Right to Left) */}
          <div
            className={`absolute right-0 top-0 h-full w-[85%] max-w-[360px] bg-[#09090b] border-l border-white/10 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
          >
            {/* Sidebar Header */}
            <div className="p-6 flex items-center justify-between border-b border-white/5 bg-[#0f0f11]">
              <div className="flex items-center gap-3">
                 {isLoggedIn ? (
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden">
                          <UserAvatar className="w-full h-full object-cover" />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-white font-bold text-sm">{username}</span>
                          <span className="text-xs text-zinc-500">ID: {userId}</span>
                       </div>
                    </div>
                 ) : (
                    <img src="https://i.imgur.com/ndYSTED.png" alt="Logo" className="h-8 w-auto opacity-80" />
                 )}
              </div>
              <button onClick={handleCloseMobileMenu} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-8">
              
              {/* Navigation Group */}
              <div>
                 <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">Navigation</h3>
                 <div className="space-y-1">
                    <MobileNavLink 
                       icon={<PackageIcon className="w-5 h-5" />} 
                       label="Scripts" 
                       onClick={() => { handleCloseMobileMenu(); navigateToScripts(); }} 
                    />
                    <MobileNavLink 
                       icon={<BookOpen className="w-5 h-5" />} 
                       label="Documentation" 
                       onClick={() => { handleCloseMobileMenu(); window.open('https://docs.oxlynsoftware.com', '_blank'); }} 
                    />
                     <MobileNavLink 
                       icon={<span className="text-xs font-bold border border-current px-1 rounded">TERMS</span>} 
                       label="Terms of Service" 
                       onClick={() => { handleCloseMobileMenu(); navigate('/terms'); }} 
                    />
                    <MobileNavLink 
                       icon={<MessageCircle className="w-5 h-5" />} 
                       label="Support" 
                       onClick={() => { handleCloseMobileMenu(); handleDiscordRedirect(); }} 
                    />
                 </div>
              </div>

              {/* Account / Auth Group */}
              <div>
                 <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">
                    {isLoggedIn ? 'Account' : 'Get Started'}
                 </h3>
                 
                 {isLoggedIn ? (
                    <div className="space-y-1">
                       {!isDiscordAuth ? (
                          <MobileNavLink 
                             icon={<svg className="w-5 h-5" viewBox="0 0 16 16" fill="currentColor"><path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/></svg>} 
                             label="Connect Discord" 
                             onClick={handleDiscordLogin} 
                          />
                       ) : (
                          <MobileNavLink 
                             icon={<svg className="w-5 h-5 text-[#5865F2]" viewBox="0 0 16 16" fill="currentColor"><path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/></svg>} 
                             label={`Disconnect ${discordUser?.discordUsername || ''}`}
                             onClick={handleDiscordLogout} 
                          />
                       )}
                       
                       <MobileNavLink 
                          icon={<History className="w-5 h-5" />} 
                          label="Order History" 
                          onClick={() => window.open('https://checkout.tebex.io/payment-history/login', '_blank')} 
                       />

                       {hasAvailableTokens && (
                          <MobileNavLink 
                             icon={<PackageIcon className="w-5 h-5 text-orange-500" />} 
                             label="My Downloads" 
                             onClick={() => { handleCloseMobileMenu(); setShowDownloadsModal(true); }} 
                          />
                       )}

                       {discordUser?.role === 'admin' && (
                          <MobileNavLink 
                             icon={<Settings className="w-5 h-5 text-amber-500" />} 
                             label="Admin Panel" 
                             onClick={() => { handleCloseMobileMenu(); navigate('/admin'); }} 
                             className="border-amber-500/20 bg-amber-500/5"
                          />
                       )}

                       <div className="pt-4">
                          <button onClick={() => { handleCloseMobileMenu(); handleLogout(); }} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-medium hover:bg-red-500/20 transition-all">
                             <LogOut className="w-4 h-4" /> Log Out
                          </button>
                       </div>
                    </div>
                 ) : (
                    <button 
                       onClick={() => { handleCloseMobileMenu(); handleCFXLogin(); }} 
                       className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-900/20 hover:scale-[1.02] transition-transform"
                    >
                       <svg className="w-5 h-5" viewBox="0 0 48 48" fill="currentColor"><path d="M5,45 9,34 21,22 15,45 M25,18 33,45 43,45 32,12 M16.059,14.164 20,3 28,3 M10.731,29.002 23,17 23,15 11.58,26.667 M15.142,16.429 13,22 29.724,5.725 28.818,3.178 M23.932,14.055 24.377,15.626 30.941,9.178 30.385,7.702" /></svg>
                       Sign in with FiveM
                    </button>
                 )}
              </div>
            </div>
            
            {/* Sidebar Footer */}
            <div className="p-4 border-t border-white/5 bg-[#0f0f11] text-center">
              <p className="text-xs text-zinc-600">© 2026 OXLYN Software. All rights reserved.</p>
            </div>

          </div>
        </div>
      )}

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

// Reusable Mobile Nav Link Component to ensure consistency
const MobileNavLink = ({ icon, label, onClick, className = "" }: { icon: React.ReactNode, label: string, onClick: () => void, className?: string }) => (
   <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 bg-[#121214] border border-white/5 rounded-xl hover:bg-[#1a1a1c] hover:border-white/10 transition-all group ${className}`}
   >
      <div className="flex items-center gap-4">
         <div className="text-zinc-400 group-hover:text-white transition-colors">{icon}</div>
         <span className="font-medium text-zinc-300 group-hover:text-white transition-colors">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400" />
   </button>
);

export default Navigation;
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const [hasAvailableTokens, setHasAvailableTokens] = useState(false);
  const [hasActiveDownloads, setHasActiveDownloads] = useState(false);
  const [hasClaimedTokens, setHasClaimedTokens] = useState(false);
  const [showDownloadsModal, setShowDownloadsModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutIdent, setCheckoutIdent] = useState<string>('');
  
  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Animation Handlers
  const handleOpenMobileMenu = () => {
    setIsMobileMenuOpen(true);
    setTimeout(() => setIsVisible(true), 10);
  };

  const handleCloseMobileMenu = () => {
    setIsVisible(false);
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
        setHasActiveDownloads(data.hasActiveDownloads || false);
        setHasClaimedTokens(data.hasClaimedTokens || false);
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
      const { basketIdent, packageId } = basketInfo;

      try {
        const TEBEX_TOKEN = 'rnzg-c64b4c58bc9563a37c956af67b1e357a2a414208';
        const addPackageResponse = await fetch(`${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/baskets/${basketIdent}/packages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ package_id: packageId, quantity: 1 }),
        });

        if (!addPackageResponse.ok) {
          console.error('❌ Failed to add package:', addPackageResponse.status, await addPackageResponse.text());
          return;
        }

        flushSync(() => {
          setCheckoutIdent(basketIdent);
          setShowCheckoutModal(true);
        });
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
  };

  return (
    <>
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrollY > 50 ? 'bg-black/60 backdrop-blur-xl shadow-2xl shadow-black/50' : 'bg-black/40 backdrop-blur-lg'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <button
              onClick={() => navigate('/')}
              className={`flex items-center gap-2 transition-all duration-700 hover:scale-105 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <img
                src="https://i.imgur.com/ndYSTED.png"
                alt="OXLYN Logo"
                className="h-9 w-auto drop-shadow-[0_0_15px_rgba(255,149,0,0.5)]"
              />
              <div className="flex items-baseline gap-1">
                <span className="text-orange-500 font-black text-xl tracking-tight drop-shadow-[0_0_10px_rgba(255,149,0,0.4)]">⌞OXLYN⌝</span>
                <span className="text-white/90 font-light text-sm">Software®</span>
              </div>
            </button>

            {/* Desktop Navigation - Frosted Glass Style */}
            <div className={`hidden lg:flex items-center gap-2 transition-all duration-900 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '100ms' }}>
              <button 
                onClick={navigateToScripts} 
                className="group relative px-5 py-2.5 text-gray-300 hover:text-white text-sm font-medium transition-all duration-300 rounded-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-all duration-300 rounded-xl" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 blur-xl" />
                </div>
                <span className="relative z-10">Scripts</span>
              </button>
              
              <div className="relative group">
                <button className="relative px-5 py-2.5 text-gray-500 text-sm font-medium cursor-not-allowed rounded-xl overflow-hidden flex items-center gap-2">
                  <div className="absolute inset-0 bg-white/5" />
                  <span className="relative z-10">Subscription</span>
                  <span className="relative z-10 text-[9px] px-2 py-0.5 bg-purple-500/30 text-purple-300 rounded-md font-bold uppercase tracking-wider backdrop-blur-sm">Soon</span>
                </button>
              </div>
              
              <button 
                onClick={() => window.open('https://docs.oxlynsoftware.com', '_blank')} 
                className="group relative px-5 py-2.5 text-gray-300 hover:text-white text-sm font-medium transition-all duration-300 rounded-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-all duration-300 rounded-xl" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 blur-xl" />
                </div>
                <span className="relative z-10">Documentation</span>
              </button>
              
              <button 
                onClick={() => navigate('/terms')} 
                className="group relative px-5 py-2.5 text-gray-300 hover:text-white text-sm font-medium transition-all duration-300 rounded-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-all duration-300 rounded-xl" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 blur-xl" />
                </div>
                <span className="relative z-10">Terms</span>
              </button>
              
              <button 
                onClick={handleDiscordRedirect} 
                className="group relative px-5 py-2.5 text-gray-300 hover:text-white text-sm font-medium transition-all duration-300 rounded-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-all duration-300 rounded-xl" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 blur-xl" />
                </div>
                <span className="relative z-10">Support</span>
              </button>
            </div>

            {/* Desktop Auth & Cart */}
            <div className={`hidden lg:flex items-center gap-3 transition-all duration-1100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '200ms' }}>
              {isLoggedIn ? (
                <>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="group relative flex items-center gap-2 px-4 py-2.5 rounded-xl overflow-hidden transition-all duration-300 hover:scale-105"
                    >
                      <div className="absolute inset-0 bg-white/10 backdrop-blur-md" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20" />
                      </div>
                      <UserAvatar className="relative z-10 w-6 h-6 rounded-full ring-2 ring-white/20" />
                      <span className="relative z-10 text-white text-sm font-medium">{username}</span>
                      <ChevronDown className="relative z-10 w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-64 bg-black/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-4 py-3 border-b border-white/10">
                          <p className="text-sm text-white font-semibold">{username}</p>
                          <p className="text-xs text-gray-500">ID: {userId}</p>
                        </div>

                        {!isDiscordAuth ? (
                          <button onClick={handleDiscordLogin} className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-3">
                            <svg className="w-5 h-5" viewBox="0 0 16 16" fill="currentColor"><path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/></svg>
                            Connect Discord
                          </button>
                        ) : (
                          <button onClick={handleDiscordLogout} className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-3">
                            <svg className="w-5 h-5 text-[#5865F2]" viewBox="0 0 16 16" fill="currentColor"><path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/></svg>
                            Disconnect {discordUser?.discordUsername}
                          </button>
                        )}

                        {(hasAvailableTokens || hasClaimedTokens) && (
                          <button onClick={handleMyDownloads} className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-3">
                            <PackageIcon className="w-5 h-5" />
                            My Downloads
                            <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                          </button>
                        )}

                        <button onClick={() => window.open('https://checkout.tebex.io/payment-history/login', '_blank')} className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-3">
                          <History className="w-5 h-5" />
                          Order History
                        </button>

                        {discordUser?.role === 'admin' && (
                          <>
                            <div className="my-2 border-t border-white/10" />
                            <button onClick={handleAdminAccess} className="w-full px-4 py-2.5 text-left text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all flex items-center gap-3">
                              <Settings className="w-5 h-5" />
                              Admin Panel
                            </button>
                          </>
                        )}

                        <div className="my-2 border-t border-white/10" />
                        <button onClick={handleLogout} className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all flex items-center gap-3">
                          <LogOut className="w-5 h-5" />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 🔥 COMPLETELY FIXED: Cart Button with FULLY VISIBLE Badge */}
                  <div className="relative">
                    <button 
                      onClick={handleCartClick} 
                      className="group relative p-3 rounded-xl transition-all duration-300 hover:scale-110"
                    >
                      <div className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-xl" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/30 to-red-500/30 rounded-xl" />
                      </div>
                      <ShoppingCart className="relative z-10 w-5 h-5 text-white" />
                    </button>
                    {cartItems.length > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold shadow-lg shadow-orange-500/50 animate-pulse border-2 border-black z-20">
                        {cartItems.length > 99 ? '99+' : cartItems.length}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <button 
                  onClick={handleCFXLogin} 
                  className="group relative px-6 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 text-sm overflow-hidden hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500" />
                  </div>
                  <svg className="relative z-10 w-4 h-4" viewBox="0 0 48 48" fill="currentColor">
                    <polygon points="5,45 9,34 21,22 15,45"></polygon>
                    <polygon points="25,18 33,45 43,45 32,12"></polygon>
                    <polygon points="16.059,14.164 20,3 28,3"></polygon>
                    <polygon points="10.731,29.002 23,17 23,15 11.58,26.667"></polygon>
                    <polygon points="15.142,16.429 13,22 29.724,5.725 28.818,3.178"></polygon>
                    <polygon points="23.932,14.055 24.377,15.626 30.941,9.178 30.385,7.702"></polygon>
                  </svg>
                  <span className="relative z-10 text-white">Sign in with FiveM</span>
                </button>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <div className="lg:hidden flex items-center gap-3">
              {isLoggedIn && (
                <div className="relative">
                  <button onClick={() => navigate('/cart')} className="p-2">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </button>
                  {cartItems.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-black z-20">
                      {cartItems.length > 99 ? '99+' : cartItems.length}
                    </span>
                  )}
                </div>
              )}
              <button onClick={handleOpenMobileMenu} className="p-2 text-white">
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={handleCloseMobileMenu} />
          <div className={`absolute right-0 top-0 h-full w-[85%] max-w-[360px] bg-zinc-900 shadow-2xl flex flex-col transform transition-transform duration-300 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-6 flex items-center justify-between border-b border-zinc-800">
              {isLoggedIn ? (
                <div className="flex items-center gap-3">
                  <UserAvatar className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="text-white font-bold text-sm">{username}</p>
                    <p className="text-xs text-gray-500">ID: {userId}</p>
                  </div>
                </div>
              ) : (
                <img src="https://i.imgur.com/ndYSTED.png" alt="Logo" className="h-8" />
              )}
              <button onClick={handleCloseMobileMenu} className="p-2 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 px-2">Navigation</h3>
                <div className="space-y-1">
                  <MobileNavLink icon={<PackageIcon className="w-5 h-5" />} label="Scripts" onClick={() => { handleCloseMobileMenu(); navigateToScripts(); }} />
                  <MobileNavLink icon={<BookOpen className="w-5 h-5" />} label="Documentation" onClick={() => { handleCloseMobileMenu(); window.open('https://docs.oxlynsoftware.com', '_blank'); }} />
                  <MobileNavLink icon={<span className="text-xs font-bold border border-current px-1 rounded">TERMS</span>} label="Terms of Service" onClick={() => { handleCloseMobileMenu(); navigate('/terms'); }} />
                  <MobileNavLink icon={<MessageCircle className="w-5 h-5" />} label="Support" onClick={() => { handleCloseMobileMenu(); handleDiscordRedirect(); }} />
                </div>
              </div>

              {isLoggedIn ? (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 px-2">Account</h3>
                  <div className="space-y-1">
                    {!isDiscordAuth ? (
                      <MobileNavLink icon={<svg className="w-5 h-5" viewBox="0 0 16 16" fill="currentColor"><path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/></svg>} label="Connect Discord" onClick={handleDiscordLogin} />
                    ) : (
                      <MobileNavLink icon={<svg className="w-5 h-5 text-[#5865F2]" viewBox="0 0 16 16" fill="currentColor"><path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/></svg>} label={`Disconnect ${discordUser?.discordUsername || ''}`} onClick={handleDiscordLogout} />
                    )}
                    <MobileNavLink icon={<History className="w-5 h-5" />} label="Order History" onClick={() => window.open('https://checkout.tebex.io/payment-history/login', '_blank')} />
                    {(hasAvailableTokens || hasClaimedTokens) && (
                      <MobileNavLink icon={<PackageIcon className="w-5 h-5 text-orange-500" />} label="My Downloads" onClick={() => { handleCloseMobileMenu(); setShowDownloadsModal(true); }} />
                    )}
                    {discordUser?.role === 'admin' && (
                      <MobileNavLink icon={<Settings className="w-5 h-5 text-amber-500" />} label="Admin Panel" onClick={() => { handleCloseMobileMenu(); navigate('/admin'); }} className="border-amber-500/20 bg-amber-500/5" />
                    )}
                    <div className="pt-4">
                      <button onClick={() => { handleCloseMobileMenu(); handleLogout(); }} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-medium">
                        <LogOut className="w-4 h-4" /> Log Out
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button onClick={() => { handleCloseMobileMenu(); handleCFXLogin(); }} className="w-full flex items-center justify-center gap-3 py-4 bg-orange-600 text-white rounded-xl font-bold">
                  <svg className="w-5 h-5" viewBox="0 0 48 48" fill="currentColor"><path d="M5,45 9,34 21,22 15,45 M25,18 33,45 43,45 32,12 M16.059,14.164 20,3 28,3 M10.731,29.002 23,17 23,15 11.58,26.667 M15.142,16.429 13,22 29.724,5.725 28.818,3.178 M23.932,14.055 24.377,15.626 30.941,9.178 30.385,7.702" /></svg>
                  Sign in with FiveM
                </button>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 text-center">
              <p className="text-xs text-gray-600">© 2026 OXLYN Software</p>
            </div>
          </div>
        </div>
      )}

      <MyDownloadsModal isOpen={showDownloadsModal} onClose={() => { setShowDownloadsModal(false); if (discordUser?.discordId) { fetch(`${API_URL}/downloads/available`, { credentials: 'include' }).then(res => res.json()).then(data => { setHasAvailableTokens(data.hasAvailableTokens || false); setHasActiveDownloads(data.hasActiveDownloads || false); }).catch(console.error); } }} />
      <CheckoutModal isOpen={showCheckoutModal} ident={checkoutIdent} onClose={() => setShowCheckoutModal(false)} />
    </>
  );
};

const MobileNavLink = ({ icon, label, onClick, className = "" }: { icon: React.ReactNode, label: string, onClick: () => void, className?: string }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-4 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-all ${className}`}>
    <div className="flex items-center gap-4">
      <div className="text-gray-400">{icon}</div>
      <span className="font-medium text-white">{label}</span>
    </div>
    <ChevronRight className="w-5 h-5 text-gray-600" />
  </button>
);

export default Navigation;

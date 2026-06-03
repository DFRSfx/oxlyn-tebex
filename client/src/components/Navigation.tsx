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
  ChevronRight,
} from 'lucide-react';
import { PageType, Package } from '../types';
import { useTebex } from '../context/TebexContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import UserAvatar from './UserAvatar';
import MyDownloadsModal from './MyDownloadsModal';
import CheckoutModal from './CheckoutModal';
import OptimizedImage from './OptimizedImage';
import CurrencySwitcher from './CurrencySwitcher';
import { API_URL } from '../config/api';
import { tebexService } from '../services/tebexService';
import { useAnalytics } from '../hooks/useAnalytics';
import { handleDiscordRedirect, handleYoutubeRedirect } from '../utils/helpers';

interface NavigationProps {
  isScrolled: boolean;
  isLoaded: boolean;
  currentPage: PageType;
  packages: Package[];
  navigateToScripts: () => void;
  navigateToHome: () => void;
  handleDiscordRedirect: () => void;
  openPackageDetails: (pkg: Package) => void;
}

const DOCS_URL = 'https://docs.oxlynsoftware.com';

const Navigation: React.FC<NavigationProps> = ({ isScrolled }) => {
  const { isLoggedIn, cartItems, openLoginModal, logout, cfxUserData } = useTebex();
  const { user: discordUser, isAuthenticated: isDiscordAuth, getDiscordAuthUrl, logout: discordLogout } = useAuth();
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();
  const location = useLocation();

  // Avatar dropdown (logged-in menu)
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  // Scripts hover dropdown
  const [isScriptsOpen, setIsScriptsOpen] = useState(false);
  const scriptsCloseTimer = useRef<number | null>(null);

  // Mobile drawer
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Download state (for "My Downloads" badge in the avatar menu)
  const [hasAvailableTokens, setHasAvailableTokens] = useState(false);
  const [hasClaimedTokens, setHasClaimedTokens] = useState(false);
  const [showDownloadsModal, setShowDownloadsModal] = useState(false);

  // Pending Tebex basket auto-completion flow
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutIdent, setCheckoutIdent] = useState<string>('');

  const avatarMenuRef = useRef<HTMLDivElement>(null);

  const handleOpenMobileMenu = () => {
    setIsMobileMenuOpen(true);
    setTimeout(() => setIsVisible(true), 10);
  };
  const handleCloseMobileMenu = () => {
    setIsVisible(false);
    setTimeout(() => setIsMobileMenuOpen(false), 300);
  };

  useEffect(() => {
    if (isMobileMenuOpen) handleCloseMobileMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Token availability check — drives the red dot on "My Downloads"
  useEffect(() => {
    const checkTokens = async () => {
      if (document.hidden || !discordUser?.discordId) return;
      try {
        const response = await fetch(`${API_URL}/downloads/available`, { credentials: 'include' });
        const data = await response.json();
        setHasAvailableTokens(data.hasAvailableTokens || false);
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

  // Auto-complete pending Tebex basket after game-auth redirect
  useEffect(() => {
    const completePendingBasket = async (basketInfo: any) => {
      const { basketIdent, packageId } = basketInfo;
      try {
        const ok = await tebexService.addToBasket(basketIdent, packageId, 1);
        if (!ok) return;
        flushSync(() => {
          setCheckoutIdent(basketIdent);
          setShowCheckoutModal(true);
        });
      } catch (error) {
        console.error('Error completing pending basket:', error);
      }
    };
    const pendingBasket = localStorage.getItem('tebex_pending_basket');
    if (pendingBasket) {
      completePendingBasket(JSON.parse(pendingBasket));
      localStorage.removeItem('tebex_pending_basket');
    }
  }, []);

  // Avatar dropdown click-outside
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
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

  // Tracked separately because the user's intent is "I want to log in" —
  // the actual Cfx OAuth handoff happens once they confirm in the modal.
  // The modal itself is global (rendered by TebexProvider), shared with the
  // Add-to-Cart gate, so we just open it here.
  const handleCFXLogin = () => {
    trackEvent('cfx_login_clicked');
    openLoginModal();
  };

  const handleLogout = () => {
    trackEvent('logout_clicked', { eventData: { username: cfxUserData?.username, had_discord: isDiscordAuth } });
    setIsAvatarMenuOpen(false);
    logout();
  };

  const handleMyDownloads = () => {
    trackEvent('my_downloads_clicked');
    setIsAvatarMenuOpen(false);
    setShowDownloadsModal(true);
  };

  const handleAdminAccess = () => {
    trackEvent('admin_access_clicked', { eventData: { discord_username: discordUser?.discordUsername } });
    setIsAvatarMenuOpen(false);
    navigate('/admin');
  };

  const handleCartClick = () => {
    trackEvent('cart_icon_clicked', { eventData: { cart_items: cartItems.length } });
    navigate('/cart');
  };

  // Scripts dropdown hover — small close delay so the cursor can travel from
  // the trigger to the panel without the panel snapping shut mid-move.
  const openScripts = () => {
    if (scriptsCloseTimer.current !== null) {
      window.clearTimeout(scriptsCloseTimer.current);
      scriptsCloseTimer.current = null;
    }
    setIsScriptsOpen(true);
  };
  const closeScriptsSoon = () => {
    if (scriptsCloseTimer.current !== null) window.clearTimeout(scriptsCloseTimer.current);
    scriptsCloseTimer.current = window.setTimeout(() => setIsScriptsOpen(false), 150);
  };

  const isScriptsActive =
    location.pathname === '/scripts' ||
    location.pathname === '/bundles' ||
    location.pathname === '/subscription';

  return (
    <>
      <nav className={`oxlyn-nav ${isScrolled ? 'is-scrolled' : ''}`}>
        <div className="oxlyn-nav-inner">
          {/* === Brand === */}
          <button onClick={() => navigate('/')} className="oxlyn-brand" aria-label="OXLYN home">
            <div className="oxlyn-brand-logo">
              <OptimizedImage
                src="/logo.webp"
                alt="OXLYN"
                width={64}
                format="webp"
                decoding="async"
                fetchPriority="high"
                className="h-9 sm:h-10 w-auto"
              />
            </div>
            <span className="oxlyn-brand-wordmark">
              OXLYN<span className="oxlyn-brand-dot">.</span>
            </span>
            {/* Tebex co-brand mark — narrow vertical glyph beside the
                OXLYN brand. The source PNG is 14×32, so the rendered slot
                is tall + narrow at the same height as the wordmark. */}
            <span className="oxlyn-brand-sep" aria-hidden="true" />
            <img
              src="/tebex-logo.png"
              alt="Tebex"
              loading="eager"
              decoding="async"
              width={14}
              height={32}
              className="oxlyn-brand-tebex"
              draggable={false}
            />
          </button>

          {/* === Center nav (desktop) === */}
          <div className="oxlyn-nav-links">
            <span className="oxlyn-nav-divider" aria-hidden="true" />

            <NavTextLink active={location.pathname === '/'} onClick={() => navigate('/')}>
              Home
            </NavTextLink>

            <div
              className="oxlyn-nav-dropdown-wrap"
              onMouseEnter={openScripts}
              onMouseLeave={closeScriptsSoon}
            >
              <button
                className={`oxlyn-nav-link ${isScriptsActive ? 'is-active' : ''}`}
                onClick={() => navigate('/scripts')}
                aria-haspopup="true"
                aria-expanded={isScriptsOpen}
              >
                Scripts
                <ChevronDown size={14} className={`oxlyn-nav-caret ${isScriptsOpen ? 'is-open' : ''}`} />
              </button>

              {isScriptsOpen && (
                <div className="oxlyn-nav-dropdown" role="menu">
                  <DropdownItem
                    label="All Scripts"
                    description="Browse every script in the catalog"
                    onClick={() => { setIsScriptsOpen(false); navigate('/scripts'); }}
                  />
                  <DropdownItem
                    label="Bundles"
                    description="Discounted multi-script packages"
                    onClick={() => { setIsScriptsOpen(false); navigate('/bundles'); }}
                  />
                  <DropdownItem
                    label="Subscriptions"
                    description="Recurring access plans"
                    onClick={() => { setIsScriptsOpen(false); navigate('/subscription'); }}
                  />
                </div>
              )}
            </div>

            <NavTextLink onClick={() => window.open(DOCS_URL, '_blank')}>
              Documentation
            </NavTextLink>
          </div>

          {/* === Right actions (desktop) ===
              Discord + YouTube intentionally live only in the Footer and the
              mobile drawer — keeps the desktop nav focused on commerce
              (currency → cart → account). */}
          <div className="oxlyn-nav-actions">
            <CurrencySwitcher />

            <IconButton
              aria-label="Cart"
              onClick={handleCartClick}
              badge={cartItems.length > 0 ? (cartItems.length > 99 ? '99+' : String(cartItems.length)) : null}
            >
              <ShoppingCart size={18} />
            </IconButton>

            {isLoggedIn ? (
              <div className="oxlyn-avatar-wrap" ref={avatarMenuRef}>
                <button
                  onClick={() => setIsAvatarMenuOpen((v) => !v)}
                  className="oxlyn-avatar-button"
                  aria-haspopup="true"
                  aria-expanded={isAvatarMenuOpen}
                >
                  <UserAvatar className="w-7 h-7 rounded-full ring-1 ring-white/15" />
                  <span className="oxlyn-avatar-name">{username}</span>
                  <ChevronDown size={14} className="oxlyn-avatar-caret" />
                </button>

                {isAvatarMenuOpen && (
                  <div className="oxlyn-avatar-menu">
                    <div className="oxlyn-avatar-menu-header">
                      <p className="oxlyn-avatar-menu-name">{username}</p>
                      <p className="oxlyn-avatar-menu-id">ID: {userId}</p>
                    </div>

                    {!isDiscordAuth ? (
                      <MenuItem icon={<DiscordIcon className="w-4 h-4" />} onClick={handleDiscordLogin}>
                        Connect Discord
                      </MenuItem>
                    ) : (
                      <MenuItem icon={<DiscordIcon className="w-4 h-4 text-[#5865F2]" />} onClick={handleDiscordLogout}>
                        Disconnect {discordUser?.discordUsername}
                      </MenuItem>
                    )}

                    {(hasAvailableTokens || hasClaimedTokens) && (
                      <MenuItem icon={<PackageIcon className="w-4 h-4" />} onClick={handleMyDownloads}>
                        My Downloads
                        <span className="ml-auto w-2 h-2 bg-red-500 rounded-full shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                      </MenuItem>
                    )}

                    <MenuItem
                      icon={<History className="w-4 h-4" />}
                      onClick={() => window.open('https://checkout.tebex.io/payment-history/login', '_blank')}
                    >
                      Order History
                    </MenuItem>

                    {discordUser?.role === 'admin' && (
                      <>
                        <div className="oxlyn-menu-sep" />
                        <MenuItem icon={<Settings className="w-4 h-4 text-amber-400" />} onClick={handleAdminAccess} tone="admin">
                          Admin Panel
                        </MenuItem>
                      </>
                    )}

                    <div className="oxlyn-menu-sep" />
                    <MenuItem icon={<LogOut className="w-4 h-4" />} onClick={handleLogout} tone="danger">
                      Logout
                    </MenuItem>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleCFXLogin}
                aria-label="Sign in with FiveM"
                className="oxlyn-login-btn"
              >
                <FiveMIcon className="w-[16px] h-[16px]" />
                <span>Login In</span>
              </button>
            )}
          </div>

          {/* === Mobile toggle === */}
          <div className="oxlyn-mobile-toggle-wrap">
            {isLoggedIn && cartItems.length > 0 && (
              <IconButton aria-label="Cart" onClick={() => navigate('/cart')} badge={cartItems.length > 99 ? '99+' : String(cartItems.length)}>
                <ShoppingCart size={18} />
              </IconButton>
            )}
            <button onClick={handleOpenMobileMenu} className="oxlyn-mobile-toggle" aria-label="Open menu">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* === Mobile drawer === */}
      {isMobileMenuOpen && (
        <div className="oxlyn-mobile-overlay">
          <div
            className={`oxlyn-mobile-backdrop ${isVisible ? 'is-visible' : ''}`}
            onClick={handleCloseMobileMenu}
          />
          <aside className={`oxlyn-mobile-drawer ${isVisible ? 'is-visible' : ''}`}>
            <div className="oxlyn-mobile-drawer-header">
              {isLoggedIn ? (
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar className="w-10 h-10 rounded-full ring-1 ring-white/10" />
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate">{username}</p>
                    <p className="text-[11px] text-gray-500 truncate">ID: {userId}</p>
                  </div>
                </div>
              ) : (
                <button onClick={() => { handleCloseMobileMenu(); navigate('/'); }} className="oxlyn-brand">
                  <OptimizedImage src="/logo.webp" alt="OXLYN" width={64} format="webp" className="h-9 w-auto" />
                  <span className="oxlyn-brand-wordmark">
                    OXLYN<span className="oxlyn-brand-dot">.</span>
                  </span>
                </button>
              )}
              <button onClick={handleCloseMobileMenu} className="oxlyn-mobile-close" aria-label="Close menu">
                <X size={16} />
              </button>
            </div>

            <div className="oxlyn-mobile-content">
              <SectionLabel>Currency</SectionLabel>
              <div className="oxlyn-mobile-currency">
                <CurrencySwitcher />
              </div>

              <SectionLabel>Navigation</SectionLabel>
              <div className="space-y-2">
                <MobileLink label="Home" onClick={() => { handleCloseMobileMenu(); navigate('/'); }} />
                <MobileLink label="All Scripts" onClick={() => { handleCloseMobileMenu(); navigate('/scripts'); }} />
                <MobileLink label="Bundles" onClick={() => { handleCloseMobileMenu(); navigate('/bundles'); }} />
                <MobileLink label="Subscriptions" onClick={() => { handleCloseMobileMenu(); navigate('/subscription'); }} />
                <MobileLink
                  icon={<BookOpen className="w-4 h-4" />}
                  label="Documentation"
                  onClick={() => { handleCloseMobileMenu(); window.open(DOCS_URL, '_blank'); }}
                />
              </div>

              <SectionLabel>Community</SectionLabel>
              <div className="space-y-2">
                <MobileLink
                  icon={<DiscordIcon className="w-4 h-4" />}
                  label="Discord"
                  onClick={() => { handleCloseMobileMenu(); handleDiscordRedirect(); }}
                />
                <MobileLink
                  icon={<YouTubeIcon className="w-4 h-4" />}
                  label="YouTube"
                  onClick={() => { handleCloseMobileMenu(); handleYoutubeRedirect(); }}
                />
              </div>

              {isLoggedIn ? (
                <>
                  <SectionLabel>Account</SectionLabel>
                  <div className="space-y-2">
                    {!isDiscordAuth ? (
                      <MobileLink icon={<DiscordIcon className="w-4 h-4" />} label="Connect Discord" onClick={handleDiscordLogin} />
                    ) : (
                      <MobileLink
                        icon={<DiscordIcon className="w-4 h-4 text-[#5865F2]" />}
                        label={`Disconnect ${discordUser?.discordUsername || ''}`}
                        onClick={handleDiscordLogout}
                      />
                    )}
                    <MobileLink
                      icon={<History className="w-4 h-4" />}
                      label="Order History"
                      onClick={() => window.open('https://checkout.tebex.io/payment-history/login', '_blank')}
                    />
                    {(hasAvailableTokens || hasClaimedTokens) && (
                      <MobileLink
                        icon={<PackageIcon className="w-4 h-4" />}
                        label="My Downloads"
                        onClick={() => { handleCloseMobileMenu(); setShowDownloadsModal(true); }}
                      />
                    )}
                    {discordUser?.role === 'admin' && (
                      <MobileLink
                        icon={<Settings className="w-4 h-4" />}
                        label="Admin Panel"
                        onClick={() => { handleCloseMobileMenu(); navigate('/admin'); }}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => { handleCloseMobileMenu(); handleLogout(); }}
                    className="oxlyn-mobile-logout"
                  >
                    <LogOut className="w-4 h-4" /> Log Out
                  </button>
                </>
              ) : (
                <>
                  <SectionLabel>Sign In</SectionLabel>
                  <button
                    onClick={() => { handleCloseMobileMenu(); handleCFXLogin(); }}
                    className="oxlyn-mobile-cta"
                  >
                    <FiveMIcon className="w-4 h-4" />
                    <span>Sign in with FiveM</span>
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      <MyDownloadsModal
        isOpen={showDownloadsModal}
        onClose={() => {
          setShowDownloadsModal(false);
          if (discordUser?.discordId) {
            fetch(`${API_URL}/downloads/available`, { credentials: 'include' })
              .then((r) => r.json())
              .then((data) => {
                setHasAvailableTokens(data.hasAvailableTokens || false);
                setHasClaimedTokens(data.hasClaimedTokens || false);
              })
              .catch(console.error);
          }
        }}
      />
      <CheckoutModal isOpen={showCheckoutModal} ident={checkoutIdent} onClose={() => setShowCheckoutModal(false)} />
    </>
  );
};

// ============================================================
// Sub-components
// ============================================================

const NavTextLink: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}> = ({ children, onClick, active }) => (
  <button onClick={onClick} className={`oxlyn-nav-link ${active ? 'is-active' : ''}`}>
    {children}
  </button>
);

const DropdownItem: React.FC<{
  label: string;
  description: string;
  onClick: () => void;
}> = ({ label, description, onClick }) => (
  <button onClick={onClick} className="oxlyn-nav-dropdown-item">
    <span className="oxlyn-nav-dropdown-label">{label}</span>
    <span className="oxlyn-nav-dropdown-desc">{description}</span>
  </button>
);

const IconButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  'aria-label': string;
  badge?: string | null;
  tone?: 'discord' | 'youtube' | 'primary';
}> = ({ children, onClick, 'aria-label': ariaLabel, badge, tone }) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel}
    className={`oxlyn-icon-btn ${tone ? `tone-${tone}` : ''}`}
  >
    {children}
    {badge && <span className="oxlyn-icon-badge">{badge}</span>}
  </button>
);

const MenuItem: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
  tone?: 'admin' | 'danger';
}> = ({ icon, onClick, children, tone }) => (
  <button onClick={onClick} className={`oxlyn-menu-item ${tone ? `tone-${tone}` : ''}`}>
    {icon}
    {children}
  </button>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="oxlyn-mobile-section">
    <span>{children}</span>
    <div className="oxlyn-mobile-section-line" />
  </div>
);

const MobileLink: React.FC<{
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}> = ({ label, onClick, icon }) => (
  <button onClick={onClick} className="oxlyn-mobile-link">
    <span className="oxlyn-mobile-link-inner">
      {icon && <span className="oxlyn-mobile-link-icon">{icon}</span>}
      <span className="oxlyn-mobile-link-label">{label}</span>
    </span>
    <ChevronRight className="w-4 h-4 text-gray-600" />
  </button>
);

// ============================================================
// Icon glyphs
// ============================================================

const DiscordIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 16 16" fill="currentColor">
    <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
  </svg>
);

const YouTubeIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const FiveMIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 48 48" fill="currentColor">
    <polygon points="5,45 9,34 21,22 15,45" />
    <polygon points="25,18 33,45 43,45 32,12" />
    <polygon points="16.059,14.164 20,3 28,3" />
    <polygon points="10.731,29.002 23,17 23,15 11.58,26.667" />
    <polygon points="15.142,16.429 13,22 29.724,5.725 28.818,3.178" />
    <polygon points="23.932,14.055 24.377,15.626 30.941,9.178 30.385,7.702" />
  </svg>
);

export default Navigation;

import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Youtube, ShoppingCart, LogOut, ExternalLink, Settings, Package as PackageIcon } from 'lucide-react';
import { PageType, Package } from '../types';
import { useTebex } from '../context/TebexContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import UserAvatar from './UserAvatar';
import SearchBar from './SearchBar';
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
  handleYoutubeRedirect: () => void;
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
  handleYoutubeRedirect,
  openPackageDetails,
}) => {
  const { isLoggedIn, cartItems, login, logout, cfxUserData } = useTebex();
  const { user: discordUser, isAuthenticated: isDiscordAuth, getDiscordAuthUrl, logout: discordLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDiscordDropdownOpen, setIsDiscordDropdownOpen] = useState(false);
  const [hasAvailableTokens, setHasAvailableTokens] = useState(false);
  const [showDownloadsModal, setShowDownloadsModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const discordDropdownRef = useRef<HTMLDivElement>(null);


  // Check for available tokens
  useEffect(() => {
    const checkTokens = async () => {
      if (!discordUser?.discordId) return;

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
      // Check every 30 seconds for new tokens
      const interval = setInterval(checkTokens, 30000);
      return () => clearInterval(interval);
    }
  }, [discordUser?.discordId]);

  // Check for pending Tebex basket after FiveM auth redirect
  useEffect(() => {
    const completePendingBasket = async (basketInfo: any) => {
      const TEBEX_API_BASE = 'https://headless.tebex.io/api';
      const { basketIdent, packageId, token } = basketInfo;

      try {
        console.log('🔄 Completing pending basket after auth:', basketIdent);

        // Add package to basket (now authenticated)
        const addPackageResponse = await fetch(`${TEBEX_API_BASE}/baskets/${basketIdent}/packages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            package_id: packageId.toString(),
            quantity: 1,
          }),
        });

        if (!addPackageResponse.ok) {
          const errorData = await addPackageResponse.text();
          console.error('❌ Failed to add package:', errorData);
          return;
        }

        // Get checkout URL
        const checkoutResponse = await fetch(`${TEBEX_API_BASE}/accounts/${token}/baskets/${basketIdent}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!checkoutResponse.ok) {
          console.error('❌ Failed to get checkout URL');
          return;
        }

        const checkoutData = await checkoutResponse.json();
        const checkoutUrl = checkoutData.data?.links?.checkout;

        if (!checkoutUrl) {
          console.error('❌ No checkout URL received');
          return;
        }

        console.log('✅ Opening checkout:', checkoutUrl);
        // Update state immediately - don't skip even if unmounted, let React handle it
        flushSync(() => {
          setCheckoutUrl(checkoutUrl);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (discordDropdownRef.current && !discordDropdownRef.current.contains(event.target as Node)) {
        setIsDiscordDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const username = cfxUserData?.username || 'User';
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
            <div className={`flex items-center space-x-4 transition-all duration-1000 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-4'}`}>
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
            </div>

            <div className={`hidden lg:flex items-center space-x-3 text-sm font-medium transition-all duration-1200 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '200ms' }}>
              {currentPage === 'home' && location.pathname === '/' ? (
                <button onClick={navigateToScripts} className="nav-link">Scripts</button>
              ) : (
                <button onClick={() => {
                  if (location.pathname !== '/') {
                    navigate('/');
                  } else {
                    navigateToHome();
                  }
                }} className="nav-link">Home</button>
              )}
              <div className="relative">
                <span className="coming-soon-tag-small">COMING SOON</span>
                <button className="nav-link flex items-center opacity-50 cursor-not-allowed">
                  Subscription
                </button>
              </div>
              <a href="https://docs.oxlynsoftware.com" target="_blank" rel="noopener noreferrer" className="nav-link flex items-center gap-1">
                Docs
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <button onClick={handleDiscordRedirect} className="nav-link p-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-discord" viewBox="0 0 16 16">
                  <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
                </svg>
              </button>
              <button onClick={handleYoutubeRedirect} className="nav-link p-3">
                <Youtube className="w-5 h-5" />
              </button>
              <SearchBar packages={packages} onSelectPackage={openPackageDetails} />
            </div>

            <div className={`flex items-center space-x-3 transition-all duration-1400 ${isLoaded ? 'apple-fade-in' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '400ms' }}>
              {isLoggedIn ? (
                <div className="flex flex-row space-x-4 items-center">
                  {/* Discord Login/Account Button */}
                  {!isDiscordAuth ? (
                    <button
                      onClick={handleDiscordLogin}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all hover:scale-105 border border-gray-700 bg-transparent shadow-xs hover:bg-gray-800 hover:border-gray-600 h-9 px-3 py-2 text-sm hover:cursor-pointer"
                    >
                      <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 126.644 96">
                        <path fill="currentColor" d="M81.15,0c-1.2376,2.1973-2.3489,4.4704-3.3591,6.794-9.5975-1.4396-19.3718-1.4396-28.9945,0-.985-2.3236-2.1216-4.5967-3.3591-6.794-9.0166,1.5407-17.8059,4.2431-26.1405,8.0568C2.779,32.5304-1.6914,56.3725.5312,79.8863c9.6732,7.1476,20.5083,12.603,32.0505,16.0884,2.6014-3.4854,4.8998-7.1981,6.8698-11.0623-3.738-1.3891-7.3497-3.1318-10.8098-5.1523.9092-.6567,1.7932-1.3386,2.6519-1.9953,20.281,9.547,43.7696,9.547,64.0758,0,.8587.7072,1.7427,1.3891,2.6519,1.9953-3.4601,2.0457-7.0718,3.7632-10.835,5.1776,1.97,3.8642,4.2683,7.5769,6.8698,11.0623,11.5419-3.4854,22.3769-8.9156,32.0509-16.0631,2.626-27.2771-4.496-50.9172-18.817-71.8548C98.9811,4.2684,90.1918,1.5659,81.1752.0505l-.0252-.0505ZM42.2802,65.4144c-6.2383,0-11.4159-5.6575-11.4159-12.6535s4.9755-12.6788,11.3907-12.6788,11.5169,5.708,11.4159,12.6788c-.101,6.9708-5.026,12.6535-11.3907,12.6535ZM84.3576,65.4144c-6.2637,0-11.3907-5.6575-11.3907-12.6535s4.9755-12.6788,11.3907-12.6788,11.4917,5.708,11.3906,12.6788c-.101,6.9708-5.026,12.6535-11.3906,12.6535Z"/>
                      </svg>
                      <span className="hidden sm:inline">Sign in with Discord</span>
                    </button>
                  ) : (
                    <div className="relative" ref={discordDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsDiscordDropdownOpen(!isDiscordDropdownOpen)}
                        className="relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all hover:scale-105 border border-gray-700 bg-transparent shadow-xs hover:bg-gray-800 hover:border-gray-600 h-9 px-3 py-2 text-sm hover:cursor-pointer"
                      >
                        <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 126.644 96">
                          <path fill="currentColor" d="M81.15,0c-1.2376,2.1973-2.3489,4.4704-3.3591,6.794-9.5975-1.4396-19.3718-1.4396-28.9945,0-.985-2.3236-2.1216-4.5967-3.3591-6.794-9.0166,1.5407-17.8059,4.2431-26.1405,8.0568C2.779,32.5304-1.6914,56.3725.5312,79.8863c9.6732,7.1476,20.5083,12.603,32.0505,16.0884,2.6014-3.4854,4.8998-7.1981,6.8698-11.0623-3.738-1.3891-7.3497-3.1318-10.8098-5.1523.9092-.6567,1.7932-1.3386,2.6519-1.9953,20.281,9.547,43.7696,9.547,64.0758,0,.8587.7072,1.7427,1.3891,2.6519,1.9953-3.4601,2.0457-7.0718,3.7632-10.835,5.1776,1.97,3.8642,4.2683,7.5769,6.8698,11.0623,11.5419-3.4854,22.3769-8.9156,32.0509-16.0631,2.626-27.2771-4.496-50.9172-18.817-71.8548C98.9811,4.2684,90.1918,1.5659,81.1752.0505l-.0252-.0505ZM42.2802,65.4144c-6.2383,0-11.4159-5.6575-11.4159-12.6535s4.9755-12.6788,11.3907-12.6788,11.5169,5.708,11.4159,12.6788c-.101,6.9708-5.026,12.6535-11.3907,12.6535ZM84.3576,65.4144c-6.2637,0-11.3907-5.6575-11.3907-12.6535s4.9755-12.6788,11.3907-12.6788,11.4917,5.708,11.3906,12.6788c-.101,6.9708-5.026,12.6535-11.3906,12.6535Z"/>
                        </svg>
                        <span className="hidden sm:inline">Manage Account</span>
                        {hasAvailableTokens && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                        )}
                      </button>

                      {isDiscordDropdownOpen && (
                        <div className="user-dropdown-menu">
                          <div className="user-dropdown-header">
                            <div className="user-dropdown-info">
                              {discordUser?.discordAvatar ? (
                                <img
                                  src={`https://cdn.discordapp.com/avatars/${discordUser.discordId}/${discordUser.discordAvatar}.png`}
                                  alt={discordUser.discordUsername}
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-sm font-bold">
                                    {discordUser?.discordUsername?.charAt(0).toUpperCase() || 'D'}
                                  </span>
                                </div>
                              )}
                              <div className="user-dropdown-text">
                                <p className="font-semibold">{discordUser?.discordUsername || 'Discord User'}</p>
                                <p className="text-xs text-gray-500 capitalize">{discordUser?.role || 'user'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="user-dropdown-divider"></div>
                          
                          <button
                            onClick={() => {
                              setIsDiscordDropdownOpen(false);
                              setShowDownloadsModal(true);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left"
                          >
                            <div className="flex items-center">
                              <PackageIcon className="mr-2 h-4 w-4" />
                              My Downloads
                            </div>
                            {hasAvailableTokens && (
                              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                                !
                              </span>
                            )}
                          </button>

                          {discordUser?.role === 'admin' && (
                            <>
                              <div className="user-dropdown-divider"></div>
                              <a
                                href="/admin"
                                className="flex items-center px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 transition-colors font-medium"
                                onClick={() => setIsDiscordDropdownOpen(false)}
                              >
                                <Settings className="mr-2 h-4 w-4" />
                                Admin Panel
                              </a>
                            </>
                          )}

                          <div className="user-dropdown-divider"></div>
                          <button
                            onClick={() => {
                              setIsDiscordDropdownOpen(false);
                              discordLogout();
                            }}
                            className="logout-button"
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Disconnect Discord
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      navigate('/cart');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="relative nav-link p-3"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {cartItems.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {cartItems.length}
                      </span>
                    )}
                  </button>
                  
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="user-avatar-button"
                    >
                      <UserAvatar className="h-9 w-9 border" />
                    </button>

                    {isDropdownOpen && (
                      <div className="user-dropdown-menu">
                        <div className="user-dropdown-header">
                          <div className="user-dropdown-info">
                            <UserAvatar className="user-dropdown-avatar" />
                            <div className="user-dropdown-text">
                              <p>FiveM/CFX: {username}</p>
                              <p>ID: {userId}</p>
                            </div>
                          </div>
                        </div>
                        <div className="user-dropdown-divider"></div>
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            logout();
                          }}
                          className="logout-button"
                        >
                          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                          Log out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={login}
                  className="fivem-signin-button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18" height="19" viewBox="0 0 48 48">
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
          </div>
        </div>
      </nav>

      <MyDownloadsModal
        isOpen={showDownloadsModal}
        onClose={() => {
          setShowDownloadsModal(false);
          // Recheck tokens when modal closes
          if (discordUser?.discordId) {
            fetch(`${API_URL}/downloads/available`, {
              credentials: 'include',
            })
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

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tebexService, BasketData, CartItem } from '../services/tebexService';
import { API_URL } from '../config/api';
import { getAnalytics } from '../services/analytics/AnalyticsSDK';

interface CFXUserData {
  username: string;
  avatar_template: string;
  user_id: number;
}

interface AppliedCoupon {
  code: string;
  discountAmount: number;
}

interface TebexContextType {
  isLoggedIn: boolean;
  cartItems: CartItem[];
  basketIdent: string | null;
  isLoading: boolean;
  loadingMessage: string;
  cfxUserData: CFXUserData | null;
  checkoutUrl: string | null;
  isCheckoutOpen: boolean;
  appliedCoupon: AppliedCoupon | null;
  login: () => Promise<void>;
  logout: () => void;
  addToCart: (item: CartItem) => Promise<boolean>;
  removeFromCart: (packageId: number) => Promise<void>;
  isInCart: (packageId: number) => boolean;
  proceedToCheckout: () => Promise<void>;
  closeCheckout: () => void;
  enrichCartWithPackageData: (packages: any[]) => void;
  applyCoupon: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeCoupon: () => Promise<{ success: boolean; error?: string }>;
}

const TebexContext = createContext<TebexContextType | undefined>(undefined);

export const useTebex = () => {
  const context = useContext(TebexContext);
  if (!context) {
    throw new Error('useTebex must be used within TebexProvider');
  }
  return context;
};

interface TebexProviderProps {
  children: ReactNode;
}

export const TebexProvider: React.FC<TebexProviderProps> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [basketIdent, setBasketIdent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [cfxUserData, setCfxUserData] = useState<CFXUserData | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const fetchCFXUserInfo = async (usernameId: string): Promise<{ username: string; avatar_template: string } | null> => {
    try {
      const userInfo = await tebexService.fetchCFXUserInfo(usernameId);
      if (userInfo) {
        return {
          username: userInfo.username,
          avatar_template: userInfo.avatar_template,
        };
      }
    } catch (error) {
    }
    return null;
  };

  const fetchCFXUserData = async () => {
    try {
      if (!basketIdent) {
        return;
      }

      const basketData = await tebexService.fetchBasketData(basketIdent);
      
      if (basketData?.data) {
        
        // Extract user information from basket data
        if (basketData.data.username_id) {
          // Fetch user info from CFX policy API
          const userInfo = await fetchCFXUserInfo(basketData.data.username_id);
          
          if (userInfo) {
            const userData: CFXUserData = {
              username: userInfo.username,
              avatar_template: userInfo.avatar_template,
              user_id: parseInt(basketData.data.username_id) || 0,
            };
            
            setCfxUserData(userData);
            sessionStorage.setItem('cfxUserData', JSON.stringify(userData));
          }
        }
      }
    } catch (error) {
    }
  };

  const recordCfxLoginStats = async (cfxIdentifier: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/orders/stats/record-cfx-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          cfxIdentifier: cfxIdentifier,
        }),
      });

      if (response.ok) {
        console.log(`✅ [STATS] CFX login recorded: ${cfxIdentifier}`);
      } else {
        console.error(`❌ [STATS] Failed to record CFX login: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ [STATS] Error recording CFX login:`, error);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      setLoadingMessage('Initializing session...');
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const storedBasketIdent = sessionStorage.getItem('basketIdent');

        if (success === 'true' && storedBasketIdent) {
          // Handle successful auth redirect
          setBasketIdent(storedBasketIdent);
          setIsLoggedIn(true);

          // Restore applied coupon from session if it exists
          const storedAppliedCoupon = sessionStorage.getItem('appliedCoupon');
          if (storedAppliedCoupon) {
            setAppliedCoupon(JSON.parse(storedAppliedCoupon));
          }

          // Fetch user data after successful login
          const basketData = await tebexService.fetchBasketData(storedBasketIdent);

          if (basketData?.data) {
            // Store complete basket data
            sessionStorage.setItem('basketData', JSON.stringify(basketData));

            // Extract and store user information
            if (basketData.data.username_id) {
              // Fetch user info from CFX policy API
              const userInfo = await fetchCFXUserInfo(basketData.data.username_id);

              if (userInfo) {
                const userData: CFXUserData = {
                  username: userInfo.username,
                  avatar_template: userInfo.avatar_template,
                  user_id: parseInt(basketData.data.username_id) || 0,
                };
                setCfxUserData(userData);
                sessionStorage.setItem('cfxUserData', JSON.stringify(userData));

                // 📊 Record CFX login in statistics (only once)
                const cfxStatsRecorded = sessionStorage.getItem('cfxStatsRecorded');
                if (!cfxStatsRecorded) {
                  await recordCfxLoginStats(basketData.data.username_id);
                  sessionStorage.setItem('cfxStatsRecorded', 'true');
                  // Store CFX identifier in localStorage to link with future Discord login
                  localStorage.setItem('cfxIdentifier', basketData.data.username_id);
                }
              }
            }
          }

          const items = await tebexService.fetchCartData(storedBasketIdent);
          setCartItems(items);
          sessionStorage.setItem('cartItems', JSON.stringify(items));
        } else {
          // Standard initialization from session
          const storedBasketData = sessionStorage.getItem('basketData');
          const storedCfxData = sessionStorage.getItem('cfxUserData');
          const storedAppliedCoupon = sessionStorage.getItem('appliedCoupon');

          if (storedBasketData && storedCfxData) {
            const basketData: BasketData = JSON.parse(storedBasketData);
            const ident = basketData.data?.ident;
            if (ident) {
              try {
                // Validate basket is still active by fetching fresh data
                const freshBasketData = await tebexService.fetchBasketData(ident);

                if (freshBasketData?.data && freshBasketData.data.username_id) {
                  // Basket is valid, proceed with login
                  setBasketIdent(ident);
                  setIsLoggedIn(true);
                  setCfxUserData(JSON.parse(storedCfxData));

                  // Load stored applied coupon
                  if (storedAppliedCoupon) {
                    setAppliedCoupon(JSON.parse(storedAppliedCoupon));
                  }

                  const items = await tebexService.fetchCartData(ident);
                  setCartItems(items);
                  sessionStorage.setItem('cartItems', JSON.stringify(items));
                } else {
                  // Basket is invalid or expired, clear session
                  console.log('⚠️ Basket expired or invalid, clearing session');
                  sessionStorage.clear();
                }
              } catch (error) {
                // Error validating basket, clear session
                console.log('⚠️ Error validating basket, clearing session');
                sessionStorage.clear();
              }
            }
          } else {
            const storedCartItems = sessionStorage.getItem('cartItems');
            if (storedCartItems) {
              setCartItems(JSON.parse(storedCartItems));
            }
          }
        }
      } catch (error) {
        sessionStorage.clear(); // Clear potentially corrupted data
      } finally {
        // Clean URL params
        if (window.location.search) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        setIsLoading(false);
        setLoadingMessage('');
      }
    };

    initialize();
  }, []);

  const storeBasketData = (data: BasketData) => {
    sessionStorage.setItem('basketData', JSON.stringify(data));
    sessionStorage.setItem('basketIdent', data.data.ident);
    setBasketIdent(data.data.ident);
  };

  const login = async () => {
    setIsLoading(true);
    setLoadingMessage('Redirecting to FiveM for authentication...');
    try {
      // Set cancel URL to our domain so we can detect when user cancels
      const currentUrl = window.location.origin;
      const cancelUrl = `${currentUrl}/checkout-cancelled`;
      const completeUrl = `${currentUrl}?success=true`;
      
      const basketData = await tebexService.createBasket({
        cancel_url: cancelUrl,
        complete_url: completeUrl,
        complete_auto_redirect: false,
      });

      if (basketData) {
        storeBasketData(basketData);
        const authUrl = await tebexService.fetchAuthUrl(basketData.data.ident);

        if (authUrl) {
          sessionStorage.setItem('authUrl', authUrl);
          window.location.href = authUrl;
        } else {
          setIsLoading(false); // Stop loading if auth URL fails
        }
      } else {
        setIsLoading(false); // Stop loading if basket creation fails
      }
    } catch (error) {
      setIsLoading(false); // Stop loading on any other error
    }
  };

  const logout = () => {
    sessionStorage.clear();
    setIsLoggedIn(false);
    setCartItems([]);
    setBasketIdent(null);
    setCfxUserData(null);
  };

  const addToCart = async (item: CartItem): Promise<boolean> => {
    if (!basketIdent) {
      console.error('❌ Cannot add to cart: No basket identifier found');
      console.log(`📊 [STATS] Failed to add to cart - no basket: ${item.name}`);
      return false;
    }

    console.log(`🛒 [CART] Adding to cart:`, { basketIdent, itemName: item.name, price: item.price });

    try {
      const success = await tebexService.addToBasket(basketIdent, item.id);

      console.log(`📦 [CART] Add to basket result:`, success);

      if (success) {
        console.log(`✅ [CART] Successfully added to cart: ${item.name}`);
        
        // Fetch updated cart data
        const updatedItems = await tebexService.fetchCartData(basketIdent);
        console.log(`📦 [CART] Updated cart items from API:`, updatedItems.length, 'items');
        
        // Merge with local item data to preserve price and category information
        const mergedItems = updatedItems.map(apiItem => {
          // If this is the item we just added, use our local data
          if (apiItem.id === item.id) {
            return { 
              ...apiItem, 
              price: item.price, 
              currency: item.currency,
              category: item.category
            };
          }
          // For existing items, try to find in current cart
          const existingItem = cartItems.find(ci => ci.id === apiItem.id);
          if (existingItem) {
            return { 
              ...apiItem, 
              price: existingItem.price || apiItem.price, 
              currency: existingItem.currency || apiItem.currency,
              category: existingItem.category
            };
          }
          return apiItem;
        });
        
        console.log(`✅ [CART] Merged cart items:`, mergedItems.length, 'total items');
        setCartItems(mergedItems);
        sessionStorage.setItem('cartItems', JSON.stringify(mergedItems));

        window.dispatchEvent(
          new CustomEvent('cartUpdated', {
            detail: { cartItems: mergedItems },
          })
        );

        return true;
      }

      console.error(`❌ [CART] Failed to add item to basket: ${item.name}`);
      console.log(`📊 [STATS] Failed to add to cart: ${item.name}`);
      return false;
    } catch (error) {
      console.error(`❌ [CART] Error adding to cart:`, error);
      console.log(`📊 [STATS] Exception adding to cart: ${item.name}`);
      return false;
    }
  };

  const removeFromCart = async (packageId: number) => {
    if (!basketIdent) {
      return;
    }

    try {
      const success = await tebexService.removeFromBasket(basketIdent, packageId);

      if (success) {
        const updatedItems = cartItems.filter((item) => item.id !== packageId);
        setCartItems(updatedItems);
        sessionStorage.setItem('cartItems', JSON.stringify(updatedItems));

        window.dispatchEvent(
          new CustomEvent('cartUpdated', {
            detail: { cartItems: updatedItems },
          })
        );
      }
    } catch (error) {
    }
  };

  const isInCart = (packageId: number): boolean => {
    return cartItems.some((item) => item.id === packageId);
  };

  const proceedToCheckout = async () => {
    if (!basketIdent) {
      return;
    }

    try {
      // Track checkout start for each item in cart
      const analytics = getAnalytics();
      if (analytics) {
        cartItems.forEach(item => {
          analytics.trackEvent('checkout_start', {
            packageName: item.name,
            eventData: {
              price: item.price,
              quantity: item.qty,
              total: item.price * item.qty,
            },
          });
        });
      }

      const checkoutUrl = await tebexService.getCheckoutUrl(basketIdent);
      if (checkoutUrl) {
        setCheckoutUrl(checkoutUrl);
        setIsCheckoutOpen(true);
      }
    } catch (error) {
      console.error('❌ Error getting checkout URL:', error);
    }
  };

  const closeCheckout = () => {
    setIsCheckoutOpen(false);
    setCheckoutUrl(null);
  };

  const enrichCartWithPackageData = (packages: any[]) => {
    if (cartItems.length === 0 || packages.length === 0) return;

    const enrichedItems = cartItems.map(item => {
      if (item.category) return item; // Already has category
      
      const pkg = packages.find(p => p.tebexPackageId === item.id);
      if (pkg?.category) {
        return { ...item, category: pkg.category };
      }
      return item;
    });

    const hasChanges = enrichedItems.some((item, idx) => item.category !== cartItems[idx].category);
    if (hasChanges) {
      setCartItems(enrichedItems);
      sessionStorage.setItem('cartItems', JSON.stringify(enrichedItems));
    }
  };

  const applyCoupon = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!basketIdent) {
      return { success: false, error: 'No active basket found' };
    }

    if (!code || code.trim() === '') {
      return { success: false, error: 'Please enter a code' };
    }

    try {
      // Store current cart prices BEFORE applying coupon
      const priceBeforeCoupon = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

      const result = await tebexService.applyCoupon(basketIdent, code.trim());

      if (result.success) {
        // Update cart items from the response to get new prices
        const updatedItems = await tebexService.fetchCartData(basketIdent);

        // Calculate actual price after coupon
        const priceAfterCoupon = updatedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

        // Calculate the REAL discount amount based on price difference
        const realDiscountAmount = priceBeforeCoupon - priceAfterCoupon;

        // Store applied coupon info with REAL discount
        setAppliedCoupon({
          code: code.trim().toUpperCase(),
          discountAmount: -realDiscountAmount // Negative to match existing convention
        });
        sessionStorage.setItem('appliedCoupon', JSON.stringify({
          code: code.trim().toUpperCase(),
          discountAmount: -realDiscountAmount
        }));

        setCartItems(updatedItems);
        sessionStorage.setItem('cartItems', JSON.stringify(updatedItems));

        window.dispatchEvent(
          new CustomEvent('cartUpdated', {
            detail: { cartItems: updatedItems },
          })
        );

        return { success: true };
      }

      return { success: false, error: result.error || 'Invalid coupon code' };
    } catch (error) {
      console.error('❌ Error applying coupon:', error);
      return { success: false, error: 'An error occurred while applying the coupon' };
    }
  };

  const value: TebexContextType = {
    isLoggedIn,
    cartItems,
    basketIdent,
    isLoading,
    loadingMessage,
    cfxUserData,
    checkoutUrl,
    isCheckoutOpen,
    appliedCoupon,
    login,
    logout,
    addToCart,
    removeFromCart,
    isInCart,
    proceedToCheckout,
    closeCheckout,
    enrichCartWithPackageData,
    applyCoupon,
    removeCoupon: async () => {
      if (!basketIdent) {
        return { success: false, error: 'No active basket found' };
      }

      if (!appliedCoupon?.code) {
        return { success: false, error: 'No coupon to remove' };
      }

      try {
        const result = await tebexService.removeCoupon(basketIdent, appliedCoupon.code);

        if (result.success) {
          // Clear applied coupon
          setAppliedCoupon(null);
          sessionStorage.removeItem('appliedCoupon');

          // Update cart items from the response
          const updatedItems = await tebexService.fetchCartData(basketIdent);
          setCartItems(updatedItems);
          sessionStorage.setItem('cartItems', JSON.stringify(updatedItems));

          window.dispatchEvent(
            new CustomEvent('cartUpdated', {
              detail: { cartItems: updatedItems },
            })
          );

          return { success: true };
        }

        return { success: false, error: result.error || 'Failed to remove coupon' };
      } catch (error) {
        console.error('❌ Error removing coupon:', error);
        return { success: false, error: 'An error occurred while removing the coupon' };
      }
    },
  };

  return <TebexContext.Provider value={value}>{children}</TebexContext.Provider>;
};

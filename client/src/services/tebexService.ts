const TEBEX_API_BASE = 'https://headless.tebex.io/api';
const TEBEX_TOKEN = import.meta.env.VITE_TEBEX_TOKEN;

export interface CreateBasketParams {
  complete_url?: string;
  cancel_url?: string;
  custom?: Record<string, any>;
  complete_auto_redirect?: boolean;
}

export interface BasketData {
  data: {
    ident: string;
    complete: boolean;
    id: number;
    packages?: TebexPackage[];
    username?: string;
    username_id?: string;
    avatar_template?: string;
    email?: string;
    country?: string;
    ip?: string;
    base_price?: number;
    sales_tax?: number;
    total_price?: number;
    currency?: string;
    custom?: Record<string, any>;
    links?: {
      payment?: string;
      checkout?: string;
    };
  };
}

export interface TebexPackage {
  id: number;
  name: string;
  price?: {
    value: number;
    currency: string;
  };
  base_price?: number;
  in_basket?: {
    quantity: number;
  };
  image?: string;
  quantity?: number;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  currency: string;
  image: string;
  qty: number;
  category?: {
    id: number;
    name: string;
  };
}

export interface TebexPackageDetails {
  id: number;
  name: string;
  description: string;
  image?: string;
  price?: {
    value: number;
    currency: string;
  };
  base_price?: number;
  total_price?: number;
  currency: string;
  category?: {
    id: number;
    name: string;
  };
}

export interface TebexCategory {
  id: number;
  name: string;
  slug: string;
  parent?: any;
  description?: string;
  order: number;
  display_type: string;
  packages?: TebexPackageDetails[];
}

export interface CategoriesResponse {
  data: TebexCategory[];
}

export interface PackageListResponse {
  data: TebexPackageDetails[];
}

class TebexService {
  /**
   * Creates a new basket for the user
   */
  async createBasket(params?: CreateBasketParams): Promise<BasketData | null> {
    try {
      const body: CreateBasketParams = {
        complete_auto_redirect: params?.complete_auto_redirect ?? true,
        ...(params?.complete_url && { complete_url: params.complete_url }),
        ...(params?.cancel_url && { cancel_url: params.cancel_url }),
        ...(params?.custom && { custom: params.custom }),
      };
      
      const response = await fetch(`${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/baskets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create basket: ${response.status}`);
      }
      const data = await response.json();

      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetches the FiveM authentication URL and redirects the user
   */
  async fetchAuthUrl(basketIdent: string): Promise<string | null> {
    try {
      const returnUrl = encodeURIComponent(window.location.href);
      const response = await fetch(
        `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/baskets/${basketIdent}/auth?returnUrl=${returnUrl}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch auth URL: ${response.status}`);
      }

      const data = await response.json();
      const fiveMAuthUrl = data[0]?.url;

      if (fiveMAuthUrl) {
        return fiveMAuthUrl;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetches full basket data including user information
   */
  async fetchBasketData(basketIdent: string): Promise<BasketData | null> {
    try {
      const response = await fetch(
        `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/baskets/${basketIdent}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch basket data: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetches full basket data including coupons
   */
  async fetchFullBasketData(basketIdent: string): Promise<any> {
    try {
      const response = await fetch(
        `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/baskets/${basketIdent}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch basket data: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('❌ Error fetching basket data:', error);
      return null;
    }
  }

  /**
   * Fetches cart data for a specific basket
   */
  async fetchCartData(basketIdent: string): Promise<CartItem[]> {
    try {
      //console.log('🔍 Fetching cart data for basket:', basketIdent);
      
      const response = await fetch(
        `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/baskets/${basketIdent}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch cart data: ${response.status}`);
      }

      const data = await response.json();
      //console.log('📦 Raw basket data:', data);
      //console.log('📦 Packages in basket:', data.data?.packages);

      if (data.data?.packages) {
        const cartItems = data.data.packages.map((pkg: any) => {
          //console.log('🔍 Processing package:', pkg);
          //console.log('🔍 in_basket data:', pkg.in_basket);
          
          // Handle different price structures
          // Check in_basket first, then fallback to other fields
          const price = pkg.in_basket?.price 
            ? pkg.in_basket.price 
            : (pkg.price?.value 
              ? pkg.price.value / 100 
              : (pkg.base_price || 0));
          
          // Handle different quantity structures
          const quantity = pkg.in_basket?.quantity || pkg.quantity || 1;
          
          return {
            id: pkg.id,
            name: pkg.name,
            price: price,
            currency: pkg.in_basket?.currency || pkg.price?.currency || 'EUR',
            image: pkg.image || 'https://i.imgur.com/LVePQtC.jpeg',
            qty: quantity,
          };
        });
        //console.log('✅ Mapped cart items:', cartItems);
        return cartItems;
      }

      //console.log('⚠️ No packages found in basket data');
      return [];
    } catch (error) {
      console.error('❌ Error fetching cart data:', error);
      return [];
    }
  }

  /**
   * Adds a package to the basket
   */
  async addToBasket(basketIdent: string, packageId: number, quantity: number = 1): Promise<boolean> {
    try {
      //console.log('🔵 Tebex API: Adding to basket', { basketIdent, packageId, quantity });
      
      const response = await fetch(
        `${TEBEX_API_BASE}/baskets/${basketIdent}/packages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            package_id: packageId,
            quantity: quantity,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Tebex API Error:', response.status, errorText);
      } else {
        //console.log('✅ Tebex API: Successfully added to basket');
      }

      return response.ok;
    } catch (error) {
      console.error('❌ Network error adding to basket:', error);
      return false;
    }
  }

  /**
   * Removes a package from the basket
   */
  async removeFromBasket(basketIdent: string, packageId: number): Promise<boolean> {
    try {
      const response = await fetch(
        `${TEBEX_API_BASE}/baskets/${basketIdent}/packages/remove`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            package_id: packageId,
          }),
        }
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the checkout URL for the basket
   */
  async getCheckoutUrl(basketIdent: string): Promise<string | null> {
    try {
      //console.log('🔗 Fetching checkout URL for basket:', basketIdent);
      
      const response = await fetch(
        `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/baskets/${basketIdent}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch checkout URL: ${response.status}`);
      }

      const data = await response.json();
      //console.log('✅ Basket data for checkout:', data);
      
      const checkoutUrl = data.data?.links?.checkout || null;
      //console.log('🔗 Checkout URL:', checkoutUrl);
      
      return checkoutUrl;
    } catch (error) {
      console.error('❌ Error fetching checkout URL:', error);
      return null;
    }
  }

  /**
   * Fetches CFX user info from the policy API
   */
  async fetchCFXUserInfo(usernameId: string): Promise<{ name: string; username: string; avatar_template: string } | null> {
    try {
      const response = await fetch(
        `/api/cfx-user/${usernameId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch CFX user info: ${response.status}`);
      }

      const data = await response.json();
      return {
        name: data.name,
        username: data.username,
        avatar_template: data.avatar_template,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetches all packages from Tebex store
   */
  async fetchPackages(): Promise<TebexPackageDetails[]> {
    try {
      //console.log('🔵 Fetching packages from Tebex API...');
      
      const response = await fetch(
        `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/packages`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error('❌ Failed to fetch packages:', response.status);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        return [];
      }

      const data: PackageListResponse = await response.json();
      //console.log('✅ Raw Tebex packages response:', data);
      //console.log('📦 Number of packages:', data.data?.length || 0);
      
      if (data.data && data.data.length > 0) {
        //console.log('📋 First package sample:', data.data[0]);
      }
      
      return data.data || [];
    } catch (error) {
      console.error('❌ Error fetching packages:', error);
      return [];
    }
  }

  /**
   * Fetches all categories from Tebex store
   */
  async fetchCategories(): Promise<TebexCategory[]> {
    try {
      const response = await fetch(
        `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/categories`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error('❌ Failed to fetch categories:', response.status);
        return [];
      }

      const data: CategoriesResponse = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Applies a coupon to a basket
   */
  async applyCoupon(basketIdent: string, couponCode: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🔵 Applying coupon:', { basketIdent, couponCode });

      const response = await fetch(
        `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/baskets/${basketIdent}/coupons`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': '*/*',
          },
          body: JSON.stringify({
            coupon_code: couponCode,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error Response:', errorData);
        return {
          success: false,
          error: errorData.detail || errorData.title || 'Failed to apply coupon'
        };
      }

      const data = await response.json();
      console.log('✅ Coupon applied successfully:', data);
      return { success: true, data: data.data };
    } catch (error) {
      console.error('❌ Error applying coupon:', error);
      return {
        success: false,
        error: 'An error occurred while applying the coupon'
      };
    }
  }

  /**
   * Removes a coupon from a basket
   */
  async removeCoupon(basketIdent: string, couponCode: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔵 Removing coupon from basket:', basketIdent, 'Coupon:', couponCode);

      const response = await fetch(
        `${TEBEX_API_BASE}/accounts/${TEBEX_TOKEN}/baskets/${basketIdent}/coupons/remove`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': '*/*',
          },
          body: JSON.stringify({
            coupon_code: couponCode,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error Response:', errorData);
        return {
          success: false,
          error: errorData.detail || errorData.title || 'Failed to remove coupon'
        };
      }

      console.log('✅ Coupon removed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error removing coupon:', error);
      return {
        success: false,
        error: 'An error occurred while removing the coupon'
      };
    }
  }
}

export const tebexService = new TebexService();

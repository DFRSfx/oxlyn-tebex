import { API_URL } from '../config/api';

// All Tebex traffic now goes through our backend proxy at /api/tebex/*.
// The Tebex token never leaves the server.
const TEBEX_PROXY = `${API_URL}/tebex`;

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

export interface TebexPackageMedia {
  type: string;
  name: string;
  url: string;
}

export interface TebexPackageDetails {
  id: number;
  name: string;
  description: string;
  image?: string;
  images?: string[];
  media?: TebexPackageMedia[];
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

      const response = await fetch(`${TEBEX_PROXY}/baskets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        await response.text();
        throw new Error(`Failed to create basket: ${response.status}`);
      }

      return await response.json();
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
        `${TEBEX_PROXY}/baskets/${basketIdent}/auth?returnUrl=${returnUrl}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch auth URL: ${response.status}`);
      }

      const data = await response.json();
      const fiveMAuthUrl = Array.isArray(data) ? data[0]?.url : data?.url;
      return fiveMAuthUrl ?? null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetches full basket data including user information
   */
  async fetchBasketData(basketIdent: string): Promise<BasketData | null> {
    try {
      const response = await fetch(`${TEBEX_PROXY}/baskets/${basketIdent}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch basket data: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetches full basket data including coupons
   */
  async fetchFullBasketData(basketIdent: string): Promise<any> {
    try {
      const response = await fetch(`${TEBEX_PROXY}/baskets/${basketIdent}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

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
      const response = await fetch(`${TEBEX_PROXY}/baskets/${basketIdent}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cart data: ${response.status}`);
      }

      const data = await response.json();

      if (data.data?.packages) {
        return data.data.packages.map((pkg: any) => {
          const price = pkg.in_basket?.price
            ? pkg.in_basket.price
            : (pkg.price?.value
              ? pkg.price.value / 100
              : (pkg.base_price || 0));
          const quantity = pkg.in_basket?.quantity || pkg.quantity || 1;
          return {
            id: pkg.id,
            name: pkg.name,
            price,
            currency: pkg.in_basket?.currency || pkg.price?.currency || 'EUR',
            image: pkg.image || 'https://i.imgur.com/LVePQtC.jpeg',
            qty: quantity,
          };
        });
      }
      return [];
    } catch (error) {
      console.error('❌ Error fetching cart data:', error);
      return [];
    }
  }

  /**
   * Adds a package to the basket
   */
  async addToBasket(
    basketIdent: string,
    packageId: number,
    quantity: number = 1,
    discordId?: string
  ): Promise<boolean> {
    try {
      // `discord_id` is only sent for packages that declare a required
      // discord_id option (the install add-on). The proxy forwards it to Tebex
      // as variable_data; packages without the option never receive it.
      const payload: Record<string, unknown> = { package_id: packageId, quantity };
      if (discordId) payload.discord_id = discordId;
      const response = await fetch(`${TEBEX_PROXY}/baskets/${basketIdent}/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Tebex API Error:', response.status, errorText);
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
      const response = await fetch(`${TEBEX_PROXY}/baskets/${basketIdent}/packages/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: packageId }),
      });
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
      const response = await fetch(`${TEBEX_PROXY}/baskets/${basketIdent}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch checkout URL: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.links?.checkout || null;
    } catch (error) {
      console.error('❌ Error fetching checkout URL:', error);
      return null;
    }
  }

  /**
   * Fetches CFX user info from the policy API (proxied through our backend)
   */
  async fetchCFXUserInfo(usernameId: string): Promise<{ name: string; username: string; avatar_template: string } | null> {
    try {
      const response = await fetch(`${API_URL}/cfx-user/${usernameId}`);
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
      const response = await fetch(`${TEBEX_PROXY}/packages`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.error('❌ Failed to fetch packages:', response.status);
        return [];
      }

      const data: PackageListResponse = await response.json();
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
      const response = await fetch(`${TEBEX_PROXY}/categories`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

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
      const response = await fetch(`${TEBEX_PROXY}/baskets/${basketIdent}/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: '*/*' },
        body: JSON.stringify({ coupon_code: couponCode }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || errorData.title || errorData.error || 'Failed to apply coupon',
        };
      }

      const data = await response.json();
      return { success: true, data: data.data };
    } catch (error) {
      console.error('❌ Error applying coupon:', error);
      return { success: false, error: 'An error occurred while applying the coupon' };
    }
  }

  /**
   * Removes a coupon from a basket
   */
  async removeCoupon(basketIdent: string, couponCode: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${TEBEX_PROXY}/baskets/${basketIdent}/coupons/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: '*/*' },
        body: JSON.stringify({ coupon_code: couponCode }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || errorData.title || errorData.error || 'Failed to remove coupon',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error removing coupon:', error);
      return { success: false, error: 'An error occurred while removing the coupon' };
    }
  }
}

export const tebexService = new TebexService();

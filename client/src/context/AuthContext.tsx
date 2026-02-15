import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '../config/api';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  discordId?: string;
  discordUsername?: string;
  discordAvatar?: string;
  discordRoles?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isDiscordLinked: boolean;
  login: (email: string, password: string) => Promise<void>;
  getDiscordAuthUrl: () => Promise<string>;
  handleDiscordSuccess: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Step 1: Decode the JWT client-side immediately — no server round-trip.
      // This restores the session instantly on every tab/reload.
      let payload: any = null;
      try {
        payload = JSON.parse(atob(token.split('.')[1]));
      } catch {
        // Malformed token — discard it
        localStorage.removeItem('auth_token');
        setLoading(false);
        return;
      }

      // If the token is expired, discard it
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('auth_token');
        setLoading(false);
        return;
      }

      // Set the user immediately from the JWT payload so the UI is
      // responsive on every tab — the server call below is just a refresh.
      setUser({
        id: payload.id || payload.discordId,
        email: payload.email || `${payload.discordId}@discord.user`,
        role: payload.role,
        discordId: payload.discordId,
        discordUsername: payload.discordUsername,
        discordAvatar: payload.discordAvatar,
      });
      setLoading(false);

      // Step 2: Verify with the server in the background to refresh any
      // data that may have changed (role, avatar, etc.).
      fetch(`${API_URL}/auth/me`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
        .then((response) => {
          if (response.ok) {
            return response.json().then((data) => setUser(data.user));
          } else if (response.status === 401 || response.status === 403) {
            // Server explicitly rejected the token — log the user out
            localStorage.removeItem('auth_token');
            setUser(null);
          }
          // 404, 500, etc.: keep the JWT-decoded user, don't touch the token
        })
        .catch(() => {
          // Network error — keep the JWT-decoded user alive, don't log out
        });
    } catch (error) {
      console.error('Auth check failed:', error);
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      setUser(data.user);
      localStorage.setItem('auth_token', data.token);
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const getDiscordAuthUrl = async (): Promise<string> => {
    try {
      const response = await fetch(`${API_URL}/auth/discord`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get Discord auth URL');
      }

      const data = await response.json();
      return data.authUrl;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get Discord auth URL');
    }
  };

  const handleDiscordSuccess = async (token: string) => {
    try {
      localStorage.setItem('auth_token', token);

      // Decode JWT immediately so the user is set even if the server call fails
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.id || payload.discordId,
          email: payload.email || `${payload.discordId}@discord.user`,
          role: payload.role,
          discordId: payload.discordId,
          discordUsername: payload.discordUsername,
          discordAvatar: payload.discordAvatar,
        });
      } catch {
        // If decode fails, fall through to server call below
      }

      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ /auth/me error:', errorData);
        // Don't throw — the user is already set from the JWT above.
        // The session is valid even if the server-side refresh fails.
      } else {
        const data = await response.json();
        setUser(data.user);
      }

      // 🔗 Link CFX login to Discord if available, or just record Discord login
      const cfxIdentifier = localStorage.getItem('cfxIdentifier');
      const discordIdForLink = (JSON.parse(atob(token.split('.')[1]))).discordId;
      try {
        if (cfxIdentifier) {
          console.log(`🔗 [LINK] Attempting to link CFX ${cfxIdentifier} to Discord ${discordIdForLink}`);
        } else {
          console.log(`📊 [LOGIN] Recording Discord login for ${discordIdForLink}`);
        }

        const linkResponse = await fetch(`${API_URL}/auth/link-cfx`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cfxIdentifier: cfxIdentifier || null }),
        });

        if (linkResponse.ok) {
          console.log(`✅ [LINK] Successfully processed Discord login`);
          if (cfxIdentifier) {
            localStorage.removeItem('cfxIdentifier'); // Clean up after successful link
          }
        } else {
          console.warn(`⚠️ [LINK] Failed to process Discord login:`, linkResponse.status);
        }
      } catch (linkError) {
        console.error(`❌ [LINK] Error processing Discord login:`, linkError);
        // Don't fail the Discord login if stats recording fails
      }
    } catch (error: any) {
      console.error('❌ handleDiscordSuccess error:', error);
      throw new Error(error.message || 'Failed to authenticate');
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('auth_token');
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isDiscordLinked: !!(user?.discordId),
    login,
    getDiscordAuthUrl,
    handleDiscordSuccess,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

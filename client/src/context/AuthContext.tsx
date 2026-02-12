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
      if (token) {
        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          localStorage.removeItem('auth_token');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
    } finally {
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
        throw new Error(errorData.error || 'Failed to get user info');
      }

      const data = await response.json();
      setUser(data.user);

      // 🔗 Link CFX login to Discord if available, or just record Discord login
      const cfxIdentifier = localStorage.getItem('cfxIdentifier');
      try {
        if (cfxIdentifier) {
          console.log(`🔗 [LINK] Attempting to link CFX ${cfxIdentifier} to Discord ${data.user.discordId}`);
        } else {
          console.log(`📊 [LOGIN] Recording Discord login for ${data.user.discordId}`);
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

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { User } from '../types/index.js';
import { UserModel } from '../models/user.js';
import { LoginStatsModel } from '../models/statistics.js';
import { StatsUtil } from '../utils/statsUtil.js';

// In-memory user storage (replace with database in production)
// Users are stored by Discord ID, not email
const users: Map<string, User> = new Map();

const generateToken = (user: Omit<User, 'password'>): string => {
  return jwt.sign(
    { 
      id: user.id,
      discordId: user.discordId,
      discordUsername: user.discordUsername,
      role: user.role
    },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// No traditional login - users login via Discord only
export const getCurrentUser = (req: Request, res: Response) => {
  const tokenUser = (req as any).user;
  
  // Find full user data from in-memory store
  const fullUser = users.get(tokenUser.discordId);
  
  if (!fullUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Return user without password
  const { password: _, ...userWithoutPassword } = fullUser;
  res.json({ user: userWithoutPassword });
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Logged out successfully' });
};

// Admin: Get all download users
export const getAllDownloadUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await UserModel.getAllDownloadUsers();
    res.json({
      users,
      total: users.length
    });
  } catch (error) {
    console.error('Error fetching download users:', error);
    res.status(500).json({ error: 'Failed to fetch download users' });
  }
};

// Admin: Get login statistics
export const getLoginStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await LoginStatsModel.getAllLoginStats();
    res.json({
      stats,
      total: stats.length
    });
  } catch (error) {
    console.error('Error fetching login statistics:', error);
    res.status(500).json({ error: 'Failed to fetch login statistics' });
  }
};

// Link CFX login to Discord login (or just record Discord login if no CFX)
export const linkCfxLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cfxIdentifier } = req.body;
    const discordId = (req as any).user?.discordId;

    if (!discordId) {
      return res.status(400).json({ error: 'Missing Discord ID' });
    }

    // If CFX identifier is provided, link them together
    if (cfxIdentifier) {
      console.log(`🔗 [LINK] Linking CFX ${cfxIdentifier} to Discord ${discordId}`);
      await StatsUtil.linkCfxToDiscordLogin(cfxIdentifier, discordId);
    } else {
      // No CFX identifier - just record Discord login
      console.log(`📊 [DISCORD_LOGIN] Recording Discord login for ${discordId}`);
    }

    // Record Discord login in statistics (only now, after linking or no CFX)
    await StatsUtil.recordDiscordLogin(discordId);
    console.log(`✅ [STATS] Recorded Discord login for user: ${discordId}`);

    console.log(`✅ [LINK] Successfully processed login for Discord ${discordId}`);
    res.json({ success: true, message: 'Login processed' });
  } catch (error) {
    console.error('Error processing login:', error);
    next(error);
  }
};

// Initiate Discord OAuth flow (no authentication required)
export const discordAuth = (req: Request, res: Response) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI || '');
  // Scopes: identify (user info), email (email), guilds (servers user is in)
  const scope = encodeURIComponent('identify email guilds');
  
  // Generate random state for CSRF protection (no user ID needed yet)
  const state = jwt.sign(
    { timestamp: Date.now() },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '10m' }
  );

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;

  res.json({ authUrl: discordAuthUrl });
};

// Handle Discord OAuth callback
export const discordCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect(`${process.env.CLIENT_URL}/?error=invalid_request`);
    }

    // Verify state (CSRF protection)
    try {
      jwt.verify(state as string, process.env.JWT_SECRET || 'your_jwt_secret');
    } catch (error) {
      return res.redirect(`${process.env.CLIENT_URL}/?error=invalid_state`);
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID || '',
        client_secret: process.env.DISCORD_CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: process.env.DISCORD_REDIRECT_URI || '',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token } = tokenResponse.data;

    // Get Discord user info
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const discordUser = userResponse.data;

    // Get Discord user's guilds (servers)
    let isInGuild = false;
    const guildId = process.env.DISCORD_GUILD_ID;
    
    if (guildId) {
      try {
        const guildsResponse = await axios.get(
          'https://discord.com/api/users/@me/guilds',
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        );
        
        const userGuilds = guildsResponse.data;
        isInGuild = userGuilds.some((guild: any) => guild.id === guildId);
        
        if (isInGuild) {
          console.log(`✅ User ${discordUser.username} is in the guild`);
        } else {
          console.log(`ℹ️ User ${discordUser.username} is NOT in the guild`);
          // Optionally redirect with error if guild membership is required
          // return res.redirect(`${process.env.CLIENT_URL}/?error=not_in_guild`);
        }
      } catch (error: any) {
        console.error('Failed to fetch user guilds:', error.response?.data || error.message);
      }
    }

    // Check if user should be admin (manually configured or based on Discord ID)
    const adminDiscordIds = (process.env.DISCORD_ADMIN_IDS || '').split(',').filter(Boolean);
    const userRole = adminDiscordIds.includes(discordUser.id) ? 'admin' : 'user';
    
    if (userRole === 'admin') {
      console.log(`✅ User ${discordUser.username} is configured as admin`);
    } else {
      console.log(`ℹ️ User ${discordUser.username} is regular user`);
    }

    // Find or create user by Discord ID
    let userEntry = users.get(discordUser.id);
    
    if (!userEntry) {
      // Create new user
      userEntry = {
        id: discordUser.id,
        email: discordUser.email || `${discordUser.id}@discord.user`,
        password: '', // No password - Discord only
        role: userRole,
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordAvatar: discordUser.avatar,
        discordRoles: [], // Can't get roles without bot
        createdAt: new Date(),
      };
      console.log(`✅ Created new user: ${discordUser.username}`);
    } else {
      // Update existing user
      userEntry.discordUsername = discordUser.username;
      userEntry.discordAvatar = discordUser.avatar;
      userEntry.role = userRole;
      console.log(`✅ Updated existing user: ${discordUser.username}`);
    }
    
    // Save user to in-memory
    users.set(discordUser.id, userEntry);

    // Save user to database
    await UserModel.upsertFromDiscord(
      discordUser.id,
      discordUser.username,
      discordUser.avatar,
      discordUser.email,
      userRole
    );
    console.log(`💾 Saved user to database: ${discordUser.username}`);

    // Note: Discord login will be recorded when linkCfxLogin() is called
    // or when client calls it explicitly if there's no CFX login to link

    // Generate JWT token
    const { password: _, ...userWithoutPassword } = userEntry;
    const token = generateToken(userWithoutPassword);

    console.log('🔍 Generated token (first 30 chars):', token.substring(0, 30) + '...');

    // Set cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const redirectUrl = `${process.env.CLIENT_URL}/admin/discord-success?token=${token}`;
    console.log('🔍 Redirecting to:', redirectUrl.substring(0, 80) + '...');

    // Redirect to homepage with success (frontend will handle token)
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Discord callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/?error=discord_auth_failed`);
  }
};

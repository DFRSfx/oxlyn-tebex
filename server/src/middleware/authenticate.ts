import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT_SECRET is validated at boot in src/index.ts. Read it lazily so a
// missing env var fails the verify call (which is caught) rather than
// silently falling back to an attacker-known constant.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'user';
    discordId?: string;
    discordUsername?: string;
    discordAvatar?: string;
  };
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header or cookies
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.cookies?.auth_token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, getJwtSecret()) as any;

    // Attach user to request
    (req as AuthRequest).user = {
      id: decoded.id || decoded.discordId,
      email: decoded.email || `${decoded.discordId}@discord.user`,
      role: decoded.role || 'user',
      discordId: decoded.discordId,
      discordUsername: decoded.discordUsername,
      discordAvatar: decoded.discordAvatar,
    };

    next();
  } catch (error) {
    // Don't leak which error path triggered (expired vs malformed vs missing secret).
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

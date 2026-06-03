import { Request, Response } from 'express';
import { DownloadTokenModel } from '../models/downloadToken.js';
import { UserModel } from '../models/user.js';
import fs from 'fs';
import path from 'path';

// Resolve once at boot; downloads must live somewhere under this directory.
// Throwing here is intentional — if DOWNLOADS_PATH is not set, the download
// system cannot operate safely.
function getDownloadsRoot(): string {
  const root = process.env.DOWNLOADS_PATH;
  if (!root) {
    throw new Error('DOWNLOADS_PATH is not configured');
  }
  return path.resolve(root);
}

// Returns the canonical absolute path if `filePath` resolves *inside* the
// downloads root, otherwise null. Defends against `..`, absolute paths, and
// symlink-style escapes by comparing canonical paths with a separator-aware
// prefix check (prevents `/var/downloads2` matching `/var/downloads`).
function resolveSafeDownloadPath(filePath: string): string | null {
  const root = getDownloadsRoot();
  const candidate = path.resolve(root, filePath);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (candidate !== root && !candidate.startsWith(rootWithSep)) {
    return null;
  }
  return candidate;
}

// Reject filenames that could break Content-Disposition or contain path
// separators (the filename is what users see, never used for filesystem access).
const SAFE_FILENAME_RE = /^[A-Za-z0-9._\- ()\[\]]{1,200}$/;

export class DownloadController {
  // Admin: Criar novo token de download
  static async createToken(req: Request, res: Response) {
    try {
      const { discordUserId, filePath, fileName, maxDownloads } = req.body;

      if (!discordUserId || !filePath || !fileName || !maxDownloads) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (maxDownloads < 1) {
        return res.status(400).json({ error: 'Max downloads must be at least 1' });
      }

      if (typeof filePath !== 'string' || typeof fileName !== 'string') {
        return res.status(400).json({ error: 'filePath and fileName must be strings' });
      }

      if (!SAFE_FILENAME_RE.test(fileName)) {
        return res.status(400).json({ error: 'fileName contains invalid characters' });
      }

      // Constrain the file to the configured downloads directory. Without this
      // check, an admin (or a compromised admin account) could create a token
      // pointing at any file the Node process can read — including .env, SSH
      // keys, or system files.
      const fullPath = resolveSafeDownloadPath(filePath);
      if (!fullPath) {
        return res.status(400).json({ error: 'filePath must be inside the downloads directory' });
      }
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: 'File not found on server' });
      }

      const token = await DownloadTokenModel.create(
        discordUserId,
        fullPath,
        fileName,
        maxDownloads
      );

      res.status(201).json({
        message: 'Download token created successfully',
        token: token.token,
        data: token
      });
    } catch (error) {
      console.error('Error creating download token:', error);
      res.status(500).json({ error: 'Failed to create download token' });
    }
  }

  // Admin: Listar todos os tokens
  static async listAllTokens(req: Request, res: Response) {
    try {
      const tokens = await DownloadTokenModel.findAll();
      res.json({ tokens });
    } catch (error) {
      console.error('Error listing tokens:', error);
      res.status(500).json({ error: 'Failed to list tokens' });
    }
  }

  // Admin: Deletar token
  static async deleteToken(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await DownloadTokenModel.delete(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: 'Token not found' });
      }

      res.json({ message: 'Token deleted successfully' });
    } catch (error) {
      console.error('Error deleting token:', error);
      res.status(500).json({ error: 'Failed to delete token' });
    }
  }

  // User: Verificar se tem tokens disponíveis para claim
  static async checkAvailableTokens(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user?.discordId) {
        return res.status(401).json({ error: 'Discord authentication required' });
      }

      const [tokens, hasActive, hasClaimed] = await Promise.all([
        DownloadTokenModel.findAvailableForUser(user.discordId),
        DownloadTokenModel.hasActiveDownloadsForUser(user.discordId),
        DownloadTokenModel.hasAnyClaimedTokenForUser(user.discordId),
      ]);
      res.json({
        hasAvailableTokens: tokens.length > 0,
        hasActiveDownloads: hasActive,
        hasClaimedTokens: hasClaimed,
        count: tokens.length,
      });
    } catch (error) {
      console.error('Error checking available tokens:', error);
      res.status(500).json({ error: 'Failed to check available tokens' });
    }
  }

  // User: Claim token
  static async claimToken(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { token } = req.body;

      if (!user?.discordId) {
        return res.status(401).json({ error: 'Discord authentication required' });
      }

      if (!token || !token.startsWith('oxlyn-')) {
        return res.status(400).json({ error: 'Invalid token format' });
      }

      const success = await DownloadTokenModel.claimToken(token, user.discordId);

      if (!success) {
        return res.status(400).json({ 
          error: 'Invalid token, already claimed, or not authorized' 
        });
      }

      // Save user session to database for Discord bot tagging
      await UserModel.upsertFromDiscord(
        user.discordId,
        user.discordUsername || 'Unknown',
        undefined,
        undefined,
        user.role || 'user'
      );

      res.json({ message: 'Token claimed successfully' });
    } catch (error) {
      console.error('Error claiming token:', error);
      res.status(500).json({ error: 'Failed to claim token' });
    }
  }

  // User: Listar meus downloads (My Orders)
  static async myDownloads(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user?.discordId) {
        return res.status(401).json({ error: 'Discord authentication required' });
      }

      const downloads = await DownloadTokenModel.findClaimedByUser(user.discordId);
      res.json({ downloads });
    } catch (error) {
      console.error('Error fetching downloads:', error);
      res.status(500).json({ error: 'Failed to fetch downloads' });
    }
  }

  // User: Cancelar download e restaurar contador
  static async cancelDownload(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { token } = req.params;

      if (!user?.discordId) {
        return res.status(401).json({ error: 'Discord authentication required' });
      }

      const restored = await DownloadTokenModel.restoreDownload(token, user.discordId);
      
      if (restored) {
        res.json({ message: 'Download cancelled and credit restored', restored: true });
      } else {
        // Even if not restored (e.g., too much time passed), still return success
        res.json({ message: 'Download cancelled', restored: false });
      }
    } catch (error) {
      console.error('Error cancelling download:', error);
      res.status(500).json({ error: 'Failed to cancel download' });
    }
  }

  // User: Marcar scripts como claimed (após Tebex checkout)
  static async markScriptsClaimed(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { token } = req.params;

      if (!user?.discordId) {
        return res.status(401).json({ error: 'Discord authentication required' });
      }

      const success = await DownloadTokenModel.markScriptsClaimed(token, user.discordId);

      if (!success) {
        return res.status(400).json({ error: 'Token not found, not authorized, or not yet claimed' });
      }

      res.json({ message: 'Scripts marked as claimed successfully' });
    } catch (error) {
      console.error('Error marking scripts as claimed:', error);
      res.status(500).json({ error: 'Failed to mark scripts as claimed' });
    }
  }

  // User: Download do ficheiro
  static async downloadFile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { token } = req.params;
      const isResume = req.query.resume === 'true';

      if (!user?.discordId) {
        return res.status(403).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Authentication Required</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .container { text-align: center; max-width: 500px; padding: 40px; }
              .icon { font-size: 64px; margin-bottom: 20px; }
              h1 { font-size: 24px; margin-bottom: 10px; }
              p { color: #888; line-height: 1.6; }
              a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #f59e0b; color: #000; text-decoration: none; border-radius: 8px; font-weight: 600; }
              a:hover { background: #d97706; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">🔒</div>
              <h1>Authentication Required</h1>
              <p>You need to be logged in with Discord to download this file.</p>
              <a href="${process.env.CLIENT_URL || 'https://oxlynsoftware.com'}">Go to Homepage</a>
            </div>
          </body>
          </html>
        `);
      }

      if (!token || !token.startsWith('oxlyn-')) {
        return res.status(403).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Invalid Token</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .container { text-align: center; max-width: 500px; padding: 40px; }
              .icon { font-size: 64px; margin-bottom: 20px; }
              h1 { font-size: 24px; margin-bottom: 10px; }
              p { color: #888; line-height: 1.6; }
              a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #f59e0b; color: #000; text-decoration: none; border-radius: 8px; font-weight: 600; }
              a:hover { background: #d97706; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">⚠️</div>
              <h1>Invalid Token</h1>
              <p>The download token provided is not valid.</p>
              <a href="${process.env.CLIENT_URL || 'https://oxlynsoftware.com'}">Go to Homepage</a>
            </div>
          </body>
          </html>
        `);
      }

      // Check token validity first
      let downloadToken = await DownloadTokenModel.findByToken(token);
      
      if (!downloadToken) {
        return res.status(403).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Access Denied</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .container { text-align: center; max-width: 500px; padding: 40px; }
              .icon { font-size: 64px; margin-bottom: 20px; }
              h1 { font-size: 24px; margin-bottom: 10px; color: #ef4444; }
              p { color: #888; line-height: 1.6; }
              ul { text-align: left; color: #666; margin: 20px 0; }
              a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #f59e0b; color: #000; text-decoration: none; border-radius: 8px; font-weight: 600; }
              a:hover { background: #d97706; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">🚫</div>
              <h1>Access Denied</h1>
              <p>You cannot download this file. This may happen if:</p>
              <ul>
                <li>The token is invalid or expired</li>
                <li>The token has not been claimed yet</li>
                <li>You have used all your downloads</li>
                <li>You are not authorized for this file</li>
              </ul>
              <a href="${process.env.CLIENT_URL || 'https://oxlynsoftware.com'}">Go to Homepage</a>
            </div>
          </body>
          </html>
        `);
      }

      // Verify ownership and claim status
      if (downloadToken.discord_user_id !== user.discordId) {
        return res.status(403).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Access Denied</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .container { text-align: center; max-width: 500px; padding: 40px; }
              .icon { font-size: 64px; margin-bottom: 20px; }
              h1 { font-size: 24px; margin-bottom: 10px; color: #ef4444; }
              p { color: #888; line-height: 1.6; }
              a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #f59e0b; color: #000; text-decoration: none; border-radius: 8px; font-weight: 600; }
              a:hover { background: #d97706; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">🚫</div>
              <h1>Not Authorized</h1>
              <p>You are not authorized to download this file.</p>
              <a href="${process.env.CLIENT_URL || 'https://oxlynsoftware.com'}">Go to Homepage</a>
            </div>
          </body>
          </html>
        `);
      }

      if (!downloadToken.is_claimed) {
        return res.status(403).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Token Not Claimed</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .container { text-align: center; max-width: 500px; padding: 40px; }
              .icon { font-size: 64px; margin-bottom: 20px; }
              h1 { font-size: 24px; margin-bottom: 10px; }
              p { color: #888; line-height: 1.6; }
              a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #f59e0b; color: #000; text-decoration: none; border-radius: 8px; font-weight: 600; }
              a:hover { background: #d97706; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">⚠️</div>
              <h1>Token Not Claimed</h1>
              <p>Please claim this token first before downloading.</p>
              <a href="${process.env.CLIENT_URL || 'https://oxlynsoftware.com'}">Go to Homepage</a>
            </div>
          </body>
          </html>
        `);
      }

      // If not a resume attempt, decrement the download count
      if (!isResume) {
        downloadToken = await DownloadTokenModel.useDownload(token, user.discordId);
        if (!downloadToken) {
          return res.status(403).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>No Downloads Available</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .container { text-align: center; max-width: 500px; padding: 40px; }
                .icon { font-size: 64px; margin-bottom: 20px; }
                h1 { font-size: 24px; margin-bottom: 10px; color: #ef4444; }
                p { color: #888; line-height: 1.6; }
                a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #f59e0b; color: #000; text-decoration: none; border-radius: 8px; font-weight: 600; }
                a:hover { background: #d97706; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="icon">🚫</div>
                <h1>No Downloads Available</h1>
                <p>You have used all available downloads for this file.</p>
                <a href="${process.env.CLIENT_URL || 'https://oxlynsoftware.com'}">Go to Homepage</a>
              </div>
            </body>
            </html>
          `);
        }
      } else {
        // For resume attempts, check if last_download_at exists (download was started)
        // This allows resuming even if remaining_downloads is 0
        if (!downloadToken.last_download_at) {
          return res.status(403).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>No Active Download</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .container { text-align: center; max-width: 500px; padding: 40px; }
                .icon { font-size: 64px; margin-bottom: 20px; }
                h1 { font-size: 24px; margin-bottom: 10px; }
                p { color: #888; line-height: 1.6; }
                a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #f59e0b; color: #000; text-decoration: none; border-radius: 8px; font-weight: 600; }
                a:hover { background: #d97706; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="icon">⚠️</div>
                <h1>No Active Download</h1>
                <p>You need to start a download first before resuming.</p>
                <a href="${process.env.CLIENT_URL || 'https://oxlynsoftware.com'}">Go to Homepage</a>
              </div>
            </body>
            </html>
          `);
        }
        // Allow resume if download was previously started (has last_download_at)
      }

      // Defense in depth: refuse to serve any token whose stored path is
      // outside the configured downloads root. Protects against historical
      // tokens that may have been created before path validation existed.
      const safePath = resolveSafeDownloadPath(downloadToken.file_path);
      if (!safePath) {
        console.error('Refusing to serve out-of-tree download path:', downloadToken.file_path);
        return res.status(404).send('File not found');
      }

      // Verificar se o ficheiro existe
      if (!fs.existsSync(safePath)) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>File Not Found</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .container { text-align: center; max-width: 500px; padding: 40px; }
              .icon { font-size: 64px; margin-bottom: 20px; }
              h1 { font-size: 24px; margin-bottom: 10px; }
              p { color: #888; line-height: 1.6; }
              a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #f59e0b; color: #000; text-decoration: none; border-radius: 8px; font-weight: 600; }
              a:hover { background: #d97706; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">📁</div>
              <h1>File Not Found</h1>
              <p>The requested file could not be found on the server. Please contact support.</p>
              <a href="${process.env.CLIENT_URL || 'https://oxlynsoftware.com'}">Go to Homepage</a>
            </div>
          </body>
          </html>
        `);
      }

      // Servir o ficheiro com suporte a Range requests (para resumable downloads)
      const stat = fs.statSync(safePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        // Parse Range header
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        const fileStream = fs.createReadStream(safePath, { start, end });
        
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${downloadToken.file_name}"`,
          'X-Downloads-Remaining': downloadToken.remaining_downloads.toString()
        });
        
        fileStream.pipe(res);
        
        fileStream.on('error', (error) => {
          console.error('Error streaming file:', error);
          if (!res.headersSent) {
            res.status(500).end();
          }
        });
      } else {
        // Normal download (no range)
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${downloadToken.file_name}"`);
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('X-Downloads-Remaining', downloadToken.remaining_downloads.toString());

        const fileStream = fs.createReadStream(safePath);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
          console.error('Error streaming file:', error);
          if (!res.headersSent) {
            res.status(500).send(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Download Error</title>
                <style>
                  body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                  .container { text-align: center; max-width: 500px; padding: 40px; }
                  .icon { font-size: 64px; margin-bottom: 20px; }
                  h1 { font-size: 24px; margin-bottom: 10px; }
                  p { color: #888; line-height: 1.6; }
                  a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #f59e0b; color: #000; text-decoration: none; border-radius: 8px; font-weight: 600; }
                  a:hover { background: #d97706; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="icon">❌</div>
                  <h1>Download Error</h1>
                  <p>An error occurred while downloading the file. Please try again or contact support.</p>
                  <a href="${process.env.CLIENT_URL || 'https://oxlynsoftware.com'}">Go to Homepage</a>
                </div>
              </body>
              </html>
            `);
          }
        });
      }

    } catch (error) {
      console.error('Error downloading file:', error);
      if (!res.headersSent) {
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Server Error</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .container { text-align: center; max-width: 500px; padding: 40px; }
              .icon { font-size: 64px; margin-bottom: 20px; }
              h1 { font-size: 24px; margin-bottom: 10px; }
              p { color: #888; line-height: 1.6; }
              a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #f59e0b; color: #000; text-decoration: none; border-radius: 8px; font-weight: 600; }
              a:hover { background: #d97706; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">⚠️</div>
              <h1>Server Error</h1>
              <p>An unexpected error occurred. Please try again later or contact support.</p>
              <a href="${process.env.CLIENT_URL || 'https://oxlynsoftware.com'}">Go to Homepage</a>
            </div>
          </body>
          </html>
        `);
      }
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Mock stats - replace with actual database queries
    const stats = {
      totalOrders: 0,
      totalRevenue: 0,
      totalProducts: 0,
      pendingOrders: 0,
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const listDownloadFiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const downloadsPath = process.env.DOWNLOADS_PATH;
    
    if (!downloadsPath) {
      return res.status(500).json({ error: 'DOWNLOADS_PATH not configured' });
    }

    const subPath = (req.query.path as string) || '';
    const fullPath = path.join(downloadsPath, subPath);

    // Security check: ensure the requested path is within downloads directory
    if (!fullPath.startsWith(downloadsPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const items = await fs.readdir(fullPath, { withFileTypes: true });
    
    const fileList = await Promise.all(
      items.map(async (item) => {
        const itemPath = path.join(fullPath, item.name);
        const relativePath = path.relative(downloadsPath, itemPath);
        const stats = await fs.stat(itemPath);
        
        return {
          name: item.name,
          path: itemPath,
          relativePath: relativePath,
          isDirectory: item.isDirectory(),
          size: stats.size,
          modified: stats.mtime,
        };
      })
    );

    // Sort: directories first, then files, alphabetically
    fileList.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ 
      files: fileList,
      currentPath: subPath,
      basePath: downloadsPath,
    });
  } catch (error) {
    next(error);
  }
};

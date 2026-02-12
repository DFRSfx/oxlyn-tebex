import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { StatsUtil } from '../utils/statsUtil.js';

interface Order extends RowDataPacket {
  id: number;
  discord_user_id: string;
  product_name: string;
  price: number;
  status: string;
  created_at: string;
  created_by_admin_id: string | null;
}

export const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [orders] = await pool.query<Order[]>(
      'SELECT * FROM orders ORDER BY created_at DESC'
    );
    
    res.json({ orders });
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { discord_user_id, product_name, price } = req.body;

    if (!discord_user_id || !product_name || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: 'Invalid price' });
    }

    const adminDiscordId = (req as any).user?.discord_id;

    console.log(`📝 [ORDER] Creating new order: ${product_name} for user ${discord_user_id} at €${priceNum}`);

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO orders (discord_user_id, product_name, price, status, created_by_admin_id) VALUES (?, ?, ?, ?, ?)',
      [discord_user_id, product_name, priceNum, 'completed', adminDiscordId]
    );

    const [newOrder] = await pool.query<Order[]>(
      'SELECT * FROM orders WHERE id = ?',
      [result.insertId]
    );

    // Note: NOT recording purchase statistics here because admin orders are manual entries
    // Real purchases are tracked automatically through Tebex checkout only

    console.log(`✅ [ORDER] Order created successfully: Order ID ${result.insertId}`);

    res.status(201).json({ order: newOrder[0] });
  } catch (error) {
    next(error);
  }
};

export const deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM orders WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const recordPackageView = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { packageName } = req.body;
    const user = (req as any).user;

    if (!packageName) {
      console.warn(`⚠️ [STATS] Record view called without packageName`);
      return res.status(400).json({ error: 'packageName is required' });
    }

    console.log(`📊 [VIEW] Recording package view: ${packageName}`);

    await StatsUtil.recordPackageView(packageName, user?.id, user?.discordId);
    console.log(`✅ [STATS] Package view recorded: ${packageName}`);

    res.json({ success: true, message: 'Package view recorded' });
  } catch (error) {
    console.error(`❌ [STATS] Error recording package view:`, error);
    next(error);
  }
};

export const recordAddToCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { packageName } = req.body;
    const user = (req as any).user;

    if (!packageName) {
      console.warn(`⚠️ [STATS] Record cart called without packageName`);
      return res.status(400).json({ error: 'packageName is required' });
    }

    console.log(`📊 [CART] Recording add to cart: ${packageName}`);

    await StatsUtil.recordAddToCart(packageName, user?.id, user?.discordId);
    console.log(`✅ [STATS] Add to cart recorded: ${packageName}`);

    res.json({ success: true, message: 'Add to cart recorded' });
  } catch (error) {
    console.error(`❌ [STATS] Error recording add to cart:`, error);
    next(error);
  }
};

export const recordCfxLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cfxIdentifier, userId } = req.body;

    if (!cfxIdentifier) {
      console.warn(`⚠️ [STATS] Record CFX login called without cfxIdentifier`);
      return res.status(400).json({ error: 'cfxIdentifier is required' });
    }

    console.log(`🎮 [CFX_LOGIN] Recording CFX login: ${cfxIdentifier}`);

    await StatsUtil.recordCfxLogin(cfxIdentifier, userId);
    console.log(`✅ [STATS] CFX login recorded: ${cfxIdentifier}`);

    res.json({ success: true, message: 'CFX login recorded' });
  } catch (error) {
    console.error(`❌ [STATS] Error recording CFX login:`, error);
    next(error);
  }
};

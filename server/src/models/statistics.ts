import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'oxlyn_tebex',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ==================== LOGIN STATS ====================

export interface LoginStat {
  id: number;
  user_id?: number;
  discord_id?: string;
  cfx_identifier?: string;
  login_type: 'discord' | 'cfx';
  last_login_at: Date;
  login_count: number;
}

export class LoginStatsModel {
  // Registrar ou atualizar login do Discord
  static async recordDiscordLogin(discordId: string, userId?: number): Promise<LoginStat> {
    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');

      // Verifica se já existe
      const [existing] = await connection.query(
        'SELECT * FROM login_stats WHERE discord_id = ? AND login_type = ?',
        [discordId, 'discord']
      );

      if ((existing as any[]).length > 0) {
        // Atualizar login existente
        await connection.query(
          `UPDATE login_stats
           SET last_login_at = CURRENT_TIMESTAMP,
               login_count = login_count + 1
           WHERE discord_id = ? AND login_type = ?`,
          [discordId, 'discord']
        );
      } else {
        // Inserir novo login
        await connection.query(
          `INSERT INTO login_stats (discord_id, login_type, login_count)
           VALUES (?, ?, 1)`,
          [discordId, 'discord']
        );
      }

      await connection.query('COMMIT');

      const [result] = await connection.query(
        'SELECT * FROM login_stats WHERE discord_id = ? AND login_type = ?',
        [discordId, 'discord']
      );
      return (result as any[])[0];
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      await connection.release();
    }
  }

  // Registrar ou atualizar login do CFX
  static async recordCfxLogin(cfxIdentifier: string, userId?: number): Promise<LoginStat> {
    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');

      const [existing] = await connection.query(
        'SELECT * FROM login_stats WHERE cfx_identifier = ? AND login_type = ?',
        [cfxIdentifier, 'cfx']
      );

      if ((existing as any[]).length > 0) {
        await connection.query(
          `UPDATE login_stats
           SET last_login_at = CURRENT_TIMESTAMP,
               login_count = login_count + 1
           WHERE cfx_identifier = ? AND login_type = ?`,
          [cfxIdentifier, 'cfx']
        );
      } else {
        await connection.query(
          `INSERT INTO login_stats (cfx_identifier, login_type, login_count)
           VALUES (?, ?, 1)`,
          [cfxIdentifier, 'cfx']
        );
      }

      await connection.query('COMMIT');

      const [result] = await connection.query(
        'SELECT * FROM login_stats WHERE cfx_identifier = ? AND login_type = ?',
        [cfxIdentifier, 'cfx']
      );
      return (result as any[])[0];
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      await connection.release();
    }
  }

  // Obter estatísticas de logins únicos
  static async getLoginStats() {
    const [rows] = await pool.query(
      `SELECT 
        login_type,
        COUNT(*) as unique_count,
        SUM(login_count) as total_logins,
        MAX(last_login_at) as last_login
       FROM login_stats
       GROUP BY login_type`
    );
    return rows;
  }

  // Obter detalhes de um login específico
  static async getLoginByDiscordId(discordId: string): Promise<LoginStat | null> {
    const [rows] = await pool.query(
      'SELECT * FROM login_stats WHERE discord_id = ? AND login_type = ?',
      [discordId, 'discord']
    );
    return (rows as any[])[0] || null;
  }

  static async getLoginByCfxId(cfxIdentifier: string): Promise<LoginStat | null> {
    const [rows] = await pool.query(
      'SELECT * FROM login_stats WHERE cfx_identifier = ? AND login_type = ?',
      [cfxIdentifier, 'cfx']
    );
    return (rows as any[])[0] || null;
  }

  // Get all login stats for admin
  static async getAllLoginStats(): Promise<LoginStat[]> {
    const [rows] = await pool.query(
      `SELECT
        id,
        discord_id,
        cfx_identifier,
        login_type,
        last_login_at,
        login_count
       FROM login_stats
       ORDER BY last_login_at DESC`
    );
    return rows as LoginStat[];
  }

  // Link CFX login to Discord login (merge as same person)
  static async linkCfxToDiscordLogin(cfxIdentifier: string, discordId: string): Promise<void> {
    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');

      // Find existing CFX login record
      const [cfxLogin] = await connection.query(
        'SELECT * FROM login_stats WHERE cfx_identifier = ? AND login_type = ?',
        [cfxIdentifier, 'cfx']
      );

      const cfxRecord = (cfxLogin as any[])[0];

      if (!cfxRecord) {
        console.warn(`⚠️ [LINK] CFX login not found: ${cfxIdentifier}`);
        await connection.query('COMMIT');
        return;
      }

      // Check if Discord login already exists
      const [discordLogin] = await connection.query(
        'SELECT * FROM login_stats WHERE discord_id = ? AND login_type = ?',
        [discordId, 'discord']
      );

      const discordRecord = (discordLogin as any[])[0];

      if (discordRecord) {
        // Discord login already exists - merge CFX data into Discord record
        console.log(`🔗 [LINK] Found existing Discord record, merging CFX data`);

        // Update Discord record to include CFX identifier
        await connection.query(
          `UPDATE login_stats
           SET cfx_identifier = ?
           WHERE id = ?`,
          [cfxIdentifier, discordRecord.id]
        );

        // Delete the separate CFX record
        await connection.query(
          'DELETE FROM login_stats WHERE id = ?',
          [cfxRecord.id]
        );

        console.log(`✅ [LINK] Merged CFX into Discord record and deleted CFX record`);
      } else {
        // No Discord login exists yet - update CFX record to add Discord ID
        console.log(`🔗 [LINK] No existing Discord record, updating CFX record with Discord ID`);

        await connection.query(
          `UPDATE login_stats
           SET discord_id = ?, login_type = 'discord'
           WHERE id = ?`,
          [discordId, cfxRecord.id]
        );

        console.log(`✅ [LINK] Updated CFX record with Discord ID`);
      }

      await connection.query('COMMIT');
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      await connection.release();
    }
  }
}

// ==================== PACKAGE STATS ====================

export interface PackageStat {
  id: number;
  package_name: string;
  view_count: number;
  cart_count: number;
  last_viewed_at?: Date;
  last_added_to_cart_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export class PackageStatsModel {
  // Registrar visualização de pacote
  static async recordPackageView(packageName: string, userId?: number, discordId?: string): Promise<void> {
    // Atualizar package_stats
    const [existing] = await pool.query(
      'SELECT * FROM package_stats WHERE package_name = ?',
      [packageName]
    );

    if ((existing as any[]).length > 0) {
      await pool.query(
        `UPDATE package_stats
         SET view_count = view_count + 1,
             last_viewed_at = CURRENT_TIMESTAMP
         WHERE package_name = ?`,
        [packageName]
      );
    } else {
      await pool.query(
        `INSERT INTO package_stats (package_name, view_count, last_viewed_at)
         VALUES (?, 1, CURRENT_TIMESTAMP)`,
        [packageName]
      );
    }

    // Registrar visualização individual
    await pool.query(
      `INSERT INTO package_views (package_name, discord_id)
       VALUES (?, ?)`,
      [packageName, discordId || null]
    );
  }

  // Registrar pacote adicionado ao carrinho
  static async recordAddToCart(packageName: string, userId?: number, discordId?: string): Promise<void> {
    // Atualizar package_stats
    const [existing] = await pool.query(
      'SELECT * FROM package_stats WHERE package_name = ?',
      [packageName]
    );

    if ((existing as any[]).length > 0) {
      await pool.query(
        `UPDATE package_stats
         SET cart_count = cart_count + 1,
             last_added_to_cart_at = CURRENT_TIMESTAMP
         WHERE package_name = ?`,
        [packageName]
      );
    } else {
      await pool.query(
        `INSERT INTO package_stats (package_name, cart_count, last_added_to_cart_at)
         VALUES (?, 1, CURRENT_TIMESTAMP)`,
        [packageName]
      );
    }

    // Registrar adição ao carrinho
    await pool.query(
      `INSERT INTO cart_stats (package_name, discord_id)
       VALUES (?, ?)`,
      [packageName, discordId || null]
    );
  }

  // Obter estatísticas agregadas de todos os pacotes
  static async getAllPackageStats(): Promise<PackageStat[]> {
    const [rows] = await pool.query(
      `SELECT * FROM package_stats 
       ORDER BY view_count DESC, cart_count DESC`
    );
    return rows as PackageStat[];
  }

  // Obter estatísticas de um pacote específico
  static async getPackageStats(packageName: string): Promise<PackageStat | null> {
    const [rows] = await pool.query(
      'SELECT * FROM package_stats WHERE package_name = ?',
      [packageName]
    );
    return (rows as any[])[0] || null;
  }

  // Obter top pacotes mais visualizados
  static async getTopPackagesByViews(limit: number = 10): Promise<PackageStat[]> {
    const [rows] = await pool.query(
      `SELECT * FROM package_stats 
       ORDER BY view_count DESC 
       LIMIT ?`,
      [limit]
    );
    return rows as PackageStat[];
  }

  // Obter top pacotes mais adicionados ao carrinho
  static async getTopPackagesByCart(limit: number = 10): Promise<PackageStat[]> {
    const [rows] = await pool.query(
      `SELECT * FROM package_stats 
       ORDER BY cart_count DESC 
       LIMIT ?`,
      [limit]
    );
    return rows as PackageStat[];
  }

}

// ==================== SUMMARY STATS ====================

export interface StatisticsSummary {
  unique_discord_logins: number;
  unique_cfx_logins: number;
  total_logins: number;
  total_package_views: number;
  total_cart_additions: number;
  unique_packages_viewed: number;
  unique_packages_in_cart: number;
}

export class StatisticsSummaryModel {
  static async getSummary(): Promise<StatisticsSummary> {
    const [loginStats] = await pool.query(
      `SELECT
        SUM(CASE WHEN discord_id IS NOT NULL THEN 1 ELSE 0 END) as unique_discord,
        SUM(CASE WHEN cfx_identifier IS NOT NULL THEN 1 ELSE 0 END) as unique_cfx,
        SUM(login_count) as total_logins
       FROM login_stats`
    );

    const [packageViewStats] = await pool.query(
      `SELECT 
        COUNT(*) as total_views,
        COUNT(DISTINCT package_name) as unique_packages
       FROM package_views`
    );

    const [cartStats] = await pool.query(
      `SELECT
        COUNT(*) as total_additions,
        COUNT(DISTINCT package_name) as unique_packages
       FROM cart_stats WHERE removed_at IS NULL`
    );

    const result = (loginStats as any[])[0];
    const pv = (packageViewStats as any[])[0];
    const cs = (cartStats as any[])[0];

    return {
      unique_discord_logins: result?.unique_discord || 0,
      unique_cfx_logins: result?.unique_cfx || 0,
      total_logins: result?.total_logins || 0,
      total_package_views: pv?.total_views || 0,
      unique_packages_viewed: pv?.unique_packages || 0,
      total_cart_additions: cs?.total_additions || 0,
      unique_packages_in_cart: cs?.unique_packages || 0,
    };
  }
}

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

export interface UserRecord {
  id: number;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  discord_id?: string;
  discord_username?: string;
  discord_avatar?: string;
  discord_roles?: string;
  created_at: Date;
  updated_at: Date;
}

export class UserModel {
  // Create or update user from Discord session
  static async upsertFromDiscord(
    discordId: string,
    discordUsername: string,
    discordAvatar?: string,
    email?: string,
    role: 'admin' | 'user' = 'user'
  ): Promise<UserRecord> {
    const userEmail = email || `${discordId}@discord.user`;

    // Check if user exists by discord_id
    const [existing] = await pool.query(
      'SELECT * FROM download_users WHERE discord_id = ?',
      [discordId]
    );

    if ((existing as any[]).length > 0) {
      // Update existing user
      await pool.query(
        `UPDATE download_users
         SET discord_username = ?,
             discord_avatar = ?,
             email = ?,
             role = ?
         WHERE discord_id = ?`,
        [discordUsername, discordAvatar, userEmail, role, discordId]
      );

      const [updated] = await pool.query(
        'SELECT * FROM download_users WHERE discord_id = ?',
        [discordId]
      );
      return (updated as any[])[0];
    } else {
      // Insert new user
      await pool.query(
        `INSERT INTO download_users
         (email, discord_id, discord_username, discord_avatar, role)
         VALUES (?, ?, ?, ?, ?)`,
        [userEmail, discordId, discordUsername, discordAvatar, role]
      );

      const [inserted] = await pool.query(
        'SELECT * FROM download_users WHERE discord_id = ?',
        [discordId]
      );
      return (inserted as any[])[0];
    }
  }

  // Find user by Discord ID
  static async findByDiscordId(discordId: string): Promise<UserRecord | null> {
    const [rows] = await pool.query(
      'SELECT * FROM download_users WHERE discord_id = ?',
      [discordId]
    );
    return (rows as any[])[0] || null;
  }

  // Find user by email
  static async findByEmail(email: string): Promise<UserRecord | null> {
    const [rows] = await pool.query(
      'SELECT * FROM download_users WHERE email = ?',
      [email]
    );
    return (rows as any[])[0] || null;
  }

  // Get all download users for admin
  static async getAllDownloadUsers(): Promise<UserRecord[]> {
    const [rows] = await pool.query(
      'SELECT id, email, role, discord_id, discord_username, discord_avatar, created_at, updated_at FROM download_users ORDER BY created_at DESC'
    );
    return rows as UserRecord[];
  }
}

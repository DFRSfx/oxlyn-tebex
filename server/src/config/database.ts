import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'oxlyn_tebex',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database tables
export async function initializeDatabase(): Promise<void> {
  const createDownloadTokensTable = `
    CREATE TABLE IF NOT EXISTS download_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(255) UNIQUE NOT NULL,
      discord_user_id VARCHAR(255) NOT NULL,
      file_path TEXT NOT NULL,
      file_name VARCHAR(500) NOT NULL,
      max_downloads INT NOT NULL DEFAULT 1,
      remaining_downloads INT NOT NULL,
      is_claimed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      claimed_at TIMESTAMP NULL DEFAULT NULL,
      last_download_at TIMESTAMP NULL DEFAULT NULL,
      INDEX idx_token (token),
      INDEX idx_discord_user (discord_user_id),
      INDEX idx_claimed (is_claimed),
      CONSTRAINT chk_downloads CHECK (remaining_downloads >= 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  
  await pool.query(createDownloadTokensTable);
}

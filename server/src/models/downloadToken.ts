import crypto from 'crypto';
import { pool } from '../config/database.js';

export interface DownloadToken {
  id: number;
  token: string;
  discord_user_id: string;
  file_path: string;
  file_name: string;
  max_downloads: number;
  remaining_downloads: number;
  is_claimed: boolean;
  created_at: Date;
  claimed_at?: Date;
  last_download_at?: Date;
  scripts_claimed: boolean;
}

export class DownloadTokenModel {
  // Gerar token único no formato oxlyn-<string-random>
  static generateToken(): string {
    const randomString = crypto.randomBytes(32).toString('hex');
    return `oxlyn-${randomString}`;
  }

  // Criar novo token de download (admin)
  static async create(
    discordUserId: string,
    filePath: string,
    fileName: string,
    maxDownloads: number
  ): Promise<DownloadToken> {
    const token = this.generateToken();
    const query = `
      INSERT INTO download_tokens 
        (token, discord_user_id, file_path, file_name, max_downloads, remaining_downloads)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [token, discordUserId, filePath, fileName, maxDownloads, maxDownloads]);
    
    // Get the inserted row
    const [rows] = await pool.query('SELECT * FROM download_tokens WHERE id = ?', [(result as any).insertId]);
    return (rows as any)[0];
  }

  // Buscar token por string
  static async findByToken(token: string): Promise<DownloadToken | null> {
    const query = 'SELECT * FROM download_tokens WHERE token = ?';
    const [rows] = await pool.query(query, [token]);
    return (rows as any)[0] || null;
  }

  // Verificar se o utilizador tem downloads ativos (com usos restantes ou scripts por reclamar)
  static async hasActiveDownloadsForUser(discordUserId: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM download_tokens
      WHERE discord_user_id = ?
        AND is_claimed = TRUE
        AND (
          remaining_downloads > 0
          OR (last_download_at IS NOT NULL AND scripts_claimed = FALSE)
        )
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [discordUserId]);
    return (rows as any[]).length > 0;
  }

  // Buscar tokens disponíveis para claim (usuário específico)
  static async findAvailableForUser(discordUserId: string): Promise<DownloadToken[]> {
    const query = `
      SELECT * FROM download_tokens 
      WHERE discord_user_id = ? 
        AND is_claimed = FALSE 
        AND remaining_downloads > 0
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.query(query, [discordUserId]);
    return rows as DownloadToken[];
  }

  // Buscar downloads claimed do usuário (My Orders)
  static async findClaimedByUser(discordUserId: string): Promise<DownloadToken[]> {
    const query = `
      SELECT * FROM download_tokens 
      WHERE discord_user_id = ? 
        AND is_claimed = TRUE
      ORDER BY claimed_at DESC
    `;
    const [rows] = await pool.query(query, [discordUserId]);
    return rows as DownloadToken[];
  }

  // Claim token
  static async claimToken(token: string, discordUserId: string): Promise<boolean> {
    const downloadToken = await this.findByToken(token);
    
    if (!downloadToken) return false;
    if (downloadToken.discord_user_id !== discordUserId) return false;
    if (downloadToken.is_claimed) return false;
    if (downloadToken.remaining_downloads <= 0) return false;

    const query = `
      UPDATE download_tokens 
      SET is_claimed = TRUE, claimed_at = NOW() 
      WHERE token = ? AND discord_user_id = ? AND is_claimed = FALSE
    `;
    const [result] = await pool.query(query, [token, discordUserId]);
    return ((result as any).affectedRows ?? 0) > 0;
  }

  // Decrementar downloads e retornar informações do ficheiro
  static async useDownload(token: string, discordUserId: string): Promise<DownloadToken | null> {
    const downloadToken = await this.findByToken(token);
    
    if (!downloadToken) return null;
    if (downloadToken.discord_user_id !== discordUserId) return null;
    if (!downloadToken.is_claimed) return null;
    if (downloadToken.remaining_downloads <= 0) return null;

    const query = `
      UPDATE download_tokens 
      SET remaining_downloads = remaining_downloads - 1,
          last_download_at = NOW()
      WHERE token = ? 
        AND discord_user_id = ? 
        AND is_claimed = TRUE 
        AND remaining_downloads > 0
    `;
    const [result] = await pool.query(query, [token, discordUserId]);
    
    if ((result as any).affectedRows > 0) {
      return await this.findByToken(token);
    }
    return null;
  }

  // Restaurar um download (para quando é cancelado antes de completar)
  static async restoreDownload(token: string, discordUserId: string): Promise<boolean> {
    const downloadToken = await this.findByToken(token);
    
    if (!downloadToken) return false;
    if (downloadToken.discord_user_id !== discordUserId) return false;
    if (!downloadToken.is_claimed) return false;
    
    // Only restore if max_downloads allows and last download was recent (within 10 minutes)
    const query = `
      UPDATE download_tokens 
      SET remaining_downloads = remaining_downloads + 1
      WHERE token = ? 
        AND discord_user_id = ? 
        AND is_claimed = TRUE 
        AND remaining_downloads < max_downloads
        AND last_download_at IS NOT NULL
        AND last_download_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
    `;
    const [result] = await pool.query(query, [token, discordUserId]);
    return ((result as any).affectedRows ?? 0) > 0;
  }

  // Marcar scripts como claimed (Tebex checkout completo)
  static async markScriptsClaimed(token: string, discordUserId: string): Promise<boolean> {
    const downloadToken = await this.findByToken(token);

    if (!downloadToken) return false;
    if (downloadToken.discord_user_id !== discordUserId) return false;
    if (!downloadToken.is_claimed) return false;
    if (downloadToken.scripts_claimed) return true; // Already claimed, idempotent

    const query = `
      UPDATE download_tokens
      SET scripts_claimed = TRUE
      WHERE token = ? AND discord_user_id = ? AND is_claimed = TRUE
    `;
    const [result] = await pool.query(query, [token, discordUserId]);
    return ((result as any).affectedRows ?? 0) > 0;
  }

  // Buscar todos os tokens (admin)
  static async findAll(): Promise<DownloadToken[]> {
    const query = 'SELECT * FROM download_tokens ORDER BY created_at DESC';
    const [rows] = await pool.query(query);
    return rows as DownloadToken[];
  }

  // Deletar token (admin)
  static async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM download_tokens WHERE id = ?';
    const [result] = await pool.query(query, [id]);
    return ((result as any).affectedRows ?? 0) > 0;
  }
}

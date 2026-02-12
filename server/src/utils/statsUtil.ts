import { LoginStatsModel, PackageStatsModel } from '../models/statistics';

/**
 * Utility para registrar eventos de estatísticas
 * Pode ser importado e usado em qualquer lugar da aplicação
 */

export class StatsUtil {
  /**
   * Registrar login do Discord
   * @param discordId ID do usuário no Discord
   * @param userId ID do usuário no banco de dados (opcional)
   */
  static async recordDiscordLogin(discordId: string, userId?: number) {
    try {
      console.log(`🔐 [DISCORD_LOGIN] Recording login for discord_id: ${discordId}`);
      await LoginStatsModel.recordDiscordLogin(discordId, userId);
      console.log(`✅ [DISCORD_LOGIN] Successfully recorded: ${discordId}`);
    } catch (error) {
      console.error(`❌ [DISCORD_LOGIN] Error recording Discord login:`, error);
      // Não rejeitar a operação principal em caso de erro no registro de estatísticas
    }
  }

  /**
   * Registrar login do CFX
   * @param cfxIdentifier Identificador do CFX
   * @param userId ID do usuário no banco de dados (opcional)
   */
  static async recordCfxLogin(cfxIdentifier: string, userId?: number) {
    try {
      console.log(`🎮 [CFX_LOGIN] Recording login for cfx_identifier: ${cfxIdentifier}`);
      await LoginStatsModel.recordCfxLogin(cfxIdentifier, userId);
      console.log(`✅ [CFX_LOGIN] Successfully recorded: ${cfxIdentifier}`);
    } catch (error) {
      console.error(`❌ [CFX_LOGIN] Error recording CFX login:`, error);
    }
  }

  /**
   * Link CFX login to Discord login (merge two logins as same person)
   * @param cfxIdentifier CFX identifier
   * @param discordId Discord ID
   */
  static async linkCfxToDiscordLogin(cfxIdentifier: string, discordId: string) {
    try {
      console.log(`🔗 [LINK] Linking CFX ${cfxIdentifier} to Discord ${discordId}`);
      await LoginStatsModel.linkCfxToDiscordLogin(cfxIdentifier, discordId);
      console.log(`✅ [LINK] Successfully linked: ${cfxIdentifier} → ${discordId}`);
    } catch (error) {
      console.error(`❌ [LINK] Error linking CFX to Discord:`, error);
    }
  }

  /**
   * Registrar visualização de pacote
   * @param packageName Nome do pacote
   * @param userId ID do usuário (opcional)
   * @param discordId Discord ID do usuário (opcional)
   */
  static async recordPackageView(packageName: string, userId?: number, discordId?: string) {
    try {
      console.log(`👁️  [PACKAGE_VIEW] Recording view for package: ${packageName} (user_id: ${userId || 'anon'}, discord_id: ${discordId || 'anon'})`);
      await PackageStatsModel.recordPackageView(packageName, userId, discordId);
      console.log(`✅ [PACKAGE_VIEW] Successfully recorded: ${packageName}`);
    } catch (error) {
      console.error(`❌ [PACKAGE_VIEW] Error recording package view:`, error);
    }
  }

  /**
   * Registrar adição de pacote ao carrinho
   * @param packageName Nome do pacote
   * @param userId ID do usuário (opcional)
   * @param discordId Discord ID do usuário (opcional)
   */
  static async recordAddToCart(packageName: string, userId?: number, discordId?: string) {
    try {
      console.log(`🛒 [ADD_TO_CART] Recording add to cart for package: ${packageName} (user_id: ${userId || 'anon'}, discord_id: ${discordId || 'anon'})`);
      await PackageStatsModel.recordAddToCart(packageName, userId, discordId);
      console.log(`✅ [ADD_TO_CART] Successfully recorded: ${packageName}`);
    } catch (error) {
      console.error(`❌ [ADD_TO_CART] Error recording add to cart:`, error);
    }
  }

}

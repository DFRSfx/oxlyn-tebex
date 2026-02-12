import { Request, Response } from 'express';
import { 
  LoginStatsModel, 
  PackageStatsModel, 
  StatisticsSummaryModel 
} from '../models/statistics';

export class StatisticsController {
  // Obter resumo das estatísticas
  static async getSummary(req: Request, res: Response) {
    try {
      const summary = await StatisticsSummaryModel.getSummary();
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching statistics summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics'
      });
    }
  }

  // Obter estatísticas de logins
  static async getLoginStats(req: Request, res: Response) {
    try {
      const stats = await LoginStatsModel.getLoginStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching login stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch login statistics'
      });
    }
  }

  // Obter estatísticas de todos os pacotes
  static async getPackageStats(req: Request, res: Response) {
    try {
      const stats = await PackageStatsModel.getAllPackageStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching package stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch package statistics'
      });
    }
  }

  // Obter estatísticas de um pacote específico
  static async getPackageDetail(req: Request, res: Response) {
    try {
      const { packageName } = req.params;
      const stats = await PackageStatsModel.getPackageStats(packageName);
      
      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'Package not found'
        });
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching package detail:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch package details'
      });
    }
  }

  // Obter top pacotes por visualizações
  static async getTopPackagesByViews(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const stats = await PackageStatsModel.getTopPackagesByViews(limit);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching top packages by views:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch top packages'
      });
    }
  }

  // Obter top pacotes por carrinho
  static async getTopPackagesByCart(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const stats = await PackageStatsModel.getTopPackagesByCart(limit);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching top packages by cart:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch top packages'
      });
    }
  }

}

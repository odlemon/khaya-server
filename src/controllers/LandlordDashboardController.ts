// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { LandlordDashboardService } from "../services/LandlordDashboardService";

const landlordDashboardService = new LandlordDashboardService();

export class LandlordDashboardController {
  /**
   * Get comprehensive landlord dashboard
   */
  async getLandlordDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user?.id;
      
      if (!landlordId) {
        return res.status(400).json({
          success: false,
          message: "Landlord ID is required"
        });
      }

      const dashboardData = await landlordDashboardService.getLandlordDashboard(landlordId);

      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get earnings breakdown by property
   */
  async getEarningsByProperty(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user?.id;
      
      if (!landlordId) {
        return res.status(400).json({
          success: false,
          message: "Landlord ID is required"
        });
      }

      // Parse optional filters from query params
      const filters: any = {};
      
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      const earningsByProperty = await landlordDashboardService.getEarningsByProperty(landlordId, filters);

      res.json({
        success: true,
        data: earningsByProperty,
        count: earningsByProperty.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get zero deposit protection package data
   */
  async getProtectionPackageData(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user?.id;
      
      if (!landlordId) {
        return res.status(400).json({
          success: false,
          message: "Landlord ID is required"
        });
      }

      const protectionData = await landlordDashboardService.getProtectionPackageData(landlordId);

      res.json({
        success: true,
        data: protectionData
      });
    } catch (error) {
      next(error);
    }
  }
}

export const landlordDashboardController = new LandlordDashboardController();

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
}

export const landlordDashboardController = new LandlordDashboardController();

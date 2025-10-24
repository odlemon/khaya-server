// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { adminDashboardService } from "../services/AdminDashboardService";

export class AdminDashboardController {
  
  /**
   * Get comprehensive admin dashboard metrics
   */
  async getDashboardMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await adminDashboardService.getDashboardMetrics();
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const adminDashboardController = new AdminDashboardController();




// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { TenantDashboardService } from "../services/TenantDashboardService";

export class TenantDashboardController {
  private tenantDashboardService = new TenantDashboardService();

  /**
   * Get tenant dashboard metrics
   */
  async getTenantDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user._id;
      
      const dashboard = await this.tenantDashboardService.getTenantDashboard(tenantId);

      res.status(200).json({
        success: true,
        message: "Tenant dashboard retrieved successfully",
        data: dashboard
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const tenantDashboardController = new TenantDashboardController();

// @ts-nocheck
import { Request, Response } from "express";
import { distributionService } from "../services/DistributionService";
import { escrowService } from "../services/EscrowService";
import { authenticate, authorize } from "../middleware/authenticate";

export class DistributionController {
  /**
   * Manual distribution (admin triggered)
   * POST /api/distribution/manual
   */
  async manualDistribution(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?._id?.toString() || (req as any).user?._id || (req as any).user?.id || (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { landlordId, startDate, endDate } = req.body;

      // Build filters
      const filters: any = {};
      if (landlordId) filters.landlordId = landlordId;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      // Run manual distribution
      const result = await distributionService.runManualDistribution(userId, filters);

      res.status(200).json({
        success: true,
        message: "Distribution completed successfully",
        data: result
      });
    } catch (error: any) {
      console.error("Error in manual distribution:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to run distribution"
      });
    }
  }

  /**
   * Get distribution summary
   * GET /api/distribution/summary
   */
  async getDistributionSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await escrowService.getEscrowSummary();

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      console.error("Error getting distribution summary:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get distribution summary"
      });
    }
  }

  /**
   * Get held transactions ready for distribution
   * GET /api/distribution/pending
   */
  async getPendingDistribution(req: Request, res: Response): Promise<void> {
    try {
      const { landlordId, startDate, endDate } = req.query;

      const filters: any = {};
      if (landlordId) filters.landlordId = landlordId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const transactions = await escrowService.getHeldTransactionsForDistribution(filters);

      // Calculate totals
      const totalAmount = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
      const totalLandlordAmount = transactions.reduce((sum, t) => sum + t.landlordAmount, 0);
      const totalKhayalamiAmount = transactions.reduce((sum, t) => sum + t.khayalamiAmount, 0);

      res.status(200).json({
        success: true,
        data: {
          transactions,
          summary: {
            count: transactions.length,
            totalAmount,
            totalLandlordAmount,
            totalKhayalamiAmount
          }
        }
      });
    } catch (error: any) {
      console.error("Error getting pending distribution:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get pending distribution"
      });
    }
  }
}

export const distributionController = new DistributionController();





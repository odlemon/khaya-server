// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { escrowService } from "../services/EscrowService";

export class EscrowController {
  /**
   * Get escrow account summary
   */
  async getEscrowSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await escrowService.getEscrowSummary();

      res.status(200).json({
        success: true,
        message: "Escrow summary retrieved successfully",
        data: summary
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get landlord's escrow transactions
   */
  async getLandlordEscrowTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user._id;
      const { status, startDate, endDate } = req.query;

      const transactions = await escrowService.getLandlordEscrowTransactions(
        landlordId,
        {
          status: status as string,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined
        }
      );

      res.status(200).json({
        success: true,
        message: "Escrow transactions retrieved successfully",
        data: transactions
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Manual distribution (Admin only)
   */
  async distributeEscrow(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const { landlordId, startDate, endDate } = req.body;

      const result = await escrowService.distributeEscrow(
        "manual",
        adminId,
        {
          landlordId,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined
        }
      );

      res.status(200).json({
        success: true,
        message: `Escrow distributed successfully: K${result.totalDistributed} to ${result.landlordPayouts} landlords and Khayalami`,
        data: result
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get distribution statistics
   */
  async getDistributionStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      const stats = await escrowService.getDistributionStats({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.status(200).json({
        success: true,
        message: "Distribution statistics retrieved successfully",
        data: stats
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get all escrow transactions (Admin only)
   */
  async getAllEscrowTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, landlordId, tenantId, startDate, endDate } = req.query;

      const transactions = await escrowService.getAllEscrowTransactions({
        status: status as string,
        landlordId: landlordId as string,
        tenantId: tenantId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.status(200).json({
        success: true,
        message: "Escrow transactions retrieved successfully",
        data: transactions
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const escrowController = new EscrowController();


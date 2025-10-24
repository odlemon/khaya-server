import { Request, Response, NextFunction } from "express";
import { CommissionService } from "../services/CommissionService";

const commissionService = new CommissionService();

export class CommissionController {
  /**
   * Record commission for online payment (immediate collection)
   */
  async recordOnlineCommission(req: Request, res: Response, next: NextFunction) {
    try {
      const { rentalId, landlordId, tenantId, paymentId, totalAmount, commissionRate } = req.body;

      if (!rentalId || !landlordId || !tenantId || !paymentId || !totalAmount) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: rentalId, landlordId, tenantId, paymentId, totalAmount"
        });
      }

      const commission = await commissionService.recordOnlineCommission(
        rentalId,
        landlordId,
        tenantId,
        paymentId,
        totalAmount,
        commissionRate || 0.05
      );

      res.status(201).json({
        success: true,
        message: "Online commission recorded and collected",
        data: commission
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record commission for cash payment (debt tracking)
   */
  async recordCashCommission(req: Request, res: Response, next: NextFunction) {
    try {
      const { rentalId, landlordId, tenantId, paymentId, totalAmount, commissionRate } = req.body;

      if (!rentalId || !landlordId || !tenantId || !paymentId || !totalAmount) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: rentalId, landlordId, tenantId, paymentId, totalAmount"
        });
      }

      const commission = await commissionService.recordCashCommission(
        rentalId,
        landlordId,
        tenantId,
        paymentId,
        totalAmount,
        commissionRate || 0.05
      );

      res.status(201).json({
        success: true,
        message: "Cash commission recorded as debt",
        data: commission
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get landlord's total debt
   */
  async getLandlordDebt(req: Request, res: Response, next: NextFunction) {
    try {
      const { landlordId } = req.params;

      if (!landlordId) {
        return res.status(400).json({
          success: false,
          message: "Landlord ID is required"
        });
      }

      const totalDebt = await commissionService.getLandlordDebt(landlordId);

      res.json({
        success: true,
        data: {
          landlordId,
          totalDebt,
          currency: "ZMW"
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get landlord's debt breakdown
   */
  async getLandlordDebtBreakdown(req: Request, res: Response, next: NextFunction) {
    try {
      const { landlordId } = req.params;

      if (!landlordId) {
        return res.status(400).json({
          success: false,
          message: "Landlord ID is required"
        });
      }

      const debtBreakdown = await commissionService.getLandlordDebtBreakdown(landlordId);

      res.json({
        success: true,
        data: {
          landlordId,
          debtBreakdown,
          totalDebt: debtBreakdown.reduce((sum, debt) => sum + debt.debtAmount, 0)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Collect debt when landlord receives online payment
   */
  async collectDebt(req: Request, res: Response, next: NextFunction) {
    try {
      const { landlordId } = req.params;
      const { paymentId, amount } = req.body;

      if (!landlordId || !paymentId || !amount) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: landlordId, paymentId, amount"
        });
      }

      const result = await commissionService.collectDebt(landlordId, paymentId, amount);

      res.json({
        success: true,
        message: "Debt collection processed",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Khayalami's earnings (Admin only)
   */
  async getKhayalamiEarnings(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, paymentMethod, commissionStatus } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (paymentMethod) filters.paymentMethod = paymentMethod;
      if (commissionStatus) filters.commissionStatus = commissionStatus;

      const result = await commissionService.getKhayalamiEarnings(filters);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get commission summary for admin dashboard
   */
  async getCommissionSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await commissionService.getCommissionSummary();

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all commissions with filters (Admin only)
   */
  async getAllCommissions(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        landlordId, 
        paymentMethod, 
        commissionStatus, 
        isDebt, 
        startDate, 
        endDate 
      } = req.query;

      const filters: any = {};
      if (landlordId) filters.landlordId = landlordId as string;
      if (paymentMethod) filters.paymentMethod = paymentMethod as "in_app" | "cash";
      if (commissionStatus) filters.commissionStatus = commissionStatus as "collected" | "owed" | "pending";
      if (isDebt !== undefined) filters.isDebt = isDebt === "true";
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const commissions = await commissionService.getAllCommissions(filters);

      res.json({
        success: true,
        data: commissions
      });
    } catch (error) {
      next(error);
    }
  }
}

// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { transactionService } from "../services/TransactionService";

export class TransactionController {
  /**
   * Get all transactions (admin)
   * GET /api/transactions
   */
  async getAllTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, status, landlordId, tenantId, startDate, endDate } = req.query;

      const transactions = await transactionService.getAllTransactions({
        type: type as any,
        status: status as string,
        landlordId: landlordId as string,
        tenantId: tenantId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.status(200).json({
        success: true,
        message: "Transactions retrieved successfully",
        data: transactions,
        count: transactions.length
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get transaction summary (admin)
   * GET /api/transactions/summary
   */
  async getTransactionSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, landlordId, tenantId } = req.query;

      const summary = await transactionService.getTransactionSummary({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        landlordId: landlordId as string,
        tenantId: tenantId as string
      });

      res.status(200).json({
        success: true,
        message: "Transaction summary retrieved successfully",
        data: summary
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const transactionController = new TransactionController();








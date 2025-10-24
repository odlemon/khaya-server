// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { paymentService } from "../services/PaymentService";
import { CommissionService } from "../services/CommissionService";
import { Types } from "mongoose";

const commissionService = new CommissionService();

export class PaymentController {
  /**
   * Submit payment (tenant pays rent)
   */
  async submitPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentId } = req.params;
      const userId = (req as any).user?.id;
      const paymentData = req.body;

      const payment = await paymentService.submitPayment(paymentId, userId, paymentData);

      res.json({
        success: true,
        message: "Payment submitted successfully",
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new payment (for multiple payments)
   */
  async createNewPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { rentalId } = req.params;
      const userId = (req as any).user?.id;
      const paymentData = req.body;

      const payment = await paymentService.createNewPayment(rentalId, userId, paymentData);

      res.json({
        success: true,
        message: "Payment created successfully",
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify payment (landlord confirms cash/bank payment)
   */
  async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentId } = req.params;
      const landlordId = (req as any).user?.id;
      const { verificationNotes } = req.body;

      const payment = await paymentService.verifyPayment(paymentId, landlordId, verificationNotes);

      res.json({
        success: true,
        message: "Payment verified successfully",
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject payment (landlord rejects proof)
   */
  async rejectPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentId } = req.params;
      const landlordId = (req as any).user?.id;
      const { rejectionReason } = req.body;

      const payment = await paymentService.rejectPayment(paymentId, landlordId, rejectionReason);

      res.json({
        success: true,
        message: "Payment rejected",
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get landlord balance
   */
  async getLandlordBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user?.id;
      const balance = await paymentService.getLandlordBalance(landlordId);

      res.json({
        success: true,
        data: balance
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update bank details
   */
  async updateBankDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user?.id;
      const bankDetails = req.body;

      const balance = await paymentService.updateBankDetails(landlordId, bankDetails);

      res.json({
        success: true,
        message: "Bank details updated successfully",
        data: balance
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update mobile money details
   */
  async updateMobileMoneyDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user?.id;
      const mobileMoneyDetails = req.body;

      const balance = await paymentService.updateMobileMoneyDetails(landlordId, mobileMoneyDetails);

      res.json({
        success: true,
        message: "Mobile money details updated successfully",
        data: balance
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request withdrawal
   */
  async requestWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user?.id;
      const withdrawalData = req.body;

      const withdrawal = await paymentService.requestWithdrawal(landlordId, withdrawalData);

      res.json({
        success: true,
        message: "Withdrawal request submitted successfully",
        data: withdrawal
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get withdrawal history
   */
  async getWithdrawalHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user?.id;
      const withdrawals = await paymentService.getWithdrawalHistory(landlordId);

      res.json({
        success: true,
        data: withdrawals
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user?.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const transactions = await paymentService.getTransactionHistory(landlordId, limit);

      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Get all payments with commission data
   */
  async getAllPaymentsWithCommissions(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: req.query.status as string,
        paymentMethod: req.query.paymentMethod as string,
        landlordId: req.query.landlordId as string,
        tenantId: req.query.tenantId as string,
        rentalId: req.query.rentalId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      // Get all payments
      const payments = await paymentService.getAllPayments(filters);

      // Get commission data for each payment
      const paymentsWithCommissions = await Promise.all(
        payments.map(async (payment) => {
          try {
            // Find commission record for this payment
            const commissions = await commissionService.getAllCommissions({
              paymentId: payment._id.toString()
            });

            const commission = commissions[0]; // Should be only one commission per payment

            return {
              // Payment data
              _id: payment._id,
              rentalId: payment.rentalId,
              agreementId: payment.agreementId,
              propertyId: payment.propertyId,
              landlordId: payment.landlordId,
              tenantId: payment.tenantId,
              paymentType: payment.paymentType,
              amount: payment.amount,
              totalAmount: payment.totalAmount,
              dueDate: payment.dueDate,
              paymentDate: payment.paymentDate,
              paymentMethod: payment.paymentMethod,
              status: payment.status,
              verifiedAt: payment.verifiedAt,
              verifiedBy: payment.verifiedBy,
              receiptNumber: payment.receiptNumber,
              gatewayResponse: payment.gatewayResponse,
              proofOfPayment: payment.proofOfPayment,
              utilityReceipts: payment.utilityReceipts,
              notes: payment.notes,
              createdAt: payment.createdAt,
              updatedAt: payment.updatedAt,

              // Commission data
              commission: commission ? {
                _id: commission._id,
                transactionId: commission.transactionId,
                commissionRate: commission.commissionRate,
                commissionAmount: commission.commissionAmount,
                commissionStatus: commission.commissionStatus,
                isDebt: commission.isDebt,
                debtAmount: commission.debtAmount,
                debtPaid: commission.debtPaid,
                debtPaidAt: commission.debtPaidAt,
                collectedAt: commission.collectedAt,
                collectedFromPaymentId: commission.collectedFromPaymentId
              } : null,

              // Calculated fields
              landlordAmount: commission ? 
                (payment.totalAmount - commission.commissionAmount) : 
                payment.totalAmount,
              khayalamiCommission: commission ? commission.commissionAmount : 0,
              commissionPercentage: commission ? (commission.commissionRate * 100) : 0
            };
          } catch (error) {
            console.error(`Error getting commission for payment ${payment._id}:`, error);
            return {
              // Payment data only if commission lookup fails
              _id: payment._id,
              rentalId: payment.rentalId,
              agreementId: payment.agreementId,
              propertyId: payment.propertyId,
              landlordId: payment.landlordId,
              tenantId: payment.tenantId,
              paymentType: payment.paymentType,
              amount: payment.amount,
              totalAmount: payment.totalAmount,
              dueDate: payment.dueDate,
              paymentDate: payment.paymentDate,
              paymentMethod: payment.paymentMethod,
              status: payment.status,
              verifiedAt: payment.verifiedAt,
              verifiedBy: payment.verifiedBy,
              receiptNumber: payment.receiptNumber,
              gatewayResponse: payment.gatewayResponse,
              proofOfPayment: payment.proofOfPayment,
              utilityReceipts: payment.utilityReceipts,
              notes: payment.notes,
              createdAt: payment.createdAt,
              updatedAt: payment.updatedAt,
              commission: null,
              landlordAmount: payment.totalAmount,
              khayalamiCommission: 0,
              commissionPercentage: 0
            };
          }
        })
      );

      // Calculate summary statistics
      const totalPayments = paymentsWithCommissions.length;
      const totalAmount = paymentsWithCommissions.reduce((sum, p) => sum + p.totalAmount, 0);
      const totalCommission = paymentsWithCommissions.reduce((sum, p) => sum + p.khayalamiCommission, 0);
      const totalLandlordAmount = paymentsWithCommissions.reduce((sum, p) => sum + p.landlordAmount, 0);

      const summary = {
        totalPayments,
        totalAmount,
        totalCommission,
        totalLandlordAmount,
        averageCommission: totalPayments > 0 ? totalCommission / totalPayments : 0,
        commissionRate: totalAmount > 0 ? (totalCommission / totalAmount) * 100 : 0
      };

      res.json({
        success: true,
        data: {
          summary,
          payments: paymentsWithCommissions
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Get all payments (existing method)
   */
  async getAllPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: req.query.status as string,
        paymentMethod: req.query.paymentMethod as string,
        landlordId: req.query.landlordId as string,
        tenantId: req.query.tenantId as string,
        rentalId: req.query.rentalId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      const payments = await paymentService.getAllPayments(filters);

      res.json({
        success: true,
        data: payments
      });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
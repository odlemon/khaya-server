// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { paymentService } from "../services/PaymentService";
import { paymentRequestService } from "../services/PaymentRequestService";
import { CommissionService } from "../services/CommissionService";
import { transactionService } from "../services/TransactionService";
import { paynowService } from "../services/PaynowService";
import { Payment } from "../models/Payment";
import { Rental } from "../models/Rental";
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
   * Supports both online (in_app) and external payment methods
   */
  async createNewPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { rentalId } = req.params;
      const userId = (req as any).user?._id?.toString() || (req as any).user?._id || (req as any).user?.id || (req as any).user?.userId;
      const paymentData = req.body;

      // If payment method is external (not in_app), create payment request instead
      if (paymentData.paymentMethod && paymentData.paymentMethod !== "in_app") {
        // External payment - create payment request
        if (!paymentData.proofOfPayment) {
          return res.status(400).json({
            success: false,
            message: "Proof of payment is required for external payments"
          });
        }

        const paymentRequest = await paymentRequestService.createPaymentRequest({
          tenantId: userId,
          rentalId: rentalId,
          amount: paymentData.amount,
          proofOfPayment: paymentData.proofOfPayment,
          paymentMethod: paymentData.paymentMethod,
          notes: paymentData.notes,
          requestType: "rent"
        });

        return res.json({
          success: true,
          message: "Payment request submitted successfully. Waiting for admin approval.",
          data: {
            paymentRequest
          }
        });
      }

      // Paynow mobile money payment
      if (paymentData.paymentMethod === "paynow" || paymentData.phone) {
        const phone = paymentData.phone;
        const method = paymentData.mobileMethod || "ecocash";

        if (!phone) {
          return res.status(400).json({ success: false, message: "Phone number is required for Paynow payments" });
        }

        const rental = await Rental.findById(rentalId);
        if (!rental) {
          return res.status(404).json({ success: false, message: "Rental not found" });
        }

        const reference = paynowService.generateReference("RENT", userId);

        // Find pending invoice
        const { Invoice } = await import("../models/Invoice");
        const pendingInvoice = await Invoice.findOne({
          rentalId: rental._id,
          tenantId: new Types.ObjectId(userId),
          status: { $in: ["pending", "partially_paid", "overdue"] }
        }).sort({ dueDate: 1 });

        // Create pending payment record
        const pendingPayment = await Payment.create({
          rentalId: rental._id,
          agreementId: rental.agreementId,
          propertyId: rental.propertyId,
          invoiceId: pendingInvoice?._id || null,
          landlordId: rental.landlordId,
          tenantId: rental.tenantId,
          paymentType: paymentData.paymentType || "rent",
          amount: paymentData.amount,
          totalAmount: paymentData.amount,
          dueDate: new Date(),
          paymentMethod: "in_app",
          status: "pending",
          notes: paymentData.notes,
          pollUrl: null,
          paynowReference: reference,
          paynowMetadata: { paymentPurpose: "rent" }
        });

        // Initiate Paynow payment
        const paynowResult = await paynowService.initiateMobilePayment({
          reference,
          description: `Rent payment for ${rental.propertyId}`,
          amount: paymentData.amount,
          phone,
          method,
          email: paymentData.email
        });

        if (!paynowResult.success) {
          pendingPayment.status = "cancelled";
          pendingPayment.rejectionReason = paynowResult.error;
          await pendingPayment.save();
          return res.status(400).json({ success: false, message: paynowResult.error || "Payment initiation failed" });
        }

        pendingPayment.pollUrl = paynowResult.pollUrl;
        await pendingPayment.save();

        return res.status(201).json({
          success: true,
          message: "Payment initiated. Check your phone for payment instructions.",
          data: {
            paymentId: pendingPayment._id,
            reference,
            pollUrl: paynowResult.pollUrl,
            instructions: paynowResult.instructions,
            statusCheckUrl: `/api/webhooks/payment-status/${pendingPayment._id}`
          }
        });
      }

      // Legacy online payment (in_app with gatewayResponse) - process immediately
      if (!paymentData.gatewayResponse) {
        return res.status(400).json({
          success: false,
          message: "Gateway response or phone number is required for online payments"
        });
      }

      const payment = await paymentService.createNewPayment(rentalId, userId, {
        ...paymentData,
        paymentMethod: "in_app"
      });

      const { EscrowTransaction } = await import("../models/Escrow");
      const escrowTransaction = await EscrowTransaction.findOne({ paymentId: payment._id });

      const { RevenueSource } = await import("../models/RevenueSource");
      const revenueSources = await RevenueSource.find({ paymentId: payment._id });

      res.json({
        success: true,
        message: "Payment processed successfully and added to escrow",
        data: {
          payment,
          escrowTransaction,
          revenueSources
        }
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
   * Get landlord transactions plus summary/status data
   */
  async getLandlordTransactionsWithStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const landlordId = (req as any).user?.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const filters = {
        landlordId,
        status: req.query.status as string,
        type: req.query.type as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      const transactions = await transactionService.getAllTransactions(filters);
      const summary = await transactionService.getTransactionSummary(filters);

      res.json({
        success: true,
        data: {
          transactions: transactions.slice(0, limit),
          summary
        }
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
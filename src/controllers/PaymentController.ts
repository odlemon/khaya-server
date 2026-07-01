// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { paymentService } from "../services/PaymentService";
import { paymentRequestService } from "../services/PaymentRequestService";
import { CommissionService } from "../services/CommissionService";
import { transactionService } from "../services/TransactionService";
import { paymentGatewayService } from "../services/PaymentGatewayService";
import { contipayConfig } from "../config/contipayConfig";
import {
  isEcoCashOnlinePayment,
  isExternalProofPayment,
  isPaynowOnlinePayment,
} from "../utils/rentOnlinePayment";
import { buildGatewayPaymentFields } from "../utils/paymentGatewayFields";
import { Payment } from "../models/Payment";
import { Rental } from "../models/Rental";
import { assertRentalAcceptsTenantPayments } from "../utils/rentalCapabilities";
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
      const paymentMethod = (paymentData.paymentMethod || "").toLowerCase();

      // --- Online EcoCash (ContiPay) or PayNow — must run before external-proof branch ---
      const isOnlineEcoCash = isEcoCashOnlinePayment(paymentMethod);
      const isOnlinePaynow = isPaynowOnlinePayment(paymentMethod);
      const isOnlineGateway =
        isOnlineEcoCash ||
        isOnlinePaynow ||
        (!!paymentData.phone && !paymentData.proofOfPayment && !isExternalProofPayment(paymentMethod));

      if (isOnlineGateway) {
        const method = paymentData.mobileMethod || "ecocash";

        let phone: string;
        if (isOnlinePaynow) {
          if (!paymentData.phone) {
            return res.status(400).json({
              success: false,
              message: "Phone number is required for PayNow payments",
            });
          }
          phone = paymentData.phone;
        } else {
          try {
            phone = contipayConfig.resolveEcoCashPhone(paymentData.phone);
          } catch (err: any) {
            return res.status(400).json({ success: false, message: err.message });
          }
        }

        const rental = await Rental.findById(rentalId);
        if (!rental) {
          return res.status(404).json({ success: false, message: "Rental not found" });
        }

        try {
          assertRentalAcceptsTenantPayments(rental);
        } catch (err: any) {
          return res.status(400).json({ success: false, message: err.message });
        }

        const reference = paymentGatewayService.generateReference("RENT", userId);

        const { Invoice } = await import("../models/Invoice");
        const pendingInvoice = await Invoice.findOne({
          rentalId: rental._id,
          tenantId: new Types.ObjectId(userId),
          status: { $in: ["pending", "partially_paid", "overdue"] },
        }).sort({ dueDate: 1 });

        const scheduledPayment = await Payment.findOne({
          rentalId: rental._id,
          paymentType: "rent",
          status: { $in: ["pending", "overdue"] },
        }).sort({ dueDate: 1 });

        if (!scheduledPayment) {
          return res.status(400).json({
            success: false,
            message: "No pending rent installment found for this rental.",
          });
        }

        const installmentDue =
          scheduledPayment.totalAmount ?? scheduledPayment.amount ?? 0;

        const requestedAmount =
          paymentData.amount != null ? Number(paymentData.amount) : NaN;

        if (!requestedAmount || requestedAmount <= 0 || Number.isNaN(requestedAmount)) {
          return res.status(400).json({
            success: false,
            message: "Payment amount is required and must be greater than zero.",
          });
        }

        if (requestedAmount > installmentDue) {
          return res.status(400).json({
            success: false,
            message: `Payment amount cannot exceed amount due ($${installmentDue}).`,
          });
        }

        const paymentAmount = requestedAmount;
        const isFullInstallment = paymentAmount >= installmentDue;
        const paymentMetadata = isFullInstallment ? scheduledPayment.metadata : undefined;

        const gatewayMeta = { paymentPurpose: "rent", channel: "ecocash" };

        let pendingPayment;

        if (isFullInstallment) {
          // Reuse the scheduled installment — avoid duplicate payment rows
          pendingPayment = scheduledPayment;
          pendingPayment.amount = paymentAmount;
          pendingPayment.totalAmount = paymentAmount;
          pendingPayment.lateFee = 0;
          pendingPayment.daysLate = 0;
          pendingPayment.status = "pending";
          pendingPayment.paymentMethod = "in_app";
          pendingPayment.invoiceId = pendingInvoice?._id || pendingPayment.invoiceId || null;
          pendingPayment.notes = paymentData.notes ?? pendingPayment.notes;
          if (paymentMetadata) pendingPayment.metadata = paymentMetadata;
          Object.assign(pendingPayment, buildGatewayPaymentFields(reference, gatewayMeta));
          await pendingPayment.save();
        } else {
          pendingPayment = await Payment.create({
            rentalId: rental._id,
            agreementId: rental.agreementId,
            propertyId: rental.propertyId,
            invoiceId: pendingInvoice?._id || null,
            landlordId: rental.landlordId,
            tenantId: rental.tenantId,
            paymentType: paymentData.paymentType || "rent",
            amount: paymentAmount,
            totalAmount: paymentAmount,
            dueDate: scheduledPayment.dueDate,
            paymentMethod: "in_app",
            status: "pending",
            notes: paymentData.notes,
            metadata: {
              scheduledPaymentId: scheduledPayment._id.toString(),
              installmentBalanceBefore: installmentDue,
            },
            ...buildGatewayPaymentFields(reference, gatewayMeta),
          });
        }

        const gatewayResult = await paymentGatewayService.initiateMobilePayment({
          reference,
          description: `Rent payment for ${rental.propertyId}`,
          amount: paymentAmount,
          phone,
          method,
          email: paymentData.email,
          firstName: paymentData.firstName,
          lastName: paymentData.lastName,
        });

        if (!gatewayResult.success) {
          pendingPayment.status = "cancelled";
          pendingPayment.rejectionReason = gatewayResult.error;
          await pendingPayment.save();
          return res.status(400).json({
            success: false,
            message: gatewayResult.error || "Payment initiation failed",
          });
        }

        if (gatewayResult.pollUrl) {
          pendingPayment.pollUrl = gatewayResult.pollUrl;
          await pendingPayment.save();
        }

        return res.status(201).json({
          success: true,
          message: contipayConfig.isSandboxMode()
            ? "EcoCash payment initiated (sandbox test mode). Poll status until confirmed."
            : "EcoCash payment initiated. Check your phone for the payment prompt.",
          data: {
            paymentId: pendingPayment._id,
            amount: paymentAmount,
            reference,
            paymentMethod: "ecocash",
            pollUrl: gatewayResult.pollUrl || null,
            instructions: gatewayResult.instructions,
            statusCheckUrl: `/api/webhooks/payment-status/${pendingPayment._id}`,
            gateway: paymentGatewayService.provider,
            ...(contipayConfig.isSandboxMode() && {
              testMode: true,
              sandboxNote: "EcoCash sandbox number used; user phone ignored in UAT.",
            }),
          },
        });
      }

      // External payment — proof upload, admin approval
      if (isExternalProofPayment(paymentMethod)) {
        if (!paymentData.proofOfPayment) {
          return res.status(400).json({
            success: false,
            message: "Proof of payment is required for external payments",
          });
        }

        const paymentRequest = await paymentRequestService.createPaymentRequest({
          tenantId: userId,
          rentalId: rentalId,
          amount: paymentData.amount,
          proofOfPayment: paymentData.proofOfPayment,
          paymentMethod: paymentData.paymentMethod,
          notes: paymentData.notes,
          requestType: "rent",
        });

        return res.json({
          success: true,
          message: "Payment request submitted successfully. Waiting for admin approval.",
          data: {
            paymentRequest,
          },
        });
      }

      return res.status(400).json({
        success: false,
        message:
          "Online rent payment requires paymentMethod 'ecocash'. For bank/cash deposits, include proofOfPayment.",
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
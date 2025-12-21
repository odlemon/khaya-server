// @ts-nocheck
import { Payment, IPayment } from "../models/Payment";
import { LandlordBalance } from "../models/LandlordBalance";
import { Withdrawal } from "../models/Withdrawal";
import { Rental } from "../models/Rental";
import { CommissionService } from "./CommissionService";
import { escrowService } from "./EscrowService";
import { paymentCalculationService } from "./PaymentCalculationService";
import { revenueSourceService } from "./RevenueSourceService";
import { emailNotificationService } from "./EmailNotificationService";
import { User } from "../models/User";
import { Property } from "../models/Property";
import { Types } from "mongoose";

class PaymentService {
  private commissionService = new CommissionService();
  /**
   * Create a new payment record (for multiple payments)
   */
  async createNewPayment(
    rentalId: string,
    userId: string,
    data: {
      amount: number;
      paymentMethod: "in_app" | "cash";
      paymentType?: "rent" | "deposit" | "utility" | "service" | "other";
      proofOfPayment?: string;
      gatewayResponse?: any;
      utilityReceipts?: any[];
      notes?: string;
    }
  ): Promise<IPayment> {
    // Get rental to verify access and get IDs
    const rental = await Rental.findById(rentalId);
    
    if (!rental) {
      throw new Error("Rental not found");
    }
    
    const tenantIdStr = rental.tenantId.toString();
    const userIdStr = userId.toString();
    
    if (tenantIdStr !== userIdStr) {
      throw new Error("Access denied");
    }
    
    // Validate amount
    if (!data.amount || data.amount <= 0) {
      throw new Error("Invalid payment amount");
    }
    
    // For rent payments, find the invoice for this rental's pending payment
    let invoiceId = null;
    if (data.paymentType === "rent" || (!data.paymentType && rental)) {
      // Find the pending invoice for this rental (by rentalId and period, not by amount)
      const { Invoice } = await import("../models/Invoice");
      
      // Find invoices for this rental that are pending/partially_paid/overdue
      // Sort by dueDate to get the earliest due invoice first
      const pendingInvoice = await Invoice.findOne({
        rentalId: rental._id,
        tenantId: new Types.ObjectId(userId),
        status: { $in: ["pending", "partially_paid", "overdue"] }
      }).sort({ dueDate: 1 }); // Get the earliest due invoice
      
      if (pendingInvoice) {
        invoiceId = pendingInvoice._id;
      }
    }

    // Create NEW payment record
    const newPayment = await Payment.create({
      rentalId: rental._id,
      agreementId: rental.agreementId,
      propertyId: rental.propertyId,
      invoiceId: invoiceId, // Link payment to invoice
      landlordId: rental.landlordId,
      tenantId: rental.tenantId,
      
      paymentType: data.paymentType || "rent",
      amount: data.amount,
      totalAmount: data.amount,
      
      dueDate: new Date(), // Today
      paymentDate: new Date(),
      
      paymentMethod: data.paymentMethod,
      proofOfPayment: data.proofOfPayment,
      gatewayResponse: data.gatewayResponse,
      utilityReceipts: data.utilityReceipts || [],
      notes: data.notes,
      
      status: data.paymentMethod === "in_app" ? "verified" : "paid",
      verifiedAt: data.paymentMethod === "in_app" ? new Date() : undefined
    });

    // Update invoice status when payment is made
    if (invoiceId) {
      try {
        const { Invoice } = await import("../models/Invoice");
        const { logger } = await import("../utils/logger");
        const invoice = await Invoice.findById(invoiceId);
        
        if (invoice) {
          // Calculate new amounts
          const currentAmountPaid = invoice.amountPaid || 0;
          const newAmountPaid = currentAmountPaid + data.amount;
          const invoiceTotal = invoice.total || invoice.amountDue || 0;
          const newAmountDue = Math.max(0, invoiceTotal - newAmountPaid);
          
          // Determine new status based on payment amount
          let newStatus: "pending" | "partially_paid" | "fully_paid" | "overdue" | "cancelled" = invoice.status;
          
          if (newAmountDue <= 0 || newAmountPaid >= invoiceTotal) {
            // Fully paid
            newStatus = "fully_paid";
          } else if (newAmountPaid > 0 && newAmountPaid < invoiceTotal) {
            // Partially paid
            newStatus = "partially_paid";
          }
          
          // Update invoice
          await Invoice.findByIdAndUpdate(invoiceId, {
            $set: {
              amountPaid: newAmountPaid,
              amountDue: newAmountDue,
              status: newStatus,
              ...(newStatus === "fully_paid" && {
                paymentDate: new Date(),
                paymentMethod: data.paymentMethod,
                receiptNumber: newPayment.receiptNumber || invoice.receiptNumber
              })
            }
          });
          
          logger.info(`✅ Updated invoice ${invoice.invoiceNumber}: amountPaid=${newAmountPaid}, amountDue=${newAmountDue}, status=${newStatus}`);
        } else {
          const { logger } = await import("../utils/logger");
          logger.warn(`⚠️ Invoice ${invoiceId} not found when updating payment ${newPayment._id}`);
        }
      } catch (error: any) {
        const { logger } = await import("../utils/logger");
        logger.error(`❌ Failed to update invoice ${invoiceId} for payment ${newPayment._id}:`, error.message);
        // Continue even if invoice update fails
      }
    } else if (data.paymentType === "rent") {
      // If no invoice was found but this is a rent payment, log a warning
      const { logger } = await import("../utils/logger");
      logger.warn(`⚠️ No invoice found for rent payment ${newPayment._id} on rental ${rentalId}`);
    }
    
    // Calculate deductions before adding to escrow
    const deductions = await paymentCalculationService.calculateRentDeductions(
      data.amount,
      userId,
      rental.landlordId.toString(),
      rentalId
    );

    // Create revenue source records
    const revenueSourceIds: string[] = [];
    
    if (deductions.subscriptionFee > 0) {
      const subRev = await revenueSourceService.createRevenueSource({
        sourceType: "subscription",
        amount: deductions.subscriptionFee,
        payerId: userId,
        recipientId: "khayalami",
        paymentId: newPayment._id.toString(),
        rentalId,
        description: `Monthly subscription fee`
      });
      revenueSourceIds.push(subRev._id.toString());
    }

    if (deductions.processingFee > 0) {
      const procRev = await revenueSourceService.createRevenueSource({
        sourceType: "processing_fee",
        amount: deductions.processingFee,
        payerId: userId,
        recipientId: "khayalami",
        paymentId: newPayment._id.toString(),
        rentalId,
        description: `Processing fee (${(deductions.breakdown.processingFeeRate * 100).toFixed(1)}%)`
      });
      revenueSourceIds.push(procRev._id.toString());
    }

    if (deductions.insurancePremium > 0) {
      const insRev = await revenueSourceService.createRevenueSource({
        sourceType: "insurance_commission",
        amount: deductions.insurancePremium,
        payerId: userId,
        recipientId: "khayalami",
        paymentId: newPayment._id.toString(),
        rentalId,
        description: `Insurance premium commission`
      });
      revenueSourceIds.push(insRev._id.toString());
    }

    // Add payment to escrow with deductions
    if (data.paymentMethod === "in_app") {
      // Online payment - add to escrow with "held" status (auto-verified)
      await escrowService.addToEscrow(newPayment, {
        deductions: {
          subscriptionFee: deductions.subscriptionFee,
          processingFee: deductions.processingFee,
          insurancePremium: deductions.insurancePremium
        },
        revenueSourceIds
      });
      await escrowService.updateEscrowStatus(newPayment._id.toString(), "held");
    } else {
      // Cash payment - add to escrow with "pending" status (needs verification)
      await escrowService.addToEscrow(newPayment, {
        deductions: {
          subscriptionFee: deductions.subscriptionFee,
          processingFee: deductions.processingFee,
          insurancePremium: deductions.insurancePremium
        },
        revenueSourceIds
      });
      // Keep as "pending" until landlord verifies
    }
    
    // Update rental stats
    await this.updateRentalPaymentStats(rentalId);
    
    // Send email notifications
    try {
      const tenant = await User.findById(userId);
      const landlord = await User.findById(rental.landlordId);
      const property = await Property.findById(rental.propertyId);
      
      if (tenant && data.paymentMethod === "in_app") {
        await emailNotificationService.sendPaymentConfirmed({
          tenantEmail: tenant.email,
          tenantName: `${tenant.firstName} ${tenant.lastName}`,
          amount: data.amount,
          deductions: {
            subscriptionFee: deductions.subscriptionFee,
            processingFee: deductions.processingFee,
            insurancePremium: deductions.insurancePremium,
            totalDeductions: deductions.khayalamiTotal
          },
          escrowStatus: "held"
        });
      }
      
      if (landlord && property) {
        await emailNotificationService.sendRentDepositedEscrow({
          landlordEmail: landlord.email,
          landlordName: `${landlord.firstName} ${landlord.lastName}`,
          tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : "Tenant",
          amount: data.amount,
          netRentAmount: deductions.netRentAmount,
          propertyTitle: property.title || property.address
        });
      }
    } catch (emailError) {
      console.error("Error sending email notifications:", emailError);
      // Don't fail payment creation if email fails
    }
    
    console.log(`💰 New payment created: ${newPayment._id} - ${data.amount} via ${data.paymentMethod}`);
    
    return newPayment;
  }

  /**
   * Submit payment (tenant pays rent)
   */
  async submitPayment(
    paymentId: string,
    userId: string,
    data: {
      amount: number; // User chooses amount to pay
      paymentMethod: "in_app" | "cash";
      proofOfPayment?: string; // Optional for cash
      gatewayResponse?: any; // For in_app payments
      utilityReceipts?: any[];
      notes?: string;
    }
  ): Promise<IPayment> {
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      throw new Error("Payment not found");
    }
    
    const tenantIdStr = payment.tenantId.toString();
    const userIdStr = userId.toString();
    
    if (tenantIdStr !== userIdStr) {
      throw new Error("Access denied");
    }
    
    // Only prevent duplicate payment if it's verified
    // Allow paying again if status is "paid" (cash awaiting verification)
    if (payment.status === "verified") {
      throw new Error("Payment already verified");
    }
    
    // Validate amount
    if (!data.amount || data.amount <= 0) {
      throw new Error("Invalid payment amount");
    }
    
    // No maximum limit - user can pay any amount
    
    // Update payment with user-specified amount
    payment.amount = data.amount;
    payment.totalAmount = data.amount; // Override with actual paid amount
    payment.paymentMethod = data.paymentMethod;
    payment.paymentDate = new Date();
    payment.utilityReceipts = data.utilityReceipts || [];
    payment.notes = data.notes;
    
    // Calculate deductions
    const deductions = await paymentCalculationService.calculateRentDeductions(
      data.amount,
      userId,
      payment.landlordId.toString(),
      payment.rentalId.toString()
    );

    // Create revenue source records
    const revenueSourceIds: string[] = [];
    
    if (deductions.subscriptionFee > 0) {
      const subRev = await revenueSourceService.createRevenueSource({
        sourceType: "subscription",
        amount: deductions.subscriptionFee,
        payerId: userId,
        recipientId: "khayalami",
        paymentId: payment._id.toString(),
        rentalId: payment.rentalId.toString(),
        description: `Monthly subscription fee`
      });
      revenueSourceIds.push(subRev._id.toString());
    }

    if (deductions.processingFee > 0) {
      const procRev = await revenueSourceService.createRevenueSource({
        sourceType: "processing_fee",
        amount: deductions.processingFee,
        payerId: userId,
        recipientId: "khayalami",
        paymentId: payment._id.toString(),
        rentalId: payment.rentalId.toString(),
        description: `Processing fee (${(deductions.breakdown.processingFeeRate * 100).toFixed(1)}%)`
      });
      revenueSourceIds.push(procRev._id.toString());
    }

    if (deductions.insurancePremium > 0) {
      const insRev = await revenueSourceService.createRevenueSource({
        sourceType: "insurance_commission",
        amount: deductions.insurancePremium,
        payerId: userId,
        recipientId: "khayalami",
        paymentId: payment._id.toString(),
        rentalId: payment.rentalId.toString(),
        description: `Insurance premium commission`
      });
      revenueSourceIds.push(insRev._id.toString());
    }

    if (data.paymentMethod === "in_app") {
      // In-app payment (gateway will be integrated later)
      payment.status = "verified"; // Auto-verified for in-app
      payment.verifiedAt = new Date();
      payment.gatewayResponse = data.gatewayResponse;
      
      // Add to escrow with "held" status (auto-verified)
      await escrowService.addToEscrow(payment, {
        deductions: {
          subscriptionFee: deductions.subscriptionFee,
          processingFee: deductions.processingFee,
          insurancePremium: deductions.insurancePremium
        },
        revenueSourceIds
      });
      await escrowService.updateEscrowStatus(payment._id.toString(), "held");
    } else {
      // Cash payment - receipt optional, needs verification
      payment.status = "paid";
      payment.proofOfPayment = data.proofOfPayment; // Optional
      
      // Add to escrow with "pending" status (needs verification)
      await escrowService.addToEscrow(payment, {
        deductions: {
          subscriptionFee: deductions.subscriptionFee,
          processingFee: deductions.processingFee,
          insurancePremium: deductions.insurancePremium
        },
        revenueSourceIds
      });
      // Keep as "pending" until landlord verifies
    }
    
    await payment.save();
    
    // Update rental stats
    await this.updateRentalPaymentStats(payment.rentalId.toString());
    
    console.log(`💰 Payment submitted: ${paymentId} - ${data.amount} via ${data.paymentMethod}`);
    
    return payment;
  }
  
  /**
   * Verify payment (landlord confirms cash/bank payment)
   */
  async verifyPayment(
    paymentId: string,
    landlordId: string,
    verificationNotes?: string
  ): Promise<IPayment> {
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      throw new Error("Payment not found");
    }
    
    const landlordIdStr = payment.landlordId.toString();
    const userIdStr = landlordId.toString();
    
    if (landlordIdStr !== userIdStr) {
      throw new Error("Access denied");
    }
    
    if (payment.status !== "paid") {
      throw new Error("Payment must be in 'paid' status to verify");
    }
    
    // Verify payment
    payment.status = "verified";
    payment.verifiedAt = new Date();
    payment.verifiedBy = landlordId as any;
    payment.verificationNotes = verificationNotes;
    
    await payment.save();
    
    // Update escrow status from "pending" to "held" (ready for distribution)
    // Only if payment has rentalId (rent payments, not subscriptions/boosts)
    if (payment.rentalId) {
      await escrowService.updateEscrowStatus(
        paymentId,
        "held",
        landlordId
      );
      
      // Update rental stats
      await this.updateRentalPaymentStats(payment.rentalId.toString());
    }
    
    console.log(`✅ Payment verified by landlord: ${paymentId}`);
    
    return payment;
  }
  
  /**
   * Reject payment (landlord rejects proof)
   */
  async rejectPayment(
    paymentId: string,
    landlordId: string,
    rejectionReason: string
  ): Promise<IPayment> {
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      throw new Error("Payment not found");
    }
    
    const landlordIdStr = payment.landlordId.toString();
    const userIdStr = landlordId.toString();
    
    if (landlordIdStr !== userIdStr) {
      throw new Error("Access denied");
    }
    
    if (payment.status !== "paid") {
      throw new Error("Only 'paid' payments can be rejected");
    }
    
    // Reject payment
    payment.status = "rejected";
    payment.rejectionReason = rejectionReason;
    payment.proofOfPayment = undefined; // Clear invalid proof
    
    await payment.save();
    
    // Remove from pending balance
    await this.removeFromPendingBalance(payment);
    
    console.log(`❌ Payment rejected by landlord: ${paymentId}`);
    
    return payment;
  }
  
  /**
   * Get landlord balance
   */
  async getLandlordBalance(landlordId: string): Promise<any> {
    let balance = await LandlordBalance.findOne({ landlordId });
    
    if (!balance) {
      // Create balance account if doesn't exist
      balance = await LandlordBalance.create({
        landlordId,
        availableBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        transactions: [],
        stats: {
          totalPaymentsReceived: 0,
          totalRentCollected: 0,
          totalDepositsCollected: 0,
          averageMonthlyIncome: 0
        }
      });
    }
    
    return balance;
  }
  
  /**
   * Update bank details
   */
  async updateBankDetails(
    landlordId: string,
    bankDetails: {
      accountName: string;
      accountNumber: string;
      bankName: string;
      branchCode?: string;
    }
  ): Promise<any> {
    const balance = await this.getLandlordBalance(landlordId);
    balance.bankDetails = bankDetails;
    await balance.save();
    
    console.log(`🏦 Bank details updated for landlord: ${landlordId}`);
    
    return balance;
  }
  
  /**
   * Update mobile money details
   */
  async updateMobileMoneyDetails(
    landlordId: string,
    mobileMoneyDetails: {
      provider: "MTN" | "Airtel" | "Vodacom" | "other";
      phoneNumber: string;
      accountName: string;
    }
  ): Promise<any> {
    const balance = await this.getLandlordBalance(landlordId);
    balance.mobileMoneyDetails = mobileMoneyDetails;
    await balance.save();
    
    console.log(`📱 Mobile money details updated for landlord: ${landlordId}`);
    
    return balance;
  }
  
  /**
   * Request withdrawal
   */
  async requestWithdrawal(
    landlordId: string,
    data: {
      amount: number;
      withdrawalMethod: "bank_transfer" | "mobile_money" | "cheque";
    }
  ): Promise<any> {
    const balance = await this.getLandlordBalance(landlordId);
    
    if (data.amount > balance.availableBalance) {
      throw new Error(`Insufficient balance. Available: ${balance.availableBalance}`);
    }
    
    if (data.amount < 100) {
      throw new Error("Minimum withdrawal amount is 100");
    }
    
    // Validate withdrawal method details
    if (data.withdrawalMethod === "bank_transfer" && !balance.bankDetails) {
      throw new Error("Please set up your bank details first");
    }
    
    if (data.withdrawalMethod === "mobile_money" && !balance.mobileMoneyDetails) {
      throw new Error("Please set up your mobile money details first");
    }
    
    // Create withdrawal request
    const withdrawal = await Withdrawal.create({
      landlordId,
      amount: data.amount,
      withdrawalMethod: data.withdrawalMethod,
      bankDetails: data.withdrawalMethod === "bank_transfer" ? balance.bankDetails : undefined,
      mobileMoneyDetails: data.withdrawalMethod === "mobile_money" ? balance.mobileMoneyDetails : undefined,
      status: "pending",
      requestedAt: new Date()
    });
    
    // Deduct from available balance immediately
    balance.addTransaction(
      "withdrawal",
      data.amount,
      `Withdrawal request #${withdrawal._id}`,
      withdrawal._id.toString()
    );
    
    await balance.save();
    
    console.log(`💸 Withdrawal requested: ${data.amount} by landlord: ${landlordId}`);
    
    return withdrawal;
  }
  
  /**
   * Get withdrawal history
   */
  async getWithdrawalHistory(landlordId: string): Promise<any[]> {
    const withdrawals = await Withdrawal.find({ landlordId })
      .sort({ requestedAt: -1 })
      .limit(50);
    
    return withdrawals;
  }
  
  /**
   * Get transaction history
   */
  async getTransactionHistory(landlordId: string, limit: number = 50): Promise<any[]> {
    const balance = await this.getLandlordBalance(landlordId);
    
    return balance.transactions
      .sort((a: any, b: any) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  }
  
  // ============ PRIVATE HELPER METHODS ============
  
  /**
   * Credit landlord balance (for verified/in-app payments)
   */
  private async creditLandlordBalance(payment: IPayment): Promise<void> {
    const landlordId = payment.landlordId.toString();
    const balance = await this.getLandlordBalance(landlordId);
    
    const amount = payment.totalAmount || payment.amount;
    
    balance.addTransaction(
      "credit",
      amount,
      `Payment from tenant - ${payment.paymentType} (${payment.receiptNumber})`,
      payment._id.toString()
    );
    
    // Update stats
    balance.stats.totalPaymentsReceived += 1;
    if (payment.paymentType === "rent") {
      balance.stats.totalRentCollected += amount;
    } else if (payment.paymentType === "deposit") {
      balance.stats.totalDepositsCollected += amount;
    }
    
    await balance.save();
    
    console.log(`💰 Landlord balance credited: ${amount} for payment: ${payment._id}`);
  }
  
  /**
   * Add to pending balance (for unverified manual payments)
   */
  private async addToPendingBalance(payment: IPayment): Promise<void> {
    const landlordId = payment.landlordId.toString();
    const balance = await this.getLandlordBalance(landlordId);
    
    const amount = payment.totalAmount || payment.amount;
    balance.pendingBalance += amount;
    
    await balance.save();
    
    console.log(`⏳ Added to pending balance: ${amount} for payment: ${payment._id}`);
  }
  
  /**
   * Move from pending to available balance
   */
  private async movePendingToAvailable(payment: IPayment): Promise<void> {
    const landlordId = payment.landlordId.toString();
    const balance = await this.getLandlordBalance(landlordId);
    
    const amount = payment.totalAmount || payment.amount;
    
    // Move from pending to available
    balance.pendingBalance -= amount;
    
    balance.addTransaction(
      "credit",
      amount,
      `Payment verified - ${payment.paymentType} (${payment.receiptNumber})`,
      payment._id.toString()
    );
    
    // Update stats
    balance.stats.totalPaymentsReceived += 1;
    if (payment.paymentType === "rent") {
      balance.stats.totalRentCollected += amount;
    } else if (payment.paymentType === "deposit") {
      balance.stats.totalDepositsCollected += amount;
    }
    
    await balance.save();
    
    console.log(`✅ Moved to available balance: ${amount} for payment: ${payment._id}`);
  }
  
  /**
   * Remove from pending balance (when rejected)
   */
  private async removeFromPendingBalance(payment: IPayment): Promise<void> {
    const landlordId = payment.landlordId.toString();
    const balance = await this.getLandlordBalance(landlordId);
    
    const amount = payment.totalAmount || payment.amount;
    balance.pendingBalance -= amount;
    
    await balance.save();
    
    console.log(`❌ Removed from pending balance: ${amount} for payment: ${payment._id}`);
  }
  
  /**
   * Update rental payment stats
   */
  private async updateRentalPaymentStats(rentalId: string): Promise<void> {
    const rental = await Rental.findById(rentalId);
    if (!rental) return;
    
    const payments = await Payment.find({ rentalId });
    
    rental.stats.totalPayments = payments.length;
    rental.stats.paidPayments = payments.filter(p => p.status === "verified").length;
    rental.stats.overduePayments = payments.filter(p => p.status === "overdue").length;
    
    await rental.save();
  }

  /**
   * Admin: Get all payments in the system
   */
  async getAllPayments(
    filters?: {
      status?: string;
      paymentMethod?: string;
      landlordId?: string;
      tenantId?: string;
      rentalId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<IPayment[]> {
    const query: any = {};
    
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.paymentMethod) {
      query.paymentMethod = filters.paymentMethod;
    }
    if (filters?.landlordId) {
      query.landlordId = new mongoose.Types.ObjectId(filters.landlordId);
    }
    if (filters?.tenantId) {
      query.tenantId = new mongoose.Types.ObjectId(filters.tenantId);
    }
    if (filters?.rentalId) {
      query.rentalId = new mongoose.Types.ObjectId(filters.rentalId);
    }
    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }
    
    const payments = await Payment.find(query)
      .populate("landlordId", "firstName lastName email phoneNumber")
      .populate("tenantId", "firstName lastName email phoneNumber")
      .populate("rentalId")
      .populate("propertyId", "title address")
      .populate("agreementId", "title")
      .sort({ createdAt: -1 });
    
    return payments;
  }
}

export const paymentService = new PaymentService();


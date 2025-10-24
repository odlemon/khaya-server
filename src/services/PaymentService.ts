// @ts-nocheck
import { Payment, IPayment } from "../models/Payment";
import { LandlordBalance } from "../models/LandlordBalance";
import { Withdrawal } from "../models/Withdrawal";
import { Rental } from "../models/Rental";
import { CommissionService } from "./CommissionService";

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
    
    // Create NEW payment record
    const newPayment = await Payment.create({
      rentalId: rental._id,
      agreementId: rental.agreementId,
      propertyId: rental.propertyId,
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
    
    // Credit landlord if online payment
    if (data.paymentMethod === "in_app") {
      await this.creditLandlordBalance(newPayment);
      // Record commission for online payment (immediate collection)
      await this.commissionService.recordOnlineCommission(
        rentalId,
        rental.landlordId.toString(),
        rental.tenantId.toString(),
        newPayment._id.toString(),
        data.amount
      );
    } else {
      // Add to pending balance for cash
      await this.addToPendingBalance(newPayment);
      // Record commission for cash payment (debt tracking)
      await this.commissionService.recordCashCommission(
        rentalId,
        rental.landlordId.toString(),
        rental.tenantId.toString(),
        newPayment._id.toString(),
        data.amount
      );
    }
    
    // Update rental stats
    await this.updateRentalPaymentStats(rentalId);
    
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
    
    if (data.paymentMethod === "in_app") {
      // In-app payment (gateway will be integrated later)
      payment.status = "verified"; // Auto-verified for in-app
      payment.verifiedAt = new Date();
      payment.gatewayResponse = data.gatewayResponse;
      
      // Immediately credit landlord for in-app payments
      await this.creditLandlordBalance(payment);
      // Record commission for online payment (immediate collection)
      await this.commissionService.recordOnlineCommission(
        payment.rentalId.toString(),
        payment.landlordId.toString(),
        payment.tenantId.toString(),
        payment._id.toString(),
        data.amount
      );
    } else {
      // Cash payment - receipt optional, needs verification
      payment.status = "paid";
      payment.proofOfPayment = data.proofOfPayment; // Optional
      
      // Add to pending balance (not available until verified)
      await this.addToPendingBalance(payment);
      // Record commission for cash payment (debt tracking)
      await this.commissionService.recordCashCommission(
        payment.rentalId.toString(),
        payment.landlordId.toString(),
        payment.tenantId.toString(),
        payment._id.toString(),
        data.amount
      );
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
    
    // Move from pending to available balance
    await this.movePendingToAvailable(payment);
    
    // Collect any debt when landlord receives online payment
    // This handles the case where landlord gets online payment and we collect their cash payment debts
    const landlordBalance = await this.getLandlordBalance(landlordId);
    if (landlordBalance.availableBalance > 0) {
      await this.commissionService.collectDebt(
        landlordId,
        paymentId,
        landlordBalance.availableBalance
      );
    }
    
    // Update rental stats
    await this.updateRentalPaymentStats(payment.rentalId.toString());
    
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


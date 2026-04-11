// @ts-nocheck
import { EscrowTransaction, IEscrowTransaction } from "../models/Escrow";
import { EscrowAccount, IEscrowAccount } from "../models/Escrow";
import { Payout, IPayout } from "../models/Escrow";
import { Payment, IPayment } from "../models/Payment";
import { LandlordBalance } from "../models/LandlordBalance";
import { LandlordPreferences } from "../models/LandlordPreferences";
import { User } from "../models/User";
import { resolveLandlordPayoutFromBalance } from "../utils/landlordPayoutInstructions";
import { RevenueSource } from "../models/RevenueSource";
import { landlordSubscriptionService } from "./LandlordSubscriptionService";
import { revenueSourceService } from "./RevenueSourceService";
import { emailNotificationService } from "./EmailNotificationService";
import { Types } from "mongoose";

export class EscrowService {
  private readonly COMMISSION_RATE = 0.05; // 5%

  /**
   * Get or create main escrow account
   */
  async getOrCreateEscrowAccount(): Promise<IEscrowAccount> {
    let account = await EscrowAccount.findOne({ accountType: "main" });
    
    if (!account) {
      account = await EscrowAccount.create({
        accountName: "Khayalami Escrow Account",
        accountType: "main",
        totalHeld: 0,
        totalDistributed: 0,
        totalLandlordPayouts: 0,
        totalKhayalamiPayouts: 0,
        totalTransactions: 0,
        pendingTransactions: 0,
        distributedTransactions: 0,
        autoDistributionEnabled: false,
        distributionDay: 1
      });
    }
    
    return account;
  }

  /**
   * Add payment to escrow (called when payment is created/verified)
   */
  async addToEscrow(
    payment: IPayment,
    options?: {
      deductions?: {
        subscriptionFee: number;
        processingFee: number;
        insurancePremium: number;
      };
      revenueSourceIds?: string[];
    }
  ): Promise<IEscrowTransaction> {
    // Calculate amounts
    const totalAmount = payment.totalAmount || payment.amount;
    
    // Use provided deductions or calculate default (5% commission for backward compatibility)
    let deductions = options?.deductions;
    if (!deductions) {
      // Fallback to old commission model if no deductions provided
      const khayalamiAmount = Math.round(totalAmount * this.COMMISSION_RATE * 100) / 100;
      deductions = {
        subscriptionFee: 0,
        processingFee: khayalamiAmount,
        insurancePremium: 0
      };
    }
    
    const totalDeductions = deductions.subscriptionFee + deductions.processingFee + deductions.insurancePremium;
    const khayalamiAmount = totalDeductions;
    const landlordAmount = totalAmount - totalDeductions;

    // Check if escrow transaction already exists
    const existing = await EscrowTransaction.findOne({ paymentId: payment._id });
    if (existing) {
      throw new Error("Escrow transaction already exists for this payment");
    }

    // Create escrow transaction
    const escrowTransaction = await EscrowTransaction.create({
      paymentId: payment._id,
      rentalId: payment.rentalId,
      agreementId: payment.agreementId,
      propertyId: payment.propertyId,
      landlordId: payment.landlordId,
      tenantId: payment.tenantId,
      totalAmount,
      landlordAmount,
      khayalamiAmount,
      deductions: {
        subscriptionFee: deductions.subscriptionFee,
        processingFee: deductions.processingFee,
        insurancePremium: deductions.insurancePremium,
        totalDeductions
      },
      paymentMethod: payment.paymentMethod,
      paymentType: payment.paymentType,
      paymentSource: payment.paymentMethod === "in_app" ? "in_app" : "external_deposit",
      status: payment.status === "verified" ? "held" : "pending",
      receiptNumber: payment.receiptNumber,
      notes: payment.notes,
      verifiedAt: payment.verifiedAt,
      verifiedBy: payment.verifiedBy,
      revenueSourceIds: options?.revenueSourceIds?.map(id => new Types.ObjectId(id)) || []
    });

    // Update escrow account balance
    await this.updateEscrowAccountBalance(totalAmount, "add");

    console.log(`💰 Added to escrow: K${totalAmount} (Landlord: K${landlordAmount}, Khayalami: K${khayalamiAmount})`);

    return escrowTransaction;
  }

  /**
   * Update escrow transaction status (e.g., when payment is verified)
   */
  async updateEscrowStatus(
    paymentId: string,
    status: "pending" | "held" | "distributed" | "cancelled",
    verifiedBy?: string
  ): Promise<IEscrowTransaction> {
    const escrowTransaction = await EscrowTransaction.findOne({ paymentId });
    
    if (!escrowTransaction) {
      throw new Error("Escrow transaction not found");
    }

    const oldStatus = escrowTransaction.status;
    escrowTransaction.status = status;

    if (status === "held" && verifiedBy) {
      escrowTransaction.verifiedAt = new Date();
      escrowTransaction.verifiedBy = new Types.ObjectId(verifiedBy);
    }

    await escrowTransaction.save();

    // Update escrow account stats
    if (oldStatus === "pending" && status === "held") {
      await this.updateEscrowAccountBalance(escrowTransaction.totalAmount, "add");
    }

    return escrowTransaction;
  }

  /**
   * Get escrow account summary
   */
  async getEscrowSummary(): Promise<any> {
    const account = await this.getOrCreateEscrowAccount();
    
    const pendingCount = await EscrowTransaction.countDocuments({ status: "pending" });
    const heldCount = await EscrowTransaction.countDocuments({ status: "held" });
    const distributedCount = await EscrowTransaction.countDocuments({ status: "distributed" });

    // Calculate total held (sum of all held transactions)
    const heldTransactions = await EscrowTransaction.aggregate([
      { $match: { status: { $in: ["pending", "held"] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    const totalHeld = heldTransactions[0]?.total || 0;

    // Calculate pending landlord payouts
    const pendingLandlordPayouts = await EscrowTransaction.aggregate([
      { $match: { status: "held", landlordPayoutStatus: "pending" } },
      { $group: { _id: null, total: { $sum: "$landlordAmount" } } }
    ]);

    // Calculate pending Khayalami payouts
    const pendingKhayalamiPayouts = await EscrowTransaction.aggregate([
      { $match: { status: "held", khayalamiPayoutStatus: "pending" } },
      { $group: { _id: null, total: { $sum: "$khayalamiAmount" } } }
    ]);

    // Calculate total landlord payouts (all-time from Payout collection)
    const totalLandlordPayouts = await Payout.aggregate([
      { $match: { recipientType: "landlord" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    // Calculate total Khayalami payouts (all-time from Payout collection)
    const totalKhayalamiPayouts = await Payout.aggregate([
      { $match: { recipientType: "khayalami" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    return {
      account,
      totalHeld,
      pendingLandlordPayouts: pendingLandlordPayouts[0]?.total || 0,
      pendingKhayalamiPayouts: pendingKhayalamiPayouts[0]?.total || 0,
      totalLandlordPayouts: totalLandlordPayouts[0]?.total || 0,
      totalKhayalamiPayouts: totalKhayalamiPayouts[0]?.total || 0,
      transactionCounts: {
        pending: pendingCount,
        held: heldCount,
        distributed: distributedCount
      }
    };
  }

  /**
   * Get all escrow transactions (Admin)
   */
  async getAllEscrowTransactions(filters?: {
    status?: string;
    landlordId?: string;
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<IEscrowTransaction[]> {
    const query: any = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.landlordId) {
      query.landlordId = new Types.ObjectId(filters.landlordId);
    }

    if (filters?.tenantId) {
      query.tenantId = new Types.ObjectId(filters.tenantId);
    }

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    return await EscrowTransaction.find(query)
      .populate("landlordId", "firstName lastName email")
      .populate("tenantId", "firstName lastName email")
      .populate("propertyId", "title address")
      .populate("paymentId")
      .populate("distributedBy", "firstName lastName email")
      .sort({ createdAt: -1 });
  }

  /**
   * Get escrow transactions for a landlord
   */
  async getLandlordEscrowTransactions(
    landlordId: string,
    filters?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<IEscrowTransaction[]> {
    const query: any = { landlordId: new Types.ObjectId(landlordId) };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    return await EscrowTransaction.find(query)
      .populate("tenantId", "firstName lastName email")
      .populate("propertyId", "title address")
      .populate("paymentId")
      .sort({ createdAt: -1 });
  }

  /**
   * Get all held escrow transactions ready for distribution
   */
  async getHeldTransactionsForDistribution(filters?: {
    landlordId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<IEscrowTransaction[]> {
    const query: any = {
      status: "held",
      landlordPayoutStatus: "pending" // Only get unpaid ones
    };

    if (filters?.landlordId) {
      query.landlordId = new Types.ObjectId(filters.landlordId);
    }

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    // Use lean() and manual populate to avoid filtering out transactions with null references
    const transactions = await EscrowTransaction.find(query)
      .sort({ createdAt: 1 }); // Oldest first
    
    // Populate fields only if they exist (to avoid filtering out transactions)
    // Note: populate won't filter, but we'll populate manually for safety
    for (const transaction of transactions) {
      if (transaction.landlordId) {
        await transaction.populate("landlordId", "firstName lastName email");
      }
      if (transaction.tenantId) {
        await transaction.populate("tenantId", "firstName lastName email");
      }
      if (transaction.propertyId) {
        await transaction.populate("propertyId", "title address");
      }
    }
    
    return transactions;
  }

  /**
   * Distribute escrow funds (monthly or manual)
   */
  async distributeEscrow(
    method: "scheduled" | "manual",
    distributedBy: string,
    filters?: {
      landlordId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    success: boolean;
    totalDistributed: number;
    landlordPayouts: number;
    khayalamiPayouts: number;
    payoutIds: string[];
  }> {
    // Get all held transactions ready for distribution
    const heldTransactions = await this.getHeldTransactionsForDistribution(filters);

    if (heldTransactions.length === 0) {
      return {
        success: true,
        totalDistributed: 0,
        landlordPayouts: 0,
        khayalamiPayouts: 0,
        payoutIds: []
      };
    }

    // Group by landlord
    const landlordGroups = new Map<string, IEscrowTransaction[]>();
    let totalKhayalamiAmount = 0;

    for (const transaction of heldTransactions) {
      // Extract landlordId properly (handle both ObjectId and populated object)
      const landlordId = (transaction.landlordId as any)?._id?.toString?.() 
        ?? (transaction.landlordId as any)?.toString?.() 
        ?? transaction.landlordId?.toString?.();
      
      // Skip transactions with invalid landlordId
      if (!landlordId || landlordId === 'undefined' || landlordId === 'null') {
        console.warn(`⚠️  Skipping transaction ${transaction._id} - invalid landlordId: ${transaction.landlordId}`);
        continue;
      }
      
      if (!landlordGroups.has(landlordId)) {
        landlordGroups.set(landlordId, []);
      }
      landlordGroups.get(landlordId)!.push(transaction);
      
      totalKhayalamiAmount += transaction.khayalamiAmount;
    }

    const payoutIds: string[] = [];
    let totalDistributed = 0;
    let landlordPayoutCount = 0;

    // Create payouts for each landlord
    for (const [landlordId, transactions] of landlordGroups.entries()) {
      // Skip if landlordId is invalid
      if (!landlordId || landlordId === 'undefined' || landlordId === 'null') {
        console.warn(`⚠️  Skipping transactions with invalid landlordId: ${transactions.length} transaction(s)`);
        continue;
      }

      let totalAmount = transactions.reduce((sum, t) => sum + t.landlordAmount, 0);
      
      // Skip if total amount is 0 (no payout needed)
      if (totalAmount <= 0) {
        console.log(`ℹ️  Skipping landlord ${landlordId} - total amount is 0`);
        continue;
      }
      
      const escrowTransactionIds = transactions.map(t => t._id);

      // Get landlord details for payout (for email notification - not required for payout creation)
      const landlord = await User.findById(landlordId);
      if (!landlord) {
        console.warn(`⚠️  Landlord user not found for ID ${landlordId}, but creating payout anyway`);
      }

      // Check landlord subscription payment method
      const preferences = await LandlordPreferences.findOne({ 
        landlordId: new Types.ObjectId(landlordId) 
      });

      let subscriptionFee = 0;
      let subscriptionRevenueSourceId: string | null = null;

      // Only deduct subscriptions if landlord has "Pay via Rent" selected
      // Options: "no_subscription" (no deduction), "pay_yourself" (no deduction), "via_rent" (deduct)
      if (preferences?.subscriptionPaymentMethod === "via_rent") {
        // Check premium features subscription
        const subscriptionStatus = await landlordSubscriptionService.getSubscriptionStatus(landlordId);
        
        if (subscriptionStatus.isSubscribed && subscriptionStatus.planType) {
          // Calculate premium features subscription fee
          const premiumFee = landlordSubscriptionService.calculateSubscriptionPrice(
            subscriptionStatus.planType as "premium" | "premium_plus"
          );

          subscriptionFee += premiumFee;

          // Create revenue source for premium features subscription
          const premiumRev = await revenueSourceService.createRevenueSource({
            sourceType: "subscription",
            amount: premiumFee,
            payerId: landlordId,
            recipientId: "khayalami",
            description: `Landlord premium features subscription (via rent) - ${subscriptionStatus.planType}`,
            notes: `Deducted from rent distribution - ${transactions.length} transaction(s)`
          });

          subscriptionRevenueSourceId = premiumRev._id.toString();

          console.log(`💰 Deducted premium features subscription fee K${premiumFee} from landlord ${landlordId} (via rent)`);
        }

        // Check zero deposit protection subscription
        const zeroDepositStatus = await landlordSubscriptionService.getZeroDepositProtectionStatus(landlordId);
        
        if (zeroDepositStatus.isSubscribed && zeroDepositStatus.subscription) {
          // Calculate zero deposit protection fee
          const zeroDepositFee = zeroDepositStatus.subscription.price || 10;

          subscriptionFee += zeroDepositFee;

          // Create revenue source for zero deposit protection
          const zeroDepositRev = await revenueSourceService.createRevenueSource({
            sourceType: "subscription",
            amount: zeroDepositFee,
            payerId: landlordId,
            recipientId: "khayalami",
            description: `Landlord Zero Deposit Protection subscription (via rent)`,
            notes: `Deducted from rent distribution - ${transactions.length} transaction(s)`
          });

          if (!subscriptionRevenueSourceId) {
            subscriptionRevenueSourceId = zeroDepositRev._id.toString();
          }

          console.log(`💰 Deducted zero deposit protection fee K${zeroDepositFee} from landlord ${landlordId} (via rent)`);
        }

        // Deduct total subscription fees from landlord payout
        if (subscriptionFee > 0) {
          totalAmount -= subscriptionFee;

          // Add to Khayalami total
          totalKhayalamiAmount += subscriptionFee;
        }
      }

      // Get landlord balance for bank / EcoCash / legacy mobile details
      const landlordBalance = await LandlordBalance.findOne({ landlordId });
      const payoutSnap = resolveLandlordPayoutFromBalance(landlordBalance);

      // Create landlord payout (after subscription deduction)
      const landlordPayout = await Payout.create({
        payoutType: "landlord",
        recipientId: new Types.ObjectId(landlordId),
        recipientType: "landlord",
        amount: totalAmount,
        escrowTransactionIds,
        payoutMethod: payoutSnap.payoutMethod,
        bankDetails: payoutSnap.bankDetails,
        mobileMoneyDetails: payoutSnap.mobileMoneyDetails,
        status: "pending",
        distributionBatchId: new Types.ObjectId(), // Same batch ID for this distribution
        notes: subscriptionFee > 0 
          ? `Monthly distribution - ${transactions.length} transaction(s). Subscription fee K${subscriptionFee} deducted.`
          : `Monthly distribution - ${transactions.length} transaction(s)`
      });

      payoutIds.push(landlordPayout._id.toString());

      // Update escrow transactions with payout info
      for (const transaction of transactions) {
        transaction.landlordPayoutId = landlordPayout._id;
        transaction.landlordPayoutStatus = "pending";
        await transaction.save();
      }

      // Credit landlord balance (net amount after subscription deduction)
      // Get or create balance if it doesn't exist
      let balanceToUpdate = landlordBalance;
      if (!balanceToUpdate) {
        // Create balance if it doesn't exist
        balanceToUpdate = await LandlordBalance.create({
          landlordId: new Types.ObjectId(landlordId),
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
        console.log(`✅ Created LandlordBalance for landlord ${landlordId}`);
      }
      
      const creditNote = subscriptionFee > 0
        ? `Escrow distribution - ${transactions.length} payment(s). Subscription fee K${subscriptionFee} deducted.`
        : `Escrow distribution - ${transactions.length} payment(s)`;
      
      balanceToUpdate.addTransaction(
        "credit",
        totalAmount,
        creditNote,
        landlordPayout._id.toString()
      );
      await balanceToUpdate.save();

      // Send email notification to landlord (only if landlord exists)
      if (landlord) {
        try {
          await emailNotificationService.sendDistributionPayout({
            landlordEmail: landlord.email,
            landlordName: `${landlord.firstName} ${landlord.lastName}`,
            amount: totalAmount,
            transactionCount: transactions.length,
            subscriptionFee: subscriptionFee > 0 ? subscriptionFee : undefined,
            payoutId: landlordPayout._id.toString()
          });
          console.log(`✅ Sent distribution email to landlord ${landlord.email}`);
        } catch (emailError: any) {
          console.error(`⚠️  Failed to send email to landlord ${landlord.email}:`, emailError.message);
          // Don't fail distribution if email fails
        }
      } else {
        console.log(`⚠️  Skipped email notification for landlord ${landlordId} - user not found`);
      }

      totalDistributed += totalAmount;
      landlordPayoutCount++;
    }

    // Separate insurance premiums from Khayalami amount for insurance partner payout
    let totalInsuranceAmount = 0;
    for (const transaction of heldTransactions) {
      totalInsuranceAmount += transaction.deductions?.insurancePremium || 0;
    }

    // Remove insurance from Khayalami total (insurance goes to insurance partner, not Khayalami)
    const khayalamiNet = totalKhayalamiAmount - totalInsuranceAmount;

    // Create insurance partner payout (if any insurance premiums collected)
    if (totalInsuranceAmount > 0) {
      const insurancePayout = await Payout.create({
        payoutType: "khayalami",
        recipientType: "khayalami",
        amount: totalInsuranceAmount,
        escrowTransactionIds: heldTransactions.filter(t => (t.deductions?.insurancePremium || 0) > 0).map(t => t._id),
        payoutMethod: "internal_transfer",
        status: "pending",
        distributionBatchId: new Types.ObjectId(),
        notes: `Insurance premium distribution - ${heldTransactions.length} transaction(s). To be remitted to insurance partner.`
      });
      payoutIds.push(insurancePayout._id.toString());
      console.log(`🛡️  Insurance partner payout created: K${totalInsuranceAmount}`);
    }

    // Create Khayalami payout (platform commissions, excluding insurance premiums)
    if (khayalamiNet > 0) {
      const khayalamiPayout = await Payout.create({
        payoutType: "khayalami",
        recipientType: "khayalami",
        amount: khayalamiNet,
        escrowTransactionIds: heldTransactions.map(t => t._id),
        payoutMethod: "internal_transfer",
        status: "pending",
        distributionBatchId: new Types.ObjectId(),
        notes: `Monthly commission distribution - ${heldTransactions.length} transaction(s) (insurance premiums excluded)`
      });

      payoutIds.push(khayalamiPayout._id.toString());
    }

    // Mark all held transactions as distributed
    for (const transaction of heldTransactions) {
      transaction.khayalamiPayoutStatus = "pending";
      transaction.status = "distributed";
      transaction.distributedAt = new Date();
      transaction.distributedBy = new Types.ObjectId(distributedBy);
      transaction.distributionMethod = method;
      await transaction.save();
    }

    // Update escrow account
    const account = await this.getOrCreateEscrowAccount();
    const totalDistributedAmount = totalDistributed + totalKhayalamiAmount;
    
    // Decrease totalHeld by the amount distributed
    account.totalHeld = Math.max(0, account.totalHeld - totalDistributedAmount);
    account.totalDistributed += totalDistributedAmount;
    account.totalLandlordPayouts += totalDistributed;
    account.totalKhayalamiPayouts += totalKhayalamiAmount;
    account.distributedTransactions += heldTransactions.length;
    account.pendingTransactions = Math.max(0, account.pendingTransactions - heldTransactions.length);
    account.lastDistributionDate = new Date();
    account.lastDistributionAmount = totalDistributedAmount;
    account.lastDistributionMethod = method;
    await account.save();

    if (totalInsuranceAmount > 0) {
      console.log(`✅ Escrow distributed: K${totalDistributed} to ${landlordPayoutCount} landlords, K${khayalamiNet} to Khayalami, K${totalInsuranceAmount} to insurance partner`);
    } else {
      console.log(`✅ Escrow distributed: K${totalDistributed} to ${landlordPayoutCount} landlords, K${khayalamiNet} to Khayalami`);
    }

    return {
      success: true,
      totalDistributed: totalDistributed + totalKhayalamiAmount,
      landlordPayouts: landlordPayoutCount,
      khayalamiPayouts: 1,
      payoutIds
    };
  }

  /**
   * Update escrow account balance
   */
  private async updateEscrowAccountBalance(amount: number, operation: "add" | "subtract"): Promise<void> {
    const account = await this.getOrCreateEscrowAccount();
    
    if (operation === "add") {
      account.totalHeld += amount;
      account.totalTransactions += 1;
      account.pendingTransactions += 1;
    } else {
      account.totalHeld -= amount;
      if (account.totalHeld < 0) account.totalHeld = 0;
    }

    // Update monthly tracking
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    const monthlyIndex = account.monthlyHeld.findIndex(
      m => m.year === year && m.month === month
    );

    if (monthlyIndex >= 0) {
      if (operation === "add") {
        account.monthlyHeld[monthlyIndex].amount += amount;
      } else {
        account.monthlyHeld[monthlyIndex].amount -= amount;
      }
    } else if (operation === "add") {
      account.monthlyHeld.push({ year, month, amount });
    }

    await account.save();
  }

  /**
   * Get distribution statistics
   */
  async getDistributionStats(filters?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    const query: any = { status: "distributed" };

    if (filters?.startDate || filters?.endDate) {
      query.distributedAt = {};
      if (filters.startDate) query.distributedAt.$gte = filters.startDate;
      if (filters.endDate) query.distributedAt.$lte = filters.endDate;
    }

    const stats = await EscrowTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalDistributed: { $sum: "$totalAmount" },
          totalLandlordAmount: { $sum: "$landlordAmount" },
          totalKhayalamiAmount: { $sum: "$khayalamiAmount" },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    return stats[0] || {
      totalDistributed: 0,
      totalLandlordAmount: 0,
      totalKhayalamiAmount: 0,
      transactionCount: 0
    };
  }
}

export const escrowService = new EscrowService();



// @ts-nocheck
import { Payment, IPayment } from "../models/Payment";
import { RevenueSource, IRevenueSource } from "../models/RevenueSource";
import { EscrowTransaction, IEscrowTransaction } from "../models/Escrow";
import { PaymentRequest, IPaymentRequest } from "../models/PaymentRequest";
import { Types } from "mongoose";

export class TransactionService {
  /**
   * Get all transactions (admin view)
   * Includes: rent payments, subscriptions, boosts, processing fees, etc.
   */
  async getAllTransactions(filters?: {
    type?: "rent" | "subscription" | "boost" | "processing_fee" | "agreement_fee" | "insurance_commission" | "service_fee" | "all";
    status?: string;
    landlordId?: string;
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    const transactions: any[] = [];

    // Get rent payments (from EscrowTransactions - these are rent payments in escrow)
    const escrowQuery: any = {};
    if (filters?.landlordId) escrowQuery.landlordId = new Types.ObjectId(filters.landlordId);
    if (filters?.tenantId) escrowQuery.tenantId = new Types.ObjectId(filters.tenantId);
    if (filters?.status) escrowQuery.status = filters.status;
    if (filters?.startDate || filters?.endDate) {
      escrowQuery.createdAt = {};
      if (filters.startDate) escrowQuery.createdAt.$gte = filters.startDate;
      if (filters.endDate) escrowQuery.createdAt.$lte = filters.endDate;
    }

    if (!filters?.type || filters.type === "all" || filters.type === "rent") {
      const escrowTransactions = await EscrowTransaction.find(escrowQuery)
        .populate("landlordId", "firstName lastName email")
        .populate("tenantId", "firstName lastName email")
        .populate("propertyId", "title address")
        .populate("paymentId")
        .sort({ createdAt: -1 })
        .lean();

      for (const escrow of escrowTransactions) {
        transactions.push({
          _id: escrow._id,
          transactionType: "rent_payment",
          transactionCategory: "rent",
          paymentId: escrow.paymentId,
          rentalId: escrow.rentalId,
          propertyId: escrow.propertyId,
          landlordId: escrow.landlordId,
          tenantId: escrow.tenantId,
          amount: escrow.totalAmount,
          landlordAmount: escrow.landlordAmount,
          khayalamiAmount: escrow.khayalamiAmount,
          deductions: escrow.deductions,
          paymentMethod: escrow.paymentMethod,
          paymentType: escrow.paymentType,
          status: escrow.status,
          createdAt: escrow.createdAt,
          distributedAt: escrow.distributedAt,
          description: `Rent payment - ${escrow.paymentType || "rent"}`,
          source: "escrow"
        });
      }
    }

    // Get revenue sources (subscriptions, boosts, fees, etc.)
    const revenueQuery: any = {};
    if (filters?.landlordId) revenueQuery.payerId = new Types.ObjectId(filters.landlordId);
    if (filters?.tenantId) revenueQuery.payerId = new Types.ObjectId(filters.tenantId);
    if (filters?.status) revenueQuery.status = filters.status;
    if (filters?.startDate || filters?.endDate) {
      revenueQuery.createdAt = {};
      if (filters.startDate) revenueQuery.createdAt.$gte = filters.startDate;
      if (filters.endDate) revenueQuery.createdAt.$lte = filters.endDate;
    }

    // Filter by source type if specified
    if (filters?.type && filters.type !== "all" && filters.type !== "rent") {
      if (filters.type === "subscription") {
        revenueQuery.sourceType = { $in: ["subscription"] };
      } else if (filters.type === "boost") {
        revenueQuery.sourceType = "premium_boost";
      } else {
        revenueQuery.sourceType = filters.type;
      }
    }

    const revenueSources = await RevenueSource.find(revenueQuery)
      .populate("payerId", "firstName lastName email role")
      .populate("recipientId")
      .populate("propertyId", "title address")
      .populate("paymentId")
      .sort({ createdAt: -1 })
      .lean();

    for (const revenue of revenueSources) {
      // Determine transaction type based on sourceType
      let transactionType = "revenue";
      let transactionCategory = revenue.sourceType;
      let description = "";

      switch (revenue.sourceType) {
        case "subscription":
          // Check if it's tenant subscription or landlord subscription
          const payer = revenue.payerId as any;
          if (payer?.role === "landlord") {
            transactionType = "landlord_subscription";
            transactionCategory = "subscription";
            description = `Landlord subscription - ${revenue.description || "Premium features"}`;
          } else {
            transactionType = "tenant_subscription";
            transactionCategory = "subscription";
            description = `Tenant subscription - ${revenue.description || "Zero deposit access"}`;
          }
          break;
        case "premium_boost":
          transactionType = "premium_boost";
          transactionCategory = "boost";
          description = `Premium boost - ${revenue.propertyId ? (revenue.propertyId as any).title : "Property"}`;
          break;
        case "processing_fee":
          transactionType = "processing_fee";
          transactionCategory = "fee";
          description = `Processing fee - ${revenue.description || "Rent processing"}`;
          break;
        case "agreement_fee":
          transactionType = "agreement_fee";
          transactionCategory = "fee";
          description = `Agreement processing fee`;
          break;
        case "insurance_commission":
          transactionType = "insurance_commission";
          transactionCategory = "commission";
          description = `Insurance commission`;
          break;
        case "service_fee":
          transactionType = "service_fee";
          transactionCategory = "fee";
          description = `Service fee`;
          break;
        default:
          transactionType = "revenue";
          transactionCategory = revenue.sourceType;
          description = revenue.description || "Revenue";
      }

      transactions.push({
        _id: revenue._id,
        transactionType,
        transactionCategory,
        revenueSourceId: revenue._id,
        paymentId: revenue.paymentId,
        propertyId: revenue.propertyId,
        payerId: revenue.payerId,
        recipientId: revenue.recipientId,
        amount: revenue.amount,
        sourceType: revenue.sourceType,
        status: revenue.status,
        createdAt: revenue.createdAt,
        distributedAt: revenue.distributedAt,
        description,
        source: "revenue"
      });
    }

    // Sort all transactions by date (newest first)
    transactions.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return transactions;
  }

  /**
   * Get transaction summary (totals by type)
   */
  async getTransactionSummary(filters?: {
    startDate?: Date;
    endDate?: Date;
    landlordId?: string;
    tenantId?: string;
  }): Promise<any> {
    const transactions = await this.getAllTransactions({
      type: "all",
      ...filters
    });

    const summary = {
      total: transactions.length,
      totalAmount: 0,
      byType: {
        rent_payment: { count: 0, amount: 0 },
        landlord_subscription: { count: 0, amount: 0 },
        tenant_subscription: { count: 0, amount: 0 },
        premium_boost: { count: 0, amount: 0 },
        processing_fee: { count: 0, amount: 0 },
        agreement_fee: { count: 0, amount: 0 },
        insurance_commission: { count: 0, amount: 0 },
        service_fee: { count: 0, amount: 0 }
      },
      byStatus: {
        pending: { count: 0, amount: 0 },
        held: { count: 0, amount: 0 },
        distributed: { count: 0, amount: 0 },
        collected: { count: 0, amount: 0 }
      }
    };

    for (const transaction of transactions) {
      // Get amount - escrow transactions use totalAmount, revenue sources use amount
      const amount = transaction.amount || transaction.totalAmount || 0;
      summary.totalAmount += amount;

      // Count by type
      if (summary.byType[transaction.transactionType as keyof typeof summary.byType]) {
        summary.byType[transaction.transactionType as keyof typeof summary.byType].count++;
        summary.byType[transaction.transactionType as keyof typeof summary.byType].amount += amount;
      }

      // Count by status
      const status = transaction.status || "pending";
      if (summary.byStatus[status as keyof typeof summary.byStatus]) {
        summary.byStatus[status as keyof typeof summary.byStatus].count++;
        summary.byStatus[status as keyof typeof summary.byStatus].amount += amount;
      }
    }

    return summary;
  }
}

export const transactionService = new TransactionService();


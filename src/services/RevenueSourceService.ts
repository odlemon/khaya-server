// @ts-nocheck
import { RevenueSource, IRevenueSource } from "../models/RevenueSource";
import { Types } from "mongoose";

export class RevenueSourceService {
  /**
   * Create a revenue source record
   */
  async createRevenueSource(data: {
    sourceType: "subscription" | "agreement_fee" | "processing_fee" | "premium_boost" | "insurance_commission" | "service_fee";
    amount: number;
    payerId: string;
    recipientId: string | "khayalami";
    paymentId?: string;
    rentalId?: string;
    subscriptionId?: string;
    propertyId?: string;
    description?: string;
    notes?: string;
    status?: "pending" | "collected" | "distributed"; // Optional status, defaults to "pending"
  }): Promise<IRevenueSource> {
    const revenueSource = await RevenueSource.create({
      sourceType: data.sourceType,
      amount: data.amount,
      payerId: new Types.ObjectId(data.payerId),
      recipientId: data.recipientId === "khayalami" ? "khayalami" : new Types.ObjectId(data.recipientId),
      paymentId: data.paymentId ? new Types.ObjectId(data.paymentId) : undefined,
      rentalId: data.rentalId ? new Types.ObjectId(data.rentalId) : undefined,
      subscriptionId: data.subscriptionId ? new Types.ObjectId(data.subscriptionId) : undefined,
      propertyId: data.propertyId ? new Types.ObjectId(data.propertyId) : undefined,
      status: data.status || "pending", // Use provided status or default to "pending"
      description: data.description,
      notes: data.notes
    });

    return revenueSource;
  }

  /**
   * Link revenue source to escrow transaction
   */
  async linkToEscrowTransaction(
    revenueSourceId: string,
    escrowTransactionId: string
  ): Promise<void> {
    await RevenueSource.findByIdAndUpdate(revenueSourceId, {
      escrowTransactionId: new Types.ObjectId(escrowTransactionId),
      status: "collected"
    });
  }

  /**
   * Get revenue by source type
   */
  async getRevenueBySource(
    sourceType: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
    }
  ): Promise<number> {
    const query: any = { sourceType };

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    const result = await RevenueSource.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    return result[0]?.total || 0;
  }

  /**
   * Get revenue by period
   */
  async getRevenueByPeriod(startDate: Date, endDate: Date): Promise<any> {
    const revenue = await RevenueSource.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$sourceType",
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    return revenue;
  }

  /**
   * Mark revenue source as distributed
   */
  async markAsDistributed(revenueSourceId: string, payoutId: string): Promise<void> {
    await RevenueSource.findByIdAndUpdate(revenueSourceId, {
      status: "distributed",
      distributedAt: new Date(),
      payoutId: new Types.ObjectId(payoutId)
    });
  }
}

export const revenueSourceService = new RevenueSourceService();


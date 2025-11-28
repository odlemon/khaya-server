// @ts-nocheck
import { escrowService } from "./EscrowService";
import { revenueSourceService } from "./RevenueSourceService";
import { EscrowAccount, EscrowTransaction } from "../models/Escrow";
import { logger } from "../utils/logger";
import { Types } from "mongoose";

export class DistributionService {
  /**
   * Run monthly distribution (scheduled job)
   */
  async runMonthlyDistribution(): Promise<void> {
    try {
      logger.info("🔄 Starting monthly escrow distribution...");

      // Get escrow account settings
      const account = await EscrowAccount.findOne({ accountType: "main" });
      
      if (!account) {
        logger.warn("⚠️ Escrow account not found. Skipping distribution.");
        return;
      }

      if (!account.autoDistributionEnabled) {
        logger.info("ℹ️ Auto-distribution is disabled. Skipping.");
        return;
      }

      // Check if it's the right day for distribution
      const today = new Date();
      const distributionDay = account.distributionDay || 1;

      // Check if it's the distribution day
      if (today.getDate() !== distributionDay) {
        logger.info(`ℹ️ Not distribution day (today: ${today.getDate()}, scheduled: ${distributionDay}). Skipping.`);
        return;
      }

      // Check if already distributed this month
      if (account.lastDistributionDate) {
        const lastDist = new Date(account.lastDistributionDate);
        if (lastDist.getMonth() === today.getMonth() && 
            lastDist.getFullYear() === today.getFullYear()) {
          logger.info("ℹ️ Already distributed this month. Skipping.");
          return;
        }
      }

      // Calculate date range (last distribution date or start of previous month)
      const startDate = account.lastDistributionDate || 
        new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endDate = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of previous month

      logger.info(`📅 Distributing escrow from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Run distribution
      const result = await escrowService.distributeEscrow(
        "scheduled",
        "system", // System user ID
        {
          startDate,
          endDate
        }
      );

      // Mark revenue sources as distributed
      await this.markRevenueSourcesAsDistributed(result.payoutIds);

      logger.info(`✅ Monthly distribution completed: K${result.totalDistributed} distributed to ${result.landlordPayouts} landlords and Khayalami`);

    } catch (error: any) {
      logger.error("❌ Error running monthly distribution:", error);
      throw error;
    }
  }

  /**
   * Run manual distribution (admin triggered)
   */
  async runManualDistribution(adminId: string, filters?: {
    landlordId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    success: boolean;
    totalDistributed: number;
    landlordPayouts: number;
    khayalamiPayouts: number;
    payoutIds: string[];
  }> {
    try {
      logger.info(`🔄 Starting manual escrow distribution by admin ${adminId}...`);

      // Run distribution
      const result = await escrowService.distributeEscrow(
        "manual",
        adminId,
        filters
      );

      // Mark revenue sources as distributed
      await this.markRevenueSourcesAsDistributed(result.payoutIds);

      logger.info(`✅ Manual distribution completed: K${result.totalDistributed} distributed to ${result.landlordPayouts} landlords and Khayalami`);

      return result;
    } catch (error: any) {
      logger.error("❌ Error running manual distribution:", error);
      throw error;
    }
  }

  /**
   * Mark revenue sources as distributed after payout
   */
  private async markRevenueSourcesAsDistributed(payoutIds: string[]): Promise<void> {
    try {
      // Get all escrow transactions for these payouts
      const transactions = await EscrowTransaction.find({
        $or: [
          { landlordPayoutId: { $in: payoutIds.map(id => new Types.ObjectId(id)) } },
          { khayalamiPayoutId: { $in: payoutIds.map(id => new Types.ObjectId(id)) } }
        ]
      });

      // Get all revenue source IDs from transactions
      const revenueSourceIds: string[] = [];
      for (const transaction of transactions) {
        if (transaction.revenueSourceIds && transaction.revenueSourceIds.length > 0) {
          revenueSourceIds.push(...transaction.revenueSourceIds.map(id => id.toString()));
        }
      }

      // Mark revenue sources as distributed
      for (const revenueSourceId of revenueSourceIds) {
        // Find the payout ID that contains this revenue source
        const transaction = transactions.find(t => 
          t.revenueSourceIds?.some(id => id.toString() === revenueSourceId)
        );
        
        if (transaction) {
          const payoutId = transaction.khayalamiPayoutId || transaction.landlordPayoutId;
          if (payoutId) {
            await revenueSourceService.markAsDistributed(revenueSourceId, payoutId.toString());
          }
        }
      }

      logger.info(`✅ Marked ${revenueSourceIds.length} revenue sources as distributed`);
    } catch (error: any) {
      logger.error("❌ Error marking revenue sources as distributed:", error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Check and run distribution if needed (call this from cron job)
   */
  async checkAndDistribute(): Promise<void> {
    try {
      await this.runMonthlyDistribution();
    } catch (error: any) {
      logger.error("❌ Distribution check failed:", error);
    }
  }
}

export const distributionService = new DistributionService();


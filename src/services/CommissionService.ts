import Commission, { ICommission } from "../models/Commission";
import { v4 as uuidv4 } from "uuid";

export class CommissionService {
  /**
   * Calculate commission amount for any transaction
   */
  calculateCommission(amount: number, rate: number = 0.05): number {
    return Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Record commission for online payment (immediate collection)
   */
  async recordOnlineCommission(
    rentalId: string,
    landlordId: string,
    tenantId: string,
    paymentId: string,
    totalAmount: number,
    commissionRate: number = 0.05
  ): Promise<ICommission> {
    const commissionAmount = this.calculateCommission(totalAmount, commissionRate);
    const transactionId = uuidv4();

    const commission = new Commission({
      transactionId,
      rentalId,
      landlordId,
      tenantId,
      paymentId,
      totalAmount,
      commissionRate,
      commissionAmount,
      paymentMethod: "in_app",
      commissionStatus: "collected",
      isDebt: false,
      debtAmount: 0,
      debtPaid: true,
      collectedAt: new Date(),
      collectedFromPaymentId: paymentId
    });

    return await commission.save();
  }

  /**
   * Record commission for cash payment (debt tracking)
   */
  async recordCashCommission(
    rentalId: string,
    landlordId: string,
    tenantId: string,
    paymentId: string,
    totalAmount: number,
    commissionRate: number = 0.05
  ): Promise<ICommission> {
    const commissionAmount = this.calculateCommission(totalAmount, commissionRate);
    const transactionId = uuidv4();

    const commission = new Commission({
      transactionId,
      rentalId,
      landlordId,
      tenantId,
      paymentId,
      totalAmount,
      commissionRate,
      commissionAmount,
      paymentMethod: "cash",
      commissionStatus: "owed",
      isDebt: true,
      debtAmount: commissionAmount,
      debtPaid: false
    });

    return await commission.save();
 }

  /**
   * Get landlord's total debt (what they owe us)
   */
  async getLandlordDebt(landlordId: string): Promise<number> {
    const debtCommissions = await Commission.find({
      landlordId,
      isDebt: true,
      debtPaid: false
    });

    return debtCommissions.reduce((total, commission) => total + commission.debtAmount, 0);
  }

  /**
   * Get landlord's debt breakdown
   */
  async getLandlordDebtBreakdown(landlordId: string): Promise<ICommission[]> {
    return await Commission.find({
      landlordId,
      isDebt: true,
      debtPaid: false
    }).sort({ createdAt: -1 });
  }

  /**
   * Collect debt when landlord receives online payment
   */
  async collectDebt(
    landlordId: string,
    paymentId: string,
    amount: number
  ): Promise<{ collected: number; remaining: number }> {
    // Get all unpaid debts for this landlord
    const unpaidDebts = await Commission.find({
      landlordId,
      isDebt: true,
      debtPaid: false
    }).sort({ createdAt: 1 }); // Oldest first

    let collected = 0;
    let remaining = amount;

    for (const debt of unpaidDebts) {
      if (remaining <= 0) break;

      const debtToCollect = Math.min(debt.debtAmount, remaining);
      
      // Update debt record
      debt.debtPaid = true;
      debt.debtPaidAt = new Date();
      debt.collectedFromPaymentId = paymentId;
      debt.commissionStatus = "collected";
      debt.collectedAt = new Date();
      
      await debt.save();
      
      collected += debtToCollect;
      remaining -= debtToCollect;
    }

    return { collected, remaining };
  }

  /**
   * Get Khayalami's total earnings
   */
  async getKhayalamiEarnings(filters?: {
    startDate?: Date;
    endDate?: Date;
    paymentMethod?: "in_app" | "cash";
    commissionStatus?: "collected" | "owed" | "pending";
  }): Promise<{ totalEarnings: number; commissions: ICommission[] }> {
    const query: any = {};

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    if (filters?.paymentMethod) {
      query.paymentMethod = filters.paymentMethod;
    }

    if (filters?.commissionStatus) {
      query.commissionStatus = filters.commissionStatus;
    }

    const commissions = await Commission.find(query).sort({ createdAt: -1 });
    
    const totalEarnings = commissions.reduce((total, commission) => {
      if (commission.commissionStatus === "collected") {
        return total + commission.commissionAmount;
      }
      return total;
    }, 0);

    return { totalEarnings, commissions };
  }

  /**
   * Get commission summary for admin dashboard
   */
  async getCommissionSummary(): Promise<{
    totalEarnings: number;
    totalDebts: number;
    collectedThisMonth: number;
    owedThisMonth: number;
    topLandlords: Array<{ landlordId: string; totalDebt: number }>;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total earnings (collected)
    const totalEarnings = await Commission.aggregate([
      { $match: { commissionStatus: "collected" } },
      { $group: { _id: null, total: { $sum: "$commissionAmount" } } }
    ]);

    // Total debts (owed)
    const totalDebts = await Commission.aggregate([
      { $match: { isDebt: true, debtPaid: false } },
      { $group: { _id: null, total: { $sum: "$debtAmount" } } }
    ]);

    // This month's collected
    const collectedThisMonth = await Commission.aggregate([
      { 
        $match: { 
          commissionStatus: "collected",
          collectedAt: { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: "$commissionAmount" } } }
    ]);

    // This month's owed
    const owedThisMonth = await Commission.aggregate([
      { 
        $match: { 
          isDebt: true,
          debtPaid: false,
          createdAt: { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: "$debtAmount" } } }
    ]);

    // Top landlords by debt
    const topLandlords = await Commission.aggregate([
      { $match: { isDebt: true, debtPaid: false } },
      { 
        $group: { 
          _id: "$landlordId", 
          totalDebt: { $sum: "$debtAmount" } 
        } 
      },
      { $sort: { totalDebt: -1 } },
      { $limit: 10 }
    ]);

    return {
      totalEarnings: totalEarnings[0]?.total || 0,
      totalDebts: totalDebts[0]?.total || 0,
      collectedThisMonth: collectedThisMonth[0]?.total || 0,
      owedThisMonth: owedThisMonth[0]?.total || 0,
      topLandlords: topLandlords.map(landlord => ({
        landlordId: landlord._id,
        totalDebt: landlord.totalDebt
      }))
    };
  }

  /**
   * Get all commissions with filters
   */
  async getAllCommissions(filters?: {
    landlordId?: string;
    paymentMethod?: "in_app" | "cash";
    commissionStatus?: "collected" | "owed" | "pending";
    isDebt?: boolean;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ICommission[]> {
    const query: any = {};

    if (filters?.landlordId) query.landlordId = filters.landlordId;
    if (filters?.paymentMethod) query.paymentMethod = filters.paymentMethod;
    if (filters?.commissionStatus) query.commissionStatus = filters.commissionStatus;
    if (filters?.isDebt !== undefined) query.isDebt = filters.isDebt;

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    return await Commission.find(query).sort({ createdAt: -1 });
  }
}

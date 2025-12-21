//@ts-nocheck
import { Payment, IPayment } from "../models/Payment";
import { LandlordBalance } from "../models/LandlordBalance";
import { Rental } from "../models/Rental";
import { Agreement } from "../models/Agreement";
import { Property } from "../models/Property";
import { CommissionService } from "./CommissionService";
import { EscrowTransaction } from "../models/Escrow";
import { LandlordPreferences } from "../models/LandlordPreferences";
import { RevenueSource } from "../models/RevenueSource";
import { landlordSubscriptionService } from "./LandlordSubscriptionService";
import { Types } from "mongoose";

export class LandlordDashboardService {
  private commissionService = new CommissionService();

  /**
   * Get comprehensive landlord dashboard data
   */
  async getLandlordDashboard(landlordId: string): Promise<any> {
    try {
      // Get all data in parallel for better performance
      const [
        balance,
        totalProperties,
        activeRentals,
        totalAgreements,
        recentPayments,
        paymentStats,
        commissionData,
        monthlyEarnings,
        propertyPerformance
      ] = await Promise.all([
        this.getLandlordBalance(landlordId),
        this.getTotalProperties(landlordId),
        this.getActiveRentals(landlordId),
        this.getTotalAgreements(landlordId),
        this.getRecentPayments(landlordId),
        this.getPaymentStats(landlordId),
        this.getCommissionData(landlordId),
        this.getMonthlyEarnings(landlordId),
        this.getPropertyPerformance(landlordId)
      ]);

      return {
        // Balance information
        balance: {
          availableBalance: balance.availableBalance,
          pendingBalance: balance.pendingBalance,
          totalEarnings: balance.totalEarnings,
          totalWithdrawn: balance.totalWithdrawn,
          bankDetails: balance.bankDetails,
          mobileMoneyDetails: balance.mobileMoneyDetails
        },

        // Property metrics
        properties: {
          total: totalProperties,
          activeRentals: activeRentals.length,
          totalAgreements: totalAgreements
        },

        // Payment breakdown by method
        earnings: {
          totalEarnings: paymentStats.totalEarnings,
          onlineEarnings: paymentStats.onlineEarnings,
          cashEarnings: paymentStats.cashEarnings,
          onlinePayments: paymentStats.onlinePayments,
          cashPayments: paymentStats.cashPayments,
          averageOnlinePayment: paymentStats.averageOnlinePayment,
          averageCashPayment: paymentStats.averageCashPayment
        },

        // Commission data
        commission: {
          totalDebt: commissionData.totalDebt,
          debtBreakdown: commissionData.debtBreakdown,
          commissionRate: 0.05, // 5%
          totalCommissionOwed: commissionData.totalDebt
        },

        // Monthly trends
        monthlyTrends: monthlyEarnings,

        // Property performance
        propertyPerformance,

        // Recent activity
        recentActivity: {
          recentPayments: recentPayments.slice(0, 10),
          activeRentals: activeRentals.slice(0, 5)
        },

        // Statistics
        stats: {
          totalTransactions: paymentStats.totalTransactions,
          verifiedTransactions: paymentStats.verifiedTransactions,
          pendingTransactions: paymentStats.pendingTransactions,
          overdueTransactions: paymentStats.overdueTransactions,
          averageMonthlyEarnings: monthlyEarnings.length > 0 ? 
            monthlyEarnings.reduce((sum, month) => sum + month.earnings, 0) / monthlyEarnings.length : 0
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to get landlord dashboard: ${error.message}`);
    }
  }

  /**
   * Get landlord balance
   */
  private async getLandlordBalance(landlordId: string): Promise<any> {
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
   * Get total properties
   */
  private async getTotalProperties(landlordId: string): Promise<number> {
    return await Property.countDocuments({ landlordId: new Types.ObjectId(landlordId) });
  }

  /**
   * Get active rentals
   */
  private async getActiveRentals(landlordId: string): Promise<any[]> {
    return await Rental.find({ 
      landlordId: new Types.ObjectId(landlordId),
      status: "active"
    })
    .populate("tenantId", "firstName lastName email phoneNumber")
    .populate("propertyId", "title address")
    .populate("agreementId", "title startDate endDate")
    .sort({ createdAt: -1 });
  }

  /**
   * Get total agreements
   */
  private async getTotalAgreements(landlordId: string): Promise<number> {
    return await Agreement.countDocuments({ landlordId: new Types.ObjectId(landlordId) });
  }

  /**
   * Get recent payments
   */
  private async getRecentPayments(landlordId: string): Promise<any[]> {
    return await Payment.find({ landlordId: new Types.ObjectId(landlordId) })
      .populate("tenantId", "firstName lastName email")
      .populate("propertyId", "title address")
      .sort({ createdAt: -1 })
      .limit(20);
  }

  /**
   * Get payment statistics
   */
  private async getPaymentStats(landlordId: string): Promise<any> {
    const payments = await Payment.find({ landlordId: new Types.ObjectId(landlordId) });

    const onlinePayments = payments.filter(p => p.paymentMethod === "in_app");
    const cashPayments = payments.filter(p => p.paymentMethod === "cash");

    const totalEarnings = payments.reduce((sum, p) => sum + (p.totalAmount || p.amount), 0);
    const onlineEarnings = onlinePayments.reduce((sum, p) => sum + (p.totalAmount || p.amount), 0);
    const cashEarnings = cashPayments.reduce((sum, p) => sum + (p.totalAmount || p.amount), 0);

    return {
      totalEarnings,
      onlineEarnings,
      cashEarnings,
      onlinePayments: onlinePayments.length,
      cashPayments: cashPayments.length,
      averageOnlinePayment: onlinePayments.length > 0 ? onlineEarnings / onlinePayments.length : 0,
      averageCashPayment: cashPayments.length > 0 ? cashEarnings / cashPayments.length : 0,
      totalTransactions: payments.length,
      verifiedTransactions: payments.filter(p => p.status === "verified").length,
      pendingTransactions: payments.filter(p => p.status === "paid").length,
      overdueTransactions: payments.filter(p => p.status === "overdue").length
    };
  }

  /**
   * Get commission data
   */
  private async getCommissionData(landlordId: string): Promise<any> {
    const totalDebt = await this.commissionService.getLandlordDebt(landlordId);
    const debtBreakdown = await this.commissionService.getLandlordDebtBreakdown(landlordId);

    return {
      totalDebt,
      debtBreakdown
    };
  }

  /**
   * Get monthly earnings (last 12 months)
   */
  private async getMonthlyEarnings(landlordId: string): Promise<any[]> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const result = await Payment.aggregate([
      { 
        $match: { 
          landlordId: new Types.ObjectId(landlordId),
          status: "verified",
          verifiedAt: { $gte: twelveMonthsAgo }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: "$verifiedAt" },
            month: { $month: "$verifiedAt" }
          },
          earnings: { $sum: "$amount" },
          onlineEarnings: {
            $sum: { $cond: [{ $eq: ["$paymentMethod", "in_app"] }, "$amount", 0] }
          },
          cashEarnings: {
            $sum: { $cond: [{ $eq: ["$paymentMethod", "cash"] }, "$amount", 0] }
          },
          transactionCount: { $sum: 1 },
          onlineCount: {
            $sum: { $cond: [{ $eq: ["$paymentMethod", "in_app"] }, 1, 0] }
          },
          cashCount: {
            $sum: { $cond: [{ $eq: ["$paymentMethod", "cash"] }, 1, 0] }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    return result.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      earnings: item.earnings,
      onlineEarnings: item.onlineEarnings,
      cashEarnings: item.cashEarnings,
      transactionCount: item.transactionCount,
      onlineCount: item.onlineCount,
      cashCount: item.cashCount
    }));
  }

  /**
   * Get property performance
   */
  private async getPropertyPerformance(landlordId: string): Promise<any[]> {
    const result = await Payment.aggregate([
      { 
        $match: { 
          landlordId: new Types.ObjectId(landlordId),
          status: "verified"
        } 
      },
      {
        $group: {
          _id: "$propertyId",
          totalEarnings: { $sum: "$amount" },
          transactionCount: { $sum: 1 },
          onlineEarnings: {
            $sum: { $cond: [{ $eq: ["$paymentMethod", "in_app"] }, "$amount", 0] }
          },
          cashEarnings: {
            $sum: { $cond: [{ $eq: ["$paymentMethod", "cash"] }, "$amount", 0] }
          }
        }
      },
      { $sort: { totalEarnings: -1 } }
    ]);

    // Get property details for each performance record
    const propertyPerformance = await Promise.all(
      result.map(async (item) => {
        const property = await Property.findById(item._id)
          .select("title address propertyType rentAmount");
        
        return {
          propertyId: item._id,
          propertyTitle: property?.title || "Unknown Property",
          propertyAddress: property?.address || "Unknown Address",
          propertyType: property?.propertyType || "Unknown",
          rentAmount: property?.rentAmount || 0,
          totalEarnings: item.totalEarnings,
          transactionCount: item.transactionCount,
          onlineEarnings: item.onlineEarnings,
          cashEarnings: item.cashEarnings
        };
      })
    );

    return propertyPerformance;
  }

  /**
   * Get earnings breakdown by property for a landlord
   * Uses escrow transactions to show actual distributed amounts only
   */
  async getEarningsByProperty(landlordId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    try {
      // Build query for escrow transactions - only distributed ones
      const query: any = {
        landlordId: new Types.ObjectId(landlordId),
        status: "distributed" // Only show distributed earnings
      };

      // Filter by date range (use distributedAt for distributed transactions)
      if (filters?.startDate || filters?.endDate) {
        query.distributedAt = {};
        if (filters.startDate) query.distributedAt.$gte = filters.startDate;
        if (filters.endDate) query.distributedAt.$lte = filters.endDate;
      }

      // Aggregate escrow transactions by property
      const result = await EscrowTransaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$propertyId",
            // Total amounts (what tenant paid)
            totalAmount: { $sum: "$totalAmount" },
            // Landlord amounts (what landlord receives after deductions)
            totalLandlordAmount: { $sum: "$landlordAmount" },
            // Khayalami amounts (commissions/fees)
            totalKhayalamiAmount: { $sum: "$khayalamiAmount" },
            // Deductions breakdown
            totalSubscriptionFees: { $sum: "$deductions.subscriptionFee" },
            totalProcessingFees: { $sum: "$deductions.processingFee" },
            totalInsurancePremiums: { $sum: "$deductions.insurancePremium" },
            totalDeductions: { $sum: "$deductions.totalDeductions" },
            // Transaction counts
            transactionCount: { $sum: 1 },
            // All transactions are distributed (filtered in query)
            distributedCount: { $sum: 1 },
            // Payment method breakdown
            onlineAmount: {
              $sum: { $cond: [{ $eq: ["$paymentMethod", "in_app"] }, "$totalAmount", 0] }
            },
            cashAmount: {
              $sum: { $cond: [{ $eq: ["$paymentMethod", "cash"] }, "$totalAmount", 0] }
            },
            onlineLandlordAmount: {
              $sum: { $cond: [{ $eq: ["$paymentMethod", "in_app"] }, "$landlordAmount", 0] }
            },
            cashLandlordAmount: {
              $sum: { $cond: [{ $eq: ["$paymentMethod", "cash"] }, "$landlordAmount", 0] }
            },
            onlineCount: {
              $sum: { $cond: [{ $eq: ["$paymentMethod", "in_app"] }, 1, 0] }
            },
            cashCount: {
              $sum: { $cond: [{ $eq: ["$paymentMethod", "cash"] }, 1, 0] }
            }
          }
        },
        { $sort: { totalLandlordAmount: -1 } }
      ]);

      // Get property details and enrich the data
      const earningsByProperty = await Promise.all(
        result.map(async (item) => {
          const property = await Property.findById(item._id)
            .populate("landlordId", "firstName lastName email")
            .select("title address propertyType rentAmount bedrooms bathrooms");

          // Get active rental for this property
          const activeRental = await Rental.findOne({
            propertyId: item._id,
            landlordId: new Types.ObjectId(landlordId),
            status: "active"
          })
            .populate("tenantId", "firstName lastName email")
            .select("monthlyRent startDate endDate status");

          return {
            propertyId: item._id,
            property: {
              title: property?.title || "Unknown Property",
              address: property?.address || "Unknown Address",
              propertyType: property?.propertyType || "Unknown",
              rentAmount: property?.rentAmount || 0,
              bedrooms: property?.bedrooms,
              bathrooms: property?.bathrooms
            },
            activeRental: activeRental ? {
              monthlyRent: activeRental.monthlyRent,
              startDate: activeRental.startDate,
              endDate: activeRental.endDate,
              tenant: activeRental.tenantId ? {
                name: `${(activeRental.tenantId as any).firstName} ${(activeRental.tenantId as any).lastName}`,
                email: (activeRental.tenantId as any).email
              } : null
            } : null,
            earnings: {
              // Total amounts (what tenants paid)
              totalAmount: item.totalAmount || 0,
              // Net amounts (what landlord receives)
              totalLandlordAmount: item.totalLandlordAmount || 0,
              // Deductions
              totalDeductions: item.totalDeductions || 0,
              deductionsBreakdown: {
                subscriptionFees: item.totalSubscriptionFees || 0,
                processingFees: item.totalProcessingFees || 0,
                insurancePremiums: item.totalInsurancePremiums || 0
              },
              // Khayalami commission/fees
              totalKhayalamiAmount: item.totalKhayalamiAmount || 0
            },
            paymentMethodBreakdown: {
              online: {
                totalAmount: item.onlineAmount || 0,
                landlordAmount: item.onlineLandlordAmount || 0,
                count: item.onlineCount || 0
              },
              cash: {
                totalAmount: item.cashAmount || 0,
                landlordAmount: item.cashLandlordAmount || 0,
                count: item.cashCount || 0
              }
            },
            transactionStats: {
              total: item.transactionCount || 0,
              distributed: item.distributedCount || 0
            }
          };
        })
      );

      return earningsByProperty;
    } catch (error: any) {
      throw new Error(`Failed to get earnings by property: ${error.message}`);
    }
  }

  /**
   * Get list of properties that have zero deposit protection package enabled
   */
  async getProtectionPackageData(landlordId: string): Promise<any> {
    try {
      // Get all properties with zero deposit available
      const propertiesWithProtection = await Property.find({
        landlordId: new Types.ObjectId(landlordId),
        zeroDepositAvailable: true
      })
        .select("_id title address propertyType rentAmount deposit status zeroDepositAvailable createdAt")
        .sort({ createdAt: -1 });

      // Return simple list of properties
      return propertiesWithProtection.map(prop => ({
        propertyId: prop._id,
        title: prop.title,
        address: prop.address,
        propertyType: prop.propertyType,
        rentAmount: prop.rentAmount,
        deposit: prop.deposit,
        status: prop.status,
        zeroDepositAvailable: prop.zeroDepositAvailable,
        createdAt: prop.createdAt
      }));
    } catch (error: any) {
      throw new Error(`Failed to get protection package data: ${error.message}`);
    }
  }
}

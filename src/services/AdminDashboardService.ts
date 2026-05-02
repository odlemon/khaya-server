// @ts-nocheck
import { User } from "../models/User";
import { Property } from "../models/Property";
import { Agreement } from "../models/Agreement";
import { Rental } from "../models/Rental";
import { Payment } from "../models/Payment";
import { ServiceBooking } from "../models/ServiceBooking";
import { Connection } from "../models/Connection";
import { Chat } from "../models/Chat";
import { CommissionService } from "./CommissionService";
import { Types } from "mongoose";
import { NOT_ADMIN_TERMINATED } from "../constants/userQueries";

export class AdminDashboardService {
  private commissionService = new CommissionService();
  
  /**
   * Get comprehensive admin dashboard metrics
   */
  async getDashboardMetrics(): Promise<any> {
    try {
      // Get all counts in parallel for better performance
      const [
        totalUsers,
        totalLandlords,
        totalTenants,
        totalProperties,
        totalAgreements,
        totalRentals,
        totalPayments,
        totalServices,
        totalConnections,
        totalChats,
        recentUsers,
        recentAgreements,
        recentPayments,
        recentServices,
        activeRentals,
        pendingConnections,
        overduePayments,
        pendingServices,
        completedServices,
        totalRevenue,
        monthlyRevenue,
        userGrowth,
        agreementStats,
        paymentStats,
        serviceStats,
        commissionSummary
      ] = await Promise.all([
        // Basic counts
        User.countDocuments({ ...NOT_ADMIN_TERMINATED }),
        User.countDocuments({ role: "landlord", ...NOT_ADMIN_TERMINATED }),
        User.countDocuments({ role: "tenant", ...NOT_ADMIN_TERMINATED }),
        Property.countDocuments(),
        Agreement.countDocuments(),
        Rental.countDocuments(),
        Payment.countDocuments(),
        ServiceBooking.countDocuments(),
        Connection.countDocuments(),
        Chat.countDocuments(),
        
        // Recent activity (last 30 days)
        User.find({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          ...NOT_ADMIN_TERMINATED,
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .select("firstName lastName email role createdAt"),
        
        Agreement.find({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
          .populate("landlordId", "firstName lastName")
          .populate("tenantId", "firstName lastName")
          .populate("propertyId", "title")
          .sort({ createdAt: -1 })
          .limit(10),
        
        Payment.find({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
          .populate("landlordId", "firstName lastName")
          .populate("tenantId", "firstName lastName")
          .sort({ createdAt: -1 })
          .limit(10),
        
        ServiceBooking.find({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
          .populate("landlordId", "firstName lastName")
          .populate("tenantId", "firstName lastName")
          .sort({ createdAt: -1 })
          .limit(10),
        
        // Active rentals
        Rental.find({ status: "active" })
          .populate("landlordId", "firstName lastName")
          .populate("tenantId", "firstName lastName")
          .populate("propertyId", "title address")
          .sort({ createdAt: -1 }),
        
        // Pending connections
        Connection.find({ status: "pending" })
          .populate("tenantId", "firstName lastName")
          .populate("landlordId", "firstName lastName")
          .populate("propertyId", "title")
          .sort({ createdAt: -1 }),
        
        // Overdue payments
        Payment.find({ status: "overdue" })
          .populate("landlordId", "firstName lastName")
          .populate("tenantId", "firstName lastName")
          .populate("propertyId", "title")
          .sort({ dueDate: 1 }),
        
        // Pending services
        ServiceBooking.find({ status: "pending_landlord_approval" })
          .populate("landlordId", "firstName lastName")
          .populate("tenantId", "firstName lastName")
          .populate("propertyId", "title")
          .sort({ createdAt: -1 }),
        
        // Completed services
        ServiceBooking.find({ status: "completed" })
          .populate("landlordId", "firstName lastName")
          .populate("tenantId", "firstName lastName")
          .populate("propertyId", "title")
          .sort({ completedDate: -1 }),
        
        // Revenue calculations
        this.calculateTotalRevenue(),
        this.calculateMonthlyRevenue(),
        this.calculateUserGrowth(),
        this.calculateAgreementStats(),
        this.calculatePaymentStats(),
        this.calculateServiceStats(),
        this.commissionService.getCommissionSummary(),
        this.calculateChartData()
      ]);

      const [
        revenueChart,
        commissionChart,
        userGrowthChart,
        paymentMethodChart,
        serviceTypeChart,
        monthlyTrends
      ] = await Promise.all([
        this.calculateRevenueChart(),
        this.calculateCommissionChart(),
        this.calculateUserGrowthChart(),
        this.calculatePaymentMethodChart(),
        this.calculateServiceTypeChart(),
        this.calculateMonthlyTrends()
      ]);

      return {
        overview: {
          totalUsers,
          totalLandlords,
          totalTenants,
          totalProperties,
          totalAgreements,
          totalRentals,
          totalPayments,
          totalServices,
          totalConnections,
          totalChats,
          // Commission metrics
          totalCommissions: commissionSummary.totalEarnings,
          totalDebts: commissionSummary.totalDebts,
          collectedThisMonth: commissionSummary.collectedThisMonth,
          owedThisMonth: commissionSummary.owedThisMonth
        },
        recentActivity: {
          recentUsers,
          recentAgreements,
          recentPayments,
          recentServices
        },
        activeData: {
          activeRentals,
          pendingConnections,
          overduePayments,
          pendingServices,
          completedServices
        },
        financial: {
          totalRevenue,
          monthlyRevenue,
          commissionSummary,
          // Additional commission metrics
          commissionRate: 0.05, // 5% commission rate
          averageCommissionPerTransaction: commissionSummary.totalEarnings / totalPayments || 0,
          debtCollectionRate: commissionSummary.totalEarnings / (commissionSummary.totalEarnings + commissionSummary.totalDebts) || 0
        },
        analytics: {
          userGrowth,
          agreementStats,
          paymentStats,
          serviceStats
        },
        charts: {
          revenueChart,
          commissionChart,
          userGrowthChart,
          paymentMethodChart,
          serviceTypeChart,
          monthlyTrends
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to get dashboard metrics: ${error.message}`);
    }
  }

  /**
   * Calculate total revenue from all verified payments
   */
  private async calculateTotalRevenue(): Promise<number> {
    const result = await Payment.aggregate([
      { $match: { status: "verified" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Calculate monthly revenue for current month
   */
  private async calculateMonthlyRevenue(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const result = await Payment.aggregate([
      { 
        $match: { 
          status: "verified",
          verifiedAt: { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Calculate user growth over last 6 months
   */
  private async calculateUserGrowth(): Promise<any[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const result = await User.aggregate([
      { $match: { $and: [{ createdAt: { $gte: sixMonthsAgo } }, NOT_ADMIN_TERMINATED] } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 },
          landlords: {
            $sum: { $cond: [{ $eq: ["$role", "landlord"] }, 1, 0] }
          },
          tenants: {
            $sum: { $cond: [{ $eq: ["$role", "tenant"] }, 1, 0] }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    
    return result;
  }

  /**
   * Calculate agreement statistics
   */
  private async calculateAgreementStats(): Promise<any> {
    const stats = await Agreement.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    
    const statusCounts = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});
    
    return {
      byStatus: statusCounts,
      total: Object.values(statusCounts).reduce((sum: number, count: number) => sum + count, 0)
    };
  }

  /**
   * Calculate payment statistics
   */
  private async calculatePaymentStats(): Promise<any> {
    const stats = await Payment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);
    
    const statusCounts = stats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        totalAmount: stat.totalAmount
      };
      return acc;
    }, {});
    
    return {
      byStatus: statusCounts,
      total: Object.values(statusCounts).reduce((sum: any, stat: any) => sum + stat.count, 0)
    };
  }

  /**
   * Calculate service statistics
   */
  private async calculateServiceStats(): Promise<any> {
    const stats = await ServiceBooking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    
    const statusCounts = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});
    
    return {
      byStatus: statusCounts,
      total: Object.values(statusCounts).reduce((sum: number, count: number) => sum + count, 0)
    };
  }

  /**
   * Calculate revenue chart data (last 12 months)
   */
  private async calculateRevenueChart(): Promise<any> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const result = await Payment.aggregate([
      { 
        $match: { 
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
          totalRevenue: { $sum: "$amount" },
          transactionCount: { $sum: 1 },
          averageTransaction: { $avg: "$amount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    return result.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      revenue: item.totalRevenue,
      transactions: item.transactionCount,
      averageTransaction: Math.round(item.averageTransaction * 100) / 100
    }));
  }

  /**
   * Calculate commission chart data (last 12 months)
   */
  private async calculateCommissionChart(): Promise<any> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const result = await Payment.aggregate([
      { 
        $match: { 
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
          totalRevenue: { $sum: "$amount" },
          onlinePayments: {
            $sum: { $cond: [{ $eq: ["$paymentMethod", "in_app"] }, "$amount", 0] }
          },
          cashPayments: {
            $sum: { $cond: [{ $eq: ["$paymentMethod", "cash"] }, "$amount", 0] }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    return result.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      totalRevenue: item.totalRevenue,
      onlineRevenue: item.onlinePayments,
      cashRevenue: item.cashPayments,
      onlineCommission: Math.round(item.onlinePayments * 0.05 * 100) / 100,
      cashCommission: Math.round(item.cashPayments * 0.05 * 100) / 100,
      totalCommission: Math.round((item.onlinePayments + item.cashPayments) * 0.05 * 100) / 100
    }));
  }

  /**
   * Calculate user growth chart data (last 12 months)
   */
  private async calculateUserGrowthChart(): Promise<any> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const result = await User.aggregate([
      { $match: { $and: [{ createdAt: { $gte: twelveMonthsAgo } }, NOT_ADMIN_TERMINATED] } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          totalUsers: { $sum: 1 },
          landlords: {
            $sum: { $cond: [{ $eq: ["$role", "landlord"] }, 1, 0] }
          },
          tenants: {
            $sum: { $cond: [{ $eq: ["$role", "tenant"] }, 1, 0] }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    return result.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      totalUsers: item.totalUsers,
      landlords: item.landlords,
      tenants: item.tenants
    }));
  }

  /**
   * Calculate payment method distribution
   */
  private async calculatePaymentMethodChart(): Promise<any> {
    const result = await Payment.aggregate([
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          averageAmount: { $avg: "$amount" }
        }
      }
    ]);

    return result.map(item => ({
      method: item._id,
      count: item.count,
      totalAmount: item.totalAmount,
      averageAmount: Math.round(item.averageAmount * 100) / 100,
      commission: Math.round(item.totalAmount * 0.05 * 100) / 100
    }));
  }

  /**
   * Calculate service type distribution
   */
  private async calculateServiceTypeChart(): Promise<any> {
    const result = await ServiceBooking.aggregate([
      {
        $group: {
          _id: "$serviceType",
          count: { $sum: 1 },
          totalCost: { $sum: "$estimatedCost" },
          averageCost: { $avg: "$estimatedCost" }
        }
      }
    ]);

    return result.map(item => ({
      serviceType: item._id,
      count: item.count,
      totalCost: item.totalCost || 0,
      averageCost: Math.round((item.averageCost || 0) * 100) / 100
    }));
  }

  /**
   * Calculate monthly trends (last 6 months)
   */
  private async calculateMonthlyTrends(): Promise<any> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const [userTrends, paymentTrends, serviceTrends] = await Promise.all([
      // User trends
      User.aggregate([
        { $match: { $and: [{ createdAt: { $gte: sixMonthsAgo } }, NOT_ADMIN_TERMINATED] } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            newUsers: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),
      
      // Payment trends
      Payment.aggregate([
        { 
          $match: { 
            status: "verified",
            verifiedAt: { $gte: sixMonthsAgo }
          } 
        },
        {
          $group: {
            _id: {
              year: { $year: "$verifiedAt" },
              month: { $month: "$verifiedAt" }
            },
            totalRevenue: { $sum: "$amount" },
            transactionCount: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),
      
      // Service trends
      ServiceBooking.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            totalServices: { $sum: 1 },
            completedServices: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
            }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ])
    ]);

    return {
      userGrowth: userTrends.map(item => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        newUsers: item.newUsers
      })),
      revenueGrowth: paymentTrends.map(item => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        revenue: item.totalRevenue,
        transactions: item.transactionCount
      })),
      serviceGrowth: serviceTrends.map(item => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        totalServices: item.totalServices,
        completedServices: item.completedServices
      }))
    };
  }

  /**
   * Calculate chart data (placeholder for backward compatibility)
   */
  private async calculateChartData(): Promise<any> {
    return {};
  }
}

export const adminDashboardService = new AdminDashboardService();




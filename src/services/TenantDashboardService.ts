// @ts-nocheck
import { User } from "../models/User";
import { Rental } from "../models/Rental";
import { Agreement } from "../models/Agreement";
import { Payment } from "../models/Payment";
import { ServiceBooking } from "../models/ServiceBooking";
import { MaintenanceRequest } from "../models/MaintenanceRequest";
import { Chat } from "../models/Chat";
import { Property } from "../models/Property";
import { Types } from "mongoose";

export class TenantDashboardService {
  /**
   * Get essential tenant dashboard data
   */
  async getTenantDashboard(tenantId: string): Promise<any> {
    try {
      const [
        currentRental,
        paymentStats,
        serviceStats,
        maintenanceStats,
        chatStats,
        profileCompletion
      ] = await Promise.all([
        this.getCurrentRental(tenantId),
        this.getPaymentStats(tenantId),
        this.getServiceStats(tenantId),
        this.getMaintenanceStats(tenantId),
        this.getChatStats(tenantId),
        this.getProfileCompletion(tenantId)
      ]);

      return {
        // Current rental
        rental: currentRental ? {
          property: currentRental.property,
          landlord: currentRental.landlord,
          monthlyRent: currentRental.monthlyRent,
          nextPaymentDue: currentRental.nextPaymentDue,
          status: currentRental.status
        } : null,

        // Payment summary
        payments: {
          totalPaid: paymentStats.totalPaid,
          monthlySpending: paymentStats.monthlySpending,
          pendingPayments: paymentStats.pendingPayments,
          overduePayments: paymentStats.overduePayments,
          paymentRate: paymentStats.paymentRate
        },

        // Service summary
        services: {
          totalServices: serviceStats.totalServices,
          completedServices: serviceStats.completedServices,
          pendingServices: serviceStats.pendingServices,
          totalSpent: serviceStats.totalSpent
        },

        // Maintenance summary
        maintenance: {
          totalRequests: maintenanceStats.totalRequests,
          completedRequests: maintenanceStats.completedRequests,
          pendingRequests: maintenanceStats.pendingRequests
        },

        // Communication
        communication: {
          activeChats: chatStats.activeChats,
          unreadMessages: chatStats.unreadMessages
        },

        // Profile
        profile: {
          completion: profileCompletion.percentage,
          isVerified: await this.isTenantVerified(tenantId),
          missing: profileCompletion.missing
        }
      };
    } catch (error) {
      console.error("Error getting tenant dashboard:", error);
      throw error;
    }
  }

  /**
   * Get current rental information
   */
  private async getCurrentRental(tenantId: string): Promise<any> {
    const rental = await Rental.findOne({ 
      tenantId: new Types.ObjectId(tenantId), 
      status: "active" 
    })
    .populate("propertyId", "title address images")
    .populate("landlordId", "firstName lastName email phone")
    .populate("agreementId", "rentAmount depositAmount startDate endDate");

    if (!rental) return null;

    return {
      _id: rental._id,
      property: rental.propertyId,
      landlord: rental.landlordId,
      agreement: rental.agreementId,
      status: rental.status,
      startDate: rental.startDate,
      endDate: rental.endDate,
      monthlyRent: rental.monthlyRent,
      depositAmount: rental.depositAmount,
      nextPaymentDue: rental.nextPaymentDue,
      moveInConfirmed: rental.moveInConfirmed,
      stats: rental.stats
    };
  }

  /**
   * Get active agreements
   */
  private async getActiveAgreements(tenantId: string): Promise<any[]> {
    return await Agreement.find({ 
      tenantId: new Types.ObjectId(tenantId), 
      status: "active" 
    })
    .populate("propertyId", "title address")
    .populate("landlordId", "firstName lastName")
    .sort({ createdAt: -1 });
  }

  /**
   * Get payment statistics
   */
  private async getPaymentStats(tenantId: string): Promise<any> {
    const totalPayments = await Payment.countDocuments({ 
      tenantId: new Types.ObjectId(tenantId) 
    });

    const paidPayments = await Payment.countDocuments({ 
      tenantId: new Types.ObjectId(tenantId),
      status: "verified"
    });

    const pendingPayments = await Payment.countDocuments({ 
      tenantId: new Types.ObjectId(tenantId),
      status: "pending"
    });

    const overduePayments = await Payment.countDocuments({ 
      tenantId: new Types.ObjectId(tenantId),
      status: "overdue"
    });

    const totalPaid = await Payment.aggregate([
      { $match: { tenantId: new Types.ObjectId(tenantId), status: "verified" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const monthlySpending = await Payment.aggregate([
      { 
        $match: { 
          tenantId: new Types.ObjectId(tenantId), 
          status: "verified",
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        } 
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    return {
      totalPayments,
      paidPayments,
      pendingPayments,
      overduePayments,
      totalPaid: totalPaid[0]?.total || 0,
      monthlySpending: monthlySpending[0]?.total || 0,
      paymentRate: totalPayments > 0 ? (paidPayments / totalPayments) * 100 : 0
    };
  }

  /**
   * Get recent payments
   */
  private async getRecentPayments(tenantId: string): Promise<any[]> {
    return await Payment.find({ 
      tenantId: new Types.ObjectId(tenantId) 
    })
    .populate("landlordId", "firstName lastName")
    .populate("rentalId", "propertyId")
    .sort({ createdAt: -1 })
    .limit(10);
  }

  /**
   * Get upcoming payments
   */
  private async getUpcomingPayments(tenantId: string): Promise<any[]> {
    const currentDate = new Date();
    const nextWeek = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    return await Payment.find({
      tenantId: new Types.ObjectId(tenantId),
      status: "pending",
      dueDate: { $gte: currentDate, $lte: nextWeek }
    })
    .populate("landlordId", "firstName lastName")
    .populate("rentalId", "propertyId")
    .sort({ dueDate: 1 });
  }

  /**
   * Get overdue payments
   */
  private async getOverduePayments(tenantId: string): Promise<any[]> {
    return await Payment.find({
      tenantId: new Types.ObjectId(tenantId),
      status: "overdue"
    })
    .populate("landlordId", "firstName lastName")
    .populate("rentalId", "propertyId")
    .sort({ dueDate: 1 });
  }

  /**
   * Get service statistics
   */
  private async getServiceStats(tenantId: string): Promise<any> {
    const totalServices = await ServiceBooking.countDocuments({ 
      tenantId: new Types.ObjectId(tenantId) 
    });

    const completedServices = await ServiceBooking.countDocuments({ 
      tenantId: new Types.ObjectId(tenantId),
      status: "completed"
    });

    const pendingServices = await ServiceBooking.countDocuments({ 
      tenantId: new Types.ObjectId(tenantId),
      status: { $in: ["pending", "pending_landlord_approval", "approved", "scheduled"] }
    });

    const totalSpent = await ServiceBooking.aggregate([
      { $match: { tenantId: new Types.ObjectId(tenantId), status: "completed" } },
      { $group: { _id: null, total: { $sum: "$finalCost" } } }
    ]);

    return {
      totalServices,
      completedServices,
      pendingServices,
      totalSpent: totalSpent[0]?.total || 0,
      completionRate: totalServices > 0 ? (completedServices / totalServices) * 100 : 0
    };
  }

  /**
   * Get recent services
   */
  private async getRecentServices(tenantId: string): Promise<any[]> {
    return await ServiceBooking.find({ 
      tenantId: new Types.ObjectId(tenantId) 
    })
    .populate("landlordId", "firstName lastName")
    .populate("rentalId", "propertyId")
    .sort({ createdAt: -1 })
    .limit(10);
  }

  /**
   * Get pending services
   */
  private async getPendingServices(tenantId: string): Promise<any[]> {
    return await ServiceBooking.find({ 
      tenantId: new Types.ObjectId(tenantId),
      status: { $in: ["pending", "pending_landlord_approval", "approved", "scheduled"] }
    })
    .populate("landlordId", "firstName lastName")
    .populate("rentalId", "propertyId")
    .sort({ createdAt: -1 });
  }

  /**
   * Get maintenance statistics
   */
  private async getMaintenanceStats(tenantId: string): Promise<any> {
    const totalRequests = await MaintenanceRequest.countDocuments({ 
      tenantId: new Types.ObjectId(tenantId) 
    });

    const completedRequests = await MaintenanceRequest.countDocuments({ 
      tenantId: new Types.ObjectId(tenantId),
      status: "completed"
    });

    const pendingRequests = await MaintenanceRequest.countDocuments({ 
      tenantId: new Types.ObjectId(tenantId),
      status: { $in: ["pending", "approved", "awaiting_vendor", "vendor_assigned", "in_progress"] }
    });

    return {
      totalRequests,
      completedRequests,
      pendingRequests,
      completionRate: totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0
    };
  }

  /**
   * Get recent maintenance requests
   */
  private async getRecentMaintenance(tenantId: string): Promise<any[]> {
    return await MaintenanceRequest.find({ 
      tenantId: new Types.ObjectId(tenantId) 
    })
    .populate("propertyId", "title address")
    .populate("landlordId", "firstName lastName")
    .sort({ createdAt: -1 })
    .limit(10);
  }

  /**
   * Get pending maintenance requests
   */
  private async getPendingMaintenance(tenantId: string): Promise<any[]> {
    return await MaintenanceRequest.find({ 
      tenantId: new Types.ObjectId(tenantId),
      status: { $in: ["pending", "approved", "awaiting_vendor", "vendor_assigned", "in_progress"] }
    })
    .populate("propertyId", "title address")
    .populate("landlordId", "firstName lastName")
    .sort({ createdAt: -1 });
  }

  /**
   * Get chat statistics
   */
  private async getChatStats(tenantId: string): Promise<any> {
    const activeChats = await Chat.countDocuments({ 
      participants: new Types.ObjectId(tenantId),
      isActive: true
    });

    const unreadMessages = await Chat.aggregate([
      { $match: { participants: new Types.ObjectId(tenantId), isActive: true } },
      { $unwind: "$messages" },
      { $match: { "messages.readBy": { $ne: new Types.ObjectId(tenantId) } } },
      { $count: "unreadCount" }
    ]);

    return {
      activeChats,
      unreadMessages: unreadMessages[0]?.unreadCount || 0
    };
  }

  /**
   * Get recent chats
   */
  private async getRecentChats(tenantId: string): Promise<any[]> {
    return await Chat.find({ 
      participants: new Types.ObjectId(tenantId),
      isActive: true
    })
    .populate("participants", "firstName lastName role")
    .populate("propertyId", "title address")
    .populate("messages.senderId", "firstName lastName")
    .sort({ updatedAt: -1 })
    .limit(5);
  }

  /**
   * Get profile completion status
   */
  private async getProfileCompletion(tenantId: string): Promise<any> {
    const user = await User.findById(tenantId);
    if (!user) return { percentage: 0, missing: [] };

    const missing = [];
    let completed = 0;
    const total = 8;

    // Check required fields
    if (user.firstName) completed++; else missing.push("First Name");
    if (user.lastName) completed++; else missing.push("Last Name");
    if (user.email) completed++; else missing.push("Email");
    if (user.phone) completed++; else missing.push("Phone");
    if (user.profile?.avatar) completed++; else missing.push("Profile Picture");
    if (user.profile?.address) completed++; else missing.push("Address");
    if (user.profile?.dateOfBirth) completed++; else missing.push("Date of Birth");
    if (user.isVerified) completed++; else missing.push("Account Verification");

    return {
      percentage: Math.round((completed / total) * 100),
      completed,
      total,
      missing
    };
  }

  /**
   * Get financial summary
   */
  private async getFinancialSummary(tenantId: string): Promise<any> {
    const currentMonth = new Date();
    currentMonth.setDate(1);

    const monthlyPayments = await Payment.aggregate([
      { 
        $match: { 
          tenantId: new Types.ObjectId(tenantId), 
          status: "verified",
          createdAt: { $gte: currentMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const yearlyPayments = await Payment.aggregate([
      { 
        $match: { 
          tenantId: new Types.ObjectId(tenantId), 
          status: "verified",
          createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) }
        } 
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const averageMonthly = await Payment.aggregate([
      { 
        $match: { 
          tenantId: new Types.ObjectId(tenantId), 
          status: "verified"
        } 
      },
      { 
        $group: { 
          _id: { 
            year: { $year: "$createdAt" }, 
            month: { $month: "$createdAt" } 
          },
          total: { $sum: "$amount" }
        }
      },
      { $group: { _id: null, average: { $avg: "$total" } } }
    ]);

    return {
      monthlySpending: monthlyPayments[0]?.total || 0,
      yearlySpending: yearlyPayments[0]?.total || 0,
      averageMonthly: averageMonthly[0]?.average || 0
    };
  }

  /**
   * Get recent activity
   */
  private async getRecentActivity(tenantId: string): Promise<any[]> {
    const activities = [];

    // Recent payments
    const recentPayments = await Payment.find({ 
      tenantId: new Types.ObjectId(tenantId) 
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("amount status createdAt");

    recentPayments.forEach(payment => {
      activities.push({
        type: "payment",
        description: `Payment of K${payment.amount} ${payment.status}`,
        date: payment.createdAt,
        status: payment.status
      });
    });

    // Recent services
    const recentServices = await ServiceBooking.find({ 
      tenantId: new Types.ObjectId(tenantId) 
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("serviceType status createdAt");

    recentServices.forEach(service => {
      activities.push({
        type: "service",
        description: `${service.serviceType} service ${service.status}`,
        date: service.createdAt,
        status: service.status
      });
    });

    // Recent maintenance
    const recentMaintenance = await MaintenanceRequest.find({ 
      tenantId: new Types.ObjectId(tenantId) 
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("issueType status createdAt");

    recentMaintenance.forEach(maintenance => {
      activities.push({
        type: "maintenance",
        description: `${maintenance.issueType} request ${maintenance.status}`,
        date: maintenance.createdAt,
        status: maintenance.status
      });
    });

    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);
  }

  /**
   * Check if tenant is verified
   */
  private async isTenantVerified(tenantId: string): Promise<boolean> {
    const user = await User.findById(tenantId);
    return user?.isVerified || false;
  }
}

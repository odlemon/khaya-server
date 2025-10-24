import { Payment, IPayment } from "../models/Payment";
import { LandlordBalance } from "../models/LandlordBalance";
import { CommissionService } from "./CommissionService";
import { Types } from "mongoose";

export class LandlordPaymentService {
  private commissionService = new CommissionService();

  /**
   * Get landlord payment information with commission details
   */
  async getLandlordPayments(
    landlordId: string,
    filters?: {
      status?: string;
      paymentMethod?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      page?: number;
    }
  ): Promise<any> {
    try {
      const query: any = { landlordId: new Types.ObjectId(landlordId) };

      // Apply filters
      if (filters?.status) query.status = filters.status;
      if (filters?.paymentMethod) query.paymentMethod = filters.paymentMethod;
      if (filters?.startDate || filters?.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = filters.startDate;
        if (filters.endDate) query.createdAt.$lte = filters.endDate;
      }

      // Pagination
      const limit = filters?.limit || 50;
      const page = filters?.page || 1;
      const skip = (page - 1) * limit;

      // Get payments with populated data
      const payments = await Payment.find(query)
        .populate("tenantId", "firstName lastName email phoneNumber")
        .populate("propertyId", "title address propertyType")
        .populate("rentalId", "status startDate endDate")
        .populate("agreementId", "title startDate endDate")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Get total count for pagination
      const totalPayments = await Payment.countDocuments(query);

      // Get commission data for each payment
      const paymentsWithCommissions = await Promise.all(
        payments.map(async (payment) => {
          try {
            // Find commission record for this payment
            const commissions = await this.commissionService.getAllCommissions({
              paymentId: payment._id.toString()
            });

            const commission = commissions[0]; // Should be only one commission per payment

            return {
              // Payment data
              _id: payment._id,
              rentalId: payment.rentalId,
              agreementId: payment.agreementId,
              propertyId: payment.propertyId,
              tenantId: payment.tenantId,
              paymentType: payment.paymentType,
              amount: payment.amount,
              totalAmount: payment.totalAmount,
              dueDate: payment.dueDate,
              paymentDate: payment.paymentDate,
              paymentMethod: payment.paymentMethod,
              status: payment.status,
              verifiedAt: payment.verifiedAt,
              verifiedBy: payment.verifiedBy,
              receiptNumber: payment.receiptNumber,
              gatewayResponse: payment.gatewayResponse,
              proofOfPayment: payment.proofOfPayment,
              utilityReceipts: payment.utilityReceipts,
              notes: payment.notes,
              createdAt: payment.createdAt,
              updatedAt: payment.updatedAt,

              // Commission data
              commission: commission ? {
                _id: commission._id,
                transactionId: commission.transactionId,
                commissionRate: commission.commissionRate,
                commissionAmount: commission.commissionAmount,
                commissionStatus: commission.commissionStatus,
                isDebt: commission.isDebt,
                debtAmount: commission.debtAmount,
                debtPaid: commission.debtPaid,
                debtPaidAt: commission.debtPaidAt,
                collectedAt: commission.collectedAt,
                collectedFromPaymentId: commission.collectedFromPaymentId
              } : null,

              // Calculated fields
              landlordAmount: commission ? 
                (payment.totalAmount - commission.commissionAmount) : 
                payment.totalAmount,
              khayalamiCommission: commission ? commission.commissionAmount : 0,
              commissionPercentage: commission ? (commission.commissionRate * 100) : 0
            };
          } catch (error) {
            console.error(`Error getting commission for payment ${payment._id}:`, error);
            return {
              // Payment data only if commission lookup fails
              _id: payment._id,
              rentalId: payment.rentalId,
              agreementId: payment.agreementId,
              propertyId: payment.propertyId,
              tenantId: payment.tenantId,
              paymentType: payment.paymentType,
              amount: payment.amount,
              totalAmount: payment.totalAmount,
              dueDate: payment.dueDate,
              paymentDate: payment.paymentDate,
              paymentMethod: payment.paymentMethod,
              status: payment.status,
              verifiedAt: payment.verifiedAt,
              verifiedBy: payment.verifiedBy,
              receiptNumber: payment.receiptNumber,
              gatewayResponse: payment.gatewayResponse,
              proofOfPayment: payment.proofOfPayment,
              utilityReceipts: payment.utilityReceipts,
              notes: payment.notes,
              createdAt: payment.createdAt,
              updatedAt: payment.updatedAt,
              commission: null,
              landlordAmount: payment.totalAmount,
              khayalamiCommission: 0,
              commissionPercentage: 0
            };
          }
        })
      );

      // Calculate summary statistics
      const totalAmount = paymentsWithCommissions.reduce((sum, p) => sum + p.totalAmount, 0);
      const totalCommission = paymentsWithCommissions.reduce((sum, p) => sum + p.khayalamiCommission, 0);
      const totalLandlordAmount = paymentsWithCommissions.reduce((sum, p) => sum + p.landlordAmount, 0);

      // Payment method breakdown
      const onlinePayments = paymentsWithCommissions.filter(p => p.paymentMethod === "in_app");
      const cashPayments = paymentsWithCommissions.filter(p => p.paymentMethod === "cash");

      const onlineEarnings = onlinePayments.reduce((sum, p) => sum + p.totalAmount, 0);
      const cashEarnings = cashPayments.reduce((sum, p) => sum + p.totalAmount, 0);

      // Status breakdown
      const statusBreakdown = paymentsWithCommissions.reduce((acc, payment) => {
        acc[payment.status] = (acc[payment.status] || 0) + 1;
        return acc;
      }, {});

      const summary = {
        totalPayments,
        totalAmount,
        totalCommission,
        totalLandlordAmount,
        onlineEarnings,
        cashEarnings,
        onlinePayments: onlinePayments.length,
        cashPayments: cashPayments.length,
        averagePayment: totalPayments > 0 ? totalAmount / totalPayments : 0,
        averageCommission: totalPayments > 0 ? totalCommission / totalPayments : 0,
        commissionRate: totalAmount > 0 ? (totalCommission / totalAmount) * 100 : 0,
        statusBreakdown
      };

      return {
        summary,
        payments: paymentsWithCommissions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalPayments / limit),
          totalPayments,
          hasNextPage: page < Math.ceil(totalPayments / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to get landlord payments: ${error.message}`);
    }
  }

  /**
   * Get landlord payment statistics
   */
  async getLandlordPaymentStats(landlordId: string): Promise<any> {
    try {
      const [
        totalPayments,
        totalAmount,
        statusBreakdown,
        paymentMethodBreakdown,
        monthlyBreakdown,
        recentPayments
      ] = await Promise.all([
        Payment.countDocuments({ landlordId: new Types.ObjectId(landlordId) }),
        Payment.aggregate([
          { $match: { landlordId: new Types.ObjectId(landlordId) } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        Payment.aggregate([
          { $match: { landlordId: new Types.ObjectId(landlordId) } },
          { $group: { _id: "$status", count: { $sum: 1 } } }
        ]),
        Payment.aggregate([
          { $match: { landlordId: new Types.ObjectId(landlordId) } },
          { $group: { _id: "$paymentMethod", count: { $sum: 1 }, total: { $sum: "$amount" } } }
        ]),
        Payment.aggregate([
          { $match: { landlordId: new Types.ObjectId(landlordId) } },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" }
              },
              count: { $sum: 1 },
              total: { $sum: "$amount" }
            }
          },
          { $sort: { "_id.year": -1, "_id.month": -1 } },
          { $limit: 12 }
        ]),
        Payment.find({ landlordId: new Types.ObjectId(landlordId) })
          .populate("tenantId", "firstName lastName email")
          .populate("propertyId", "title address")
          .sort({ createdAt: -1 })
          .limit(10)
      ]);

      return {
        totalPayments,
        totalAmount: totalAmount[0]?.total || 0,
        statusBreakdown: statusBreakdown.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        paymentMethodBreakdown: paymentMethodBreakdown.reduce((acc, item) => {
          acc[item._id] = { count: item.count, total: item.total };
          return acc;
        }, {}),
        monthlyBreakdown: monthlyBreakdown.map(item => ({
          month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          count: item.count,
          total: item.total
        })),
        recentPayments
      };
    } catch (error: any) {
      throw new Error(`Failed to get landlord payment stats: ${error.message}`);
    }
  }

  /**
   * Get landlord balance information
   */
  async getLandlordBalance(landlordId: string): Promise<any> {
    try {
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

      // Get recent transactions
      const recentTransactions = balance.transactions
        .sort((a: any, b: any) => b.date.getTime() - a.date.getTime())
        .slice(0, 10);

      return {
        availableBalance: balance.availableBalance,
        pendingBalance: balance.pendingBalance,
        totalEarnings: balance.totalEarnings,
        totalWithdrawn: balance.totalWithdrawn,
        bankDetails: balance.bankDetails,
        mobileMoneyDetails: balance.mobileMoneyDetails,
        recentTransactions
      };
    } catch (error: any) {
      throw new Error(`Failed to get landlord balance: ${error.message}`);
    }
  }
}

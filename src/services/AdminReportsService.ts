// @ts-nocheck
import { User } from "../models/User";
import { Property } from "../models/Property";
import { Agreement } from "../models/Agreement";
import { Rental } from "../models/Rental";
import { Payment } from "../models/Payment";
import { ServiceBooking } from "../models/ServiceBooking";
import { NOT_ADMIN_TERMINATED } from "../constants/userQueries";

export class AdminReportsService {
  async getOverview(startDate?: Date, endDate?: Date) {
    const rangeFilter = startDate || endDate ? { createdAt: {} as any } : undefined;
    if (rangeFilter) {
      if (startDate) (rangeFilter.createdAt as any).$gte = startDate;
      if (endDate) (rangeFilter.createdAt as any).$lte = endDate;
    }

    const [
      totalUsers,
      totalLandlords,
      totalTenants,
      totalProperties,
      totalConnections,
      totalAgreements,
      totalRentals,
      totalPayments,
      totalServices
    ] = await Promise.all([
      User.countDocuments({ ...(rangeFilter || {}), ...NOT_ADMIN_TERMINATED }),
      User.countDocuments({ role: "landlord", ...(rangeFilter || {}), ...NOT_ADMIN_TERMINATED }),
      User.countDocuments({ role: "tenant", ...(rangeFilter || {}), ...NOT_ADMIN_TERMINATED }),
      Property.countDocuments(rangeFilter || {}),
      // connections optional (model name Connection in codebase)
      (await import("../models/Connection")).Connection.countDocuments(rangeFilter || {}),
      Agreement.countDocuments(rangeFilter || {}),
      Rental.countDocuments(rangeFilter || {}),
      Payment.countDocuments(rangeFilter || {}),
      ServiceBooking.countDocuments(rangeFilter || {})
    ]);

    return {
      users: totalUsers,
      landlords: totalLandlords,
      tenants: totalTenants,
      properties: totalProperties,
      connections: totalConnections,
      agreements: totalAgreements,
      rentals: totalRentals,
      payments: totalPayments,
      services: totalServices
    };
  }

  async getOverviewSeriesAndTables(groupBy: "day"|"week"|"month" = "month", startDate?: Date, endDate?: Date) {
    // Define time window (default: last 6 months)
    const end = endDate || new Date();
    const start = startDate || new Date(new Date(end).setMonth(end.getMonth() - 5));

    const dateMatch = {
      $match: {
        $and: [{ createdAt: { $gte: start, $lte: end } }, NOT_ADMIN_TERMINATED],
      },
    } as any;

    const dateProject = {
      $project: {
        createdAt: 1,
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
        week: { $isoWeek: "$createdAt" }
      }
    };

    const groupKey = groupBy === "day" ? { y: "$year", m: "$month", d: "$day" }
      : groupBy === "week" ? { y: "$year", w: "$week" }
      : { y: "$year", m: "$month" };

    const usersSeriesAgg = await User.aggregate([
      dateMatch,
      dateProject,
      { $group: { _id: groupKey as any, count: { $sum: 1 } } },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.w": 1, "_id.d": 1 } }
    ]);

    const paymentsSeriesAgg = await Payment.aggregate([
      dateMatch,
      dateProject,
      { $group: { _id: groupKey as any, count: { $sum: 1 }, amount: { $sum: "$amount" } } },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.w": 1, "_id.d": 1 } }
    ]);

    const formatLabel = (g: any) => {
      if (groupBy === "day") return `${g.y}-${String(g.m).padStart(2,'0')}-${String(g.d).padStart(2,'0')}`;
      if (groupBy === "week") return `${g.y}-W${String(g.w).padStart(2,'0')}`;
      return `${g.y}-${String(g.m).padStart(2,'0')}`;
    };

    const series = [
      {
        key: "users",
        data: usersSeriesAgg.map((r: any) => ({ period: formatLabel(r._id), value: r.count }))
      },
      {
        key: "payments",
        data: paymentsSeriesAgg.map((r: any) => ({ period: formatLabel(r._id), value: r.amount, count: r.count }))
      }
    ];

    const recentUsers = await User.find({ ...NOT_ADMIN_TERMINATED })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("firstName lastName email role createdAt");

    const recentPayments = await Payment.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select("amount status paymentMethod createdAt")
      .populate("tenantId", "firstName lastName")
      .populate("landlordId", "firstName lastName");

    const tables = {
      usersRecent: recentUsers,
      paymentsRecent: recentPayments
    };

    return { series, tables };
  }
}

export const adminReportsService = new AdminReportsService();



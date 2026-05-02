// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { Property } from "../models/Property";
import { Connection } from "../models/Connection";
import { Chat } from "../models/Chat";
import { Agreement } from "../models/Agreement";
import { Types } from "mongoose";
import { NOT_ADMIN_TERMINATED } from "../constants/userQueries";

export class AdminController {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      // Get total counts
      const totalTenants = await User.countDocuments({
        role: "tenant",
        isActive: true,
        ...NOT_ADMIN_TERMINATED,
      });
      const totalLandlords = await User.countDocuments({
        role: "landlord",
        isActive: true,
        ...NOT_ADMIN_TERMINATED,
      });
      const totalProperties = await Property.countDocuments({ isActive: true });
      const totalConnections = await Connection.countDocuments({ isActive: true });
      const totalChats = await Chat.countDocuments({ isActive: true });
      const totalAgreements = await Agreement.countDocuments({ isActive: true });

      // Get rented properties (properties with accepted connections)
      const rentedProperties = await Connection.countDocuments({ 
        status: "accepted", 
        isActive: true 
      });

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentTenants = await User.countDocuments({
        role: "tenant",
        createdAt: { $gte: thirtyDaysAgo },
        ...NOT_ADMIN_TERMINATED,
      });

      const recentLandlords = await User.countDocuments({
        role: "landlord",
        createdAt: { $gte: thirtyDaysAgo },
        ...NOT_ADMIN_TERMINATED,
      });

      const recentProperties = await Property.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      });

      const recentConnections = await Connection.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      });

      // Get monthly stats for the last 6 months
      const monthlyStats = await this.getMonthlyStats();

      res.status(200).json({
        success: true,
        message: "Dashboard stats retrieved successfully",
        data: {
          overview: {
            totalTenants,
            totalLandlords,
            totalProperties,
            rentedProperties,
            totalConnections,
            totalChats,
            totalAgreements,
            availableProperties: totalProperties - rentedProperties
          },
          recentActivity: {
            newTenants: recentTenants,
            newLandlords: recentLandlords,
            newProperties: recentProperties,
            newConnections: recentConnections
          },
          monthlyStats
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get monthly statistics for the last 6 months
   */
  private async getMonthlyStats() {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const [tenants, landlords, properties, connections] = await Promise.all([
        User.countDocuments({
          role: "tenant",
          createdAt: { $gte: monthStart, $lte: monthEnd },
          ...NOT_ADMIN_TERMINATED,
        }),
        User.countDocuments({
          role: "landlord",
          createdAt: { $gte: monthStart, $lte: monthEnd },
          ...NOT_ADMIN_TERMINATED,
        }),
        Property.countDocuments({
          createdAt: { $gte: monthStart, $lte: monthEnd }
        }),
        Connection.countDocuments({
          createdAt: { $gte: monthStart, $lte: monthEnd }
        })
      ]);

      months.push({
        month: monthStart.toISOString().substring(0, 7), // YYYY-MM format
        tenants,
        landlords,
        properties,
        connections
      });
    }

    return months;
  }

  /**
   * Get all users with pagination and filtering
   */
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const role = req.query.role as string;
      const search = req.query.search as string;
      const isActive = req.query.isActive as string;

      const skip = (page - 1) * limit;

      const filter: any = { $and: [NOT_ADMIN_TERMINATED] };
      if (role) filter.$and.push({ role });
      if (isActive !== undefined) filter.$and.push({ isActive: isActive === "true" });
      if (search) {
        filter.$and.push({
          $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        });
      }

      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(filter)
      ]);

      res.status(200).json({
        success: true,
        message: "Users retrieved successfully",
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * List accounts terminated by Khayalami admin (tenant/landlord only in data).
   */
  async getTerminatedUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
      const role = req.query.role as string;
      const skip = (page - 1) * limit;

      const filter: any = {
        adminTerminatedAt: { $ne: null, $exists: true },
      };
      if (role && ["tenant", "landlord"].includes(role)) {
        filter.role = role;
      }

      const [users, total] = await Promise.all([
        User.find(filter)
          .select("-password")
          .populate("adminTerminatedBy", "firstName lastName email role")
          .sort({ adminTerminatedAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        message: "Terminated accounts retrieved successfully",
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit) || 0,
          },
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Terminate a tenant or landlord account (soft). User cannot log in; row kept.
   */
  async terminateUserAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const { userId } = req.params;
      const { reason } = req.body || {};

      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: "Invalid user ID" });
      }
      if (typeof reason !== "string" || !reason.trim()) {
        return res.status(400).json({
          success: false,
          message: "Termination reason is required (non-empty string).",
        });
      }
      const trimmedReason = reason.trim();
      if (trimmedReason.length > 2000) {
        return res.status(400).json({
          success: false,
          message: "Reason must be at most 2000 characters.",
        });
      }

      if (adminId.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: "You cannot terminate your own account.",
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (!["tenant", "landlord"].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only tenant or landlord accounts can be terminated with this action.",
        });
      }

      if (user.adminTerminatedAt) {
        return res.status(409).json({
          success: false,
          message: "This account is already terminated.",
        });
      }

      user.adminTerminatedAt = new Date();
      user.adminTerminationReason = trimmedReason;
      user.adminTerminatedBy = adminId;
      user.isActive = false;
      user.adminReinstatedAt = null;
      user.adminReinstatementReason = null;
      user.adminReinstatedBy = null;
      await user.save();

      const updated = await User.findById(userId)
        .select("-password")
        .populate("adminTerminatedBy", "firstName lastName email role");

      res.status(200).json({
        success: true,
        message: "Account terminated successfully",
        data: updated,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Reverse admin termination: clear termination flags, reactivate account, store reinstatement reason.
   */
  async reinstateUserAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const { userId } = req.params;
      const { reason } = req.body || {};

      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: "Invalid user ID" });
      }
      if (typeof reason !== "string" || !reason.trim()) {
        return res.status(400).json({
          success: false,
          message: "Reinstatement reason is required (non-empty string).",
        });
      }
      const trimmedReason = reason.trim();
      if (trimmedReason.length > 2000) {
        return res.status(400).json({
          success: false,
          message: "Reason must be at most 2000 characters.",
        });
      }

      if (adminId.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: "You cannot reinstate your own account with this action.",
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (!["tenant", "landlord"].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only tenant or landlord accounts can be reinstated with this action.",
        });
      }

      if (!user.adminTerminatedAt) {
        return res.status(409).json({
          success: false,
          message: "This account is not terminated.",
        });
      }

      user.adminTerminatedAt = null;
      user.adminTerminationReason = null;
      user.adminTerminatedBy = null;
      user.adminReinstatedAt = new Date();
      user.adminReinstatementReason = trimmedReason;
      user.adminReinstatedBy = adminId;
      user.isActive = true;
      await user.save();

      const updated = await User.findById(userId)
        .select("-password")
        .populate("adminReinstatedBy", "firstName lastName email role");

      res.status(200).json({
        success: true,
        message: "Account reinstated successfully",
        data: updated,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get all properties with pagination and filtering
   */
  async getProperties(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const search = req.query.search as string;

      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {};
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { address: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const [properties, total] = await Promise.all([
        Property.find(filter)
          .populate('landlordId', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Property.countDocuments(filter)
      ]);

      res.status(200).json({
        success: true,
        message: "Properties retrieved successfully",
        data: {
          properties,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get all agreements with pagination and filtering
   */
  async getAgreements(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const search = req.query.search as string;

      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {};
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const [agreements, total] = await Promise.all([
        Agreement.find(filter)
          .populate('tenantId', 'firstName lastName email')
          .populate('landlordId', 'firstName lastName email')
          .populate('propertyId', 'title address price')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Agreement.countDocuments(filter)
      ]);

      res.status(200).json({
        success: true,
        message: "Agreements retrieved successfully",
        data: {
          agreements,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get all connections with pagination and filtering
   */
  async getConnections(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;

      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {};
      if (status) filter.status = status;

      const [connections, total] = await Promise.all([
        Connection.find(filter)
          .populate('tenantId', 'firstName lastName email')
          .populate('landlordId', 'firstName lastName email')
          .populate('propertyId', 'title address price')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Connection.countDocuments(filter)
      ]);

      res.status(200).json({
        success: true,
        message: "Connections retrieved successfully",
        data: {
          connections,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update user status (activate/deactivate)
   */
  async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: "isActive must be a boolean value"
        });
      }

      const updatePayload: any = { isActive };
      if (isActive === true) {
        updatePayload.adminTerminatedAt = null;
        updatePayload.adminTerminationReason = null;
        updatePayload.adminTerminatedBy = null;
      }

      const user = await User.findByIdAndUpdate(userId, updatePayload, { new: true }).select(
        "-password"
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      res.status(200).json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: user
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update property status
   */
  async updatePropertyStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { propertyId } = req.params;
      const { status } = req.body;

      const validStatuses = ['available', 'rented', 'maintenance', 'inactive'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be one of: available, rented, maintenance, inactive"
        });
      }

      const property = await Property.findByIdAndUpdate(
        propertyId,
        { status },
        { new: true }
      ).populate('landlordId', 'firstName lastName email');

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Property status updated successfully",
        data: property
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update user role (temporary endpoint for setup)
   */
  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({
          success: false,
          message: "Email and role are required"
        });
      }

      const validRoles = ["admin", "landlord", "tenant"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role. Must be one of: admin, landlord, tenant"
        });
      }

      const user = await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { role },
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "User role updated successfully",
        data: user
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get system analytics
   */
  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get user growth
      const userGrowth = await User.aggregate([
        {
          $match: {
            $and: [{ createdAt: { $gte: startDate } }, NOT_ADMIN_TERMINATED],
          },
        },
        {
          $group: {
            _id: {
              role: "$role",
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt"
                }
              }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { "_id.date": 1 }
        }
      ]);

      // Get property statistics
      const propertyStats = await Property.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);

      // Get connection statistics
      const connectionStats = await Connection.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);

      res.status(200).json({
        success: true,
        message: "Analytics retrieved successfully",
        data: {
          userGrowth,
          propertyStats,
          connectionStats,
          period: `${days} days`
        }
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const adminController = new AdminController();

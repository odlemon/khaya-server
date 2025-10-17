// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { Property } from "../models/Property";
import { Connection } from "../models/Connection";
import { Chat } from "../models/Chat";
import { Agreement } from "../models/Agreement";
import { Types } from "mongoose";

export class AdminController {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      // Get total counts
      const totalTenants = await User.countDocuments({ role: "tenant", isActive: true });
      const totalLandlords = await User.countDocuments({ role: "landlord", isActive: true });
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
        createdAt: { $gte: thirtyDaysAgo }
      });

      const recentLandlords = await User.countDocuments({
        role: "landlord", 
        createdAt: { $gte: thirtyDaysAgo }
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
          createdAt: { $gte: monthStart, $lte: monthEnd }
        }),
        User.countDocuments({
          role: "landlord",
          createdAt: { $gte: monthStart, $lte: monthEnd }
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

      // Build filter
      const filter: any = {};
      if (role) filter.role = role;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
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

      const user = await User.findByIdAndUpdate(
        userId,
        { isActive },
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
            createdAt: { $gte: startDate }
          }
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

// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { Types } from "mongoose";
import { Agreement } from "../models/Agreement";
import { Rental } from "../models/Rental";
import { NOT_ADMIN_TERMINATED } from "../constants/userQueries";

export class UserController {

  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await User.find({
        ...NOT_ADMIN_TERMINATED,
      })
        .select("-password")
        .sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: users });
    } catch (error: any) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid user ID" });
      }

      const user = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-password");
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      res.status(200).json({ success: true, message: "User updated", data: user });
    } catch (error: any) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid user ID" });
      }

      const user = await User.findByIdAndDelete(id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      res.status(200).json({ success: true, message: "User removed" });
    } catch (error: any) {
      next(error);
    }
  }

  async getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findById((req as any).user._id);
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }
      res.json({ success: true, preferences: user.preferences || {} });
    } catch (error) {
      next(error);
    }
  }

  async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updates = req.body;
      const user = await User.findByIdAndUpdate(
        (req as any).user._id,
        { $set: { preferences: updates } },
        { new: true, runValidators: true }
      );
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }
      res.json({ success: true, preferences: user.preferences });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findById((req as any).user._id).select("-password");
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }
      res.json({ success: true, user });
      return;
    } catch (error) {
      next(error);
      return;
    }
  }

  async updateProfileName(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { firstName, lastName } = req.body;
      if (!firstName && !lastName) {
        res.status(400).json({ success: false, message: "At least one of firstName or lastName must be provided." });
        return;
      }
      const updateData: any = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      const user = await User.findByIdAndUpdate(
        (req as any).user._id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select("-password");
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }
      res.json({ success: true, user });
      return;
    } catch (error) {
      next(error);
      return;
    }
  }

  async verifyCurrentPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user._id;
      const { currentPassword } = req.body;
      if (!currentPassword) {
        res.status(400).json({ success: false, message: "Current password is required." });
        return;
      }
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        res.status(401).json({ success: false, message: "Current password is incorrect." });
        return;
      }
      res.json({ success: true });
      return;
    } catch (error) {
      next(error);
      return;
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user._id;
      const { newPassword } = req.body;
      if (!newPassword) {
        res.status(400).json({ success: false, message: "New password is required." });
        return;
      }
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }
      user.password = newPassword;
      await user.save();
      res.json({ success: true, message: "Password changed successfully." });
      return;
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * Self-service account deletion (tenant or landlord).
   * If user has any active agreement or rental, block and ask to terminate first.
   *
   * DELETE /api/users/me
   */
  async deleteMyAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?._id?.toString?.();
      const role = (req as any).user?.role;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      if (!["tenant", "landlord"].includes(role)) {
        return res.status(403).json({
          success: false,
          message: "Only tenants and landlords can delete their account.",
        });
      }

      const uid = new Types.ObjectId(userId);

      const activeAgreement = await Agreement.findOne({
        $or: [{ tenantId: uid }, { landlordId: uid }],
        status: { $in: ["active", "signed", "pending_termination"] },
      })
        .select("_id status")
        .lean();

      if (activeAgreement) {
        return res.status(409).json({
          success: false,
          message:
            "You cannot delete your account while you have an active agreement. Please terminate your agreement first.",
        });
      }

      const activeRental = await Rental.findOne({
        $or: [{ tenantId: uid }, { landlordId: uid }],
        status: { $in: ["active", "suspended"] },
      })
        .select("_id status")
        .lean();

      if (activeRental) {
        return res.status(409).json({
          success: false,
          message:
            "You cannot delete your account while you have an active rental. Please terminate your rental first.",
        });
      }

      const user = await User.findById(uid);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      user.isActive = false;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Your account has been deleted successfully.",
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get tenants for landlord to choose from (landlord only)
   */
  async getTenantsForLandlord(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { 
        search, 
        verified, 
        page = 1, 
        limit = 20,
        propertyId 
      } = req.query;

      // Only landlords can access this endpoint
      if (userRole !== "landlord") {
        return res.status(403).json({
          success: false,
          message: "Only landlords can view tenant list"
        });
      }

      const query: any = {
        role: "tenant",
        isActive: true,
        ...NOT_ADMIN_TERMINATED,
      };

      // Filter by verification status
      if (verified !== undefined) {
        query.isVerified = verified === "true";
      }

      // Search by name or email
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ];
      }

      // Check if tenant has existing agreement for this property
      if (propertyId) {
        const existingAgreements = await Agreement.find({
          propertyId,
          status: { $in: ["active", "pending", "signed"] }
        });
        
        const tenantIdsWithAgreements = existingAgreements.map(agreement => agreement.tenantId.toString());
        query._id = { $nin: tenantIdsWithAgreements };
      }

      const skip = (Number(page) - 1) * Number(limit);

      // Get tenants with pagination
      const tenants = await User.find(query)
        .select("firstName lastName email phone isVerified profile createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await User.countDocuments(query);

      // Get additional tenant information
      const tenantsWithDetails = await Promise.all(
        tenants.map(async (tenant) => {
          // Get tenant's rental history
          const rentalHistory = await Agreement.find({ 
            tenantId: tenant._id,
            status: { $in: ["active", "expired", "terminated"] }
          }).countDocuments();

          // Get tenant's current active agreements
          const activeAgreements = await Agreement.find({ 
            tenantId: tenant._id,
            status: "active"
          }).countDocuments();

          // Get tenant's payment history (placeholder for future implementation)
          const paymentHistory = "Good"; // This would come from payment system

          return {
            _id: tenant._id,
            firstName: tenant.firstName,
            lastName: tenant.lastName,
            email: tenant.email,
            phone: tenant.phone,
            isVerified: tenant.isVerified,
            profile: tenant.profile,
            createdAt: tenant.createdAt,
            rentalHistory,
            activeAgreements,
            paymentHistory,
            fullName: `${tenant.firstName} ${tenant.lastName}`,
            isAvailable: activeAgreements === 0 // Available if no active agreements
          };
        })
      );

      res.status(200).json({
        success: true,
        data: tenantsWithDetails,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
          hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
          hasPrevPage: Number(page) > 1
        }
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const userController = new UserController();

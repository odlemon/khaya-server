// @ts-nocheck
import { Types } from "mongoose";
import { User, IUser } from "../models/User";
import { StaffRole } from "../models/StaffRole";
import { PortalType } from "../config/portalPermissions";
import { staffRoleService, generateStaffPassword } from "./StaffRoleService";
import { StaffCredentialEmailService } from "./StaffCredentialEmailService";

export interface CreateStaffUserInput {
  firstName: string;
  lastName: string;
  email: string;
  staffRoleId: string;
  createdByStaffId: string;
}

export interface UpdateStaffUserInput {
  staffRoleId?: string;
  isActive?: boolean;
}

class StaffUserService {
  async listStaffUsers(portal?: PortalType) {
    const filter: Record<string, unknown> = {
      role: { $in: ["admin", "bank_admin", "insurance_admin"] },
      staffRoleId: { $ne: null },
    };

    if (portal) {
      filter.role = staffRoleService.getUserRoleForPortal(portal);
    }

    const users = await User.find(filter)
      .select("-password")
      .populate("staffRoleId", "name portal permissions isActive")
      .sort({ createdAt: -1 })
      .lean();

    return users;
  }

  async assertEmailAvailableForStaff(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalized }).select("role email").lean();

    if (!existing) return;

    if (existing.role === "tenant" || existing.role === "landlord") {
      throw new Error(
        "This email is already registered as a tenant or landlord. Staff accounts must use a different email."
      );
    }

    throw new Error("This email is already in use.");
  }

  async createStaffUser(
    input: CreateStaffUserInput
  ): Promise<{ user: IUser; temporaryPassword: string }> {
    const email = input.email.trim().toLowerCase();
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();

    if (!email || !firstName || !lastName) {
      throw new Error("First name, last name, and email are required");
    }

    if (!Types.ObjectId.isValid(input.staffRoleId)) {
      throw new Error("Invalid staff role");
    }

    await this.assertEmailAvailableForStaff(email);

    const staffRole = await StaffRole.findById(input.staffRoleId);
    if (!staffRole || !staffRole.isActive) {
      throw new Error("Staff role not found or inactive");
    }

    const temporaryPassword = generateStaffPassword();
    const userRole = staffRoleService.getUserRoleForPortal(staffRole.portal);

    const user = new User({
      email,
      password: temporaryPassword,
      firstName,
      lastName,
      role: userRole,
      staffRoleId: staffRole._id,
      isSuperAdmin: false,
      mustChangePassword: true,
      isVerified: true,
      isActive: true,
      createdByStaff: new Types.ObjectId(input.createdByStaffId),
    });

    await user.save();

    let emailSent = false;
    try {
      await StaffCredentialEmailService.sendCredentials({
        email,
        firstName,
        lastName,
        portal: staffRole.portal,
        roleName: staffRole.name,
        temporaryPassword,
      });
      emailSent = true;
    } catch (emailErr) {
      console.error("Staff credential email failed:", emailErr);
    }

    const userObj = user.toObject();
    delete userObj.password;
    return {
      user: userObj as IUser,
      temporaryPassword,
      emailSent,
      credentials: {
        email,
        password: temporaryPassword,
        portal: staffRole.portal,
        roleName: staffRole.name,
        mustChangePassword: true,
      },
    };
  }

  async updateStaffUser(userId: string, input: UpdateStaffUserInput) {
    if (!Types.ObjectId.isValid(userId)) return null;

    const user = await User.findById(userId);
    if (!user || !user.staffRoleId) return null;

    if (input.staffRoleId) {
      if (!Types.ObjectId.isValid(input.staffRoleId)) {
        throw new Error("Invalid staff role");
      }
      const staffRole = await StaffRole.findById(input.staffRoleId);
      if (!staffRole || !staffRole.isActive) {
        throw new Error("Staff role not found or inactive");
      }
      user.staffRoleId = staffRole._id;
      user.role = staffRoleService.getUserRoleForPortal(staffRole.portal);
    }

    if (input.isActive !== undefined) {
      user.isActive = input.isActive;
    }

    await user.save();
    return User.findById(userId).select("-password").populate("staffRoleId", "name portal").lean();
  }

  async resetStaffPassword(userId: string): Promise<{
    temporaryPassword: string;
    emailSent: boolean;
    credentials: {
      email: string;
      password: string;
      portal: string;
      roleName: string;
      mustChangePassword: boolean;
    };
  } | null> {
    if (!Types.ObjectId.isValid(userId)) return null;

    const user = await User.findById(userId);
    if (!user || !user.staffRoleId) return null;

    const staffRole = await StaffRole.findById(user.staffRoleId).lean();
    const temporaryPassword = generateStaffPassword();

    user.password = temporaryPassword;
    user.mustChangePassword = true;
    await user.save();

    let emailSent = false;
    try {
      await StaffCredentialEmailService.sendCredentials({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        portal: staffRole?.portal || "khayalami",
        roleName: staffRole?.name || "Staff",
        temporaryPassword,
      });
      emailSent = true;
    } catch (emailErr) {
      console.error("Staff credential email failed:", emailErr);
    }

    return {
      temporaryPassword,
      emailSent,
      credentials: {
        email: user.email,
        password: temporaryPassword,
        portal: staffRole?.portal || "khayalami",
        roleName: staffRole?.name || "Staff",
        mustChangePassword: true,
      },
    };
  }
}

export const staffUserService = new StaffUserService();

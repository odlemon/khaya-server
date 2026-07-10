// @ts-nocheck
import crypto from "crypto";
import { Types } from "mongoose";
import { StaffRole, IStaffRole } from "../models/StaffRole";
import { User } from "../models/User";
import {
  PortalType,
  validatePermissionsForPortal,
  PORTAL_TO_USER_ROLE,
} from "../config/portalPermissions";
import { slugifyRoleName } from "../utils/staffAuth";

export interface CreateStaffRoleInput {
  name: string;
  portal: PortalType;
  permissions: string[];
  createdBy?: string;
}

export interface UpdateStaffRoleInput {
  name?: string;
  permissions?: string[];
  isActive?: boolean;
}

class StaffRoleService {
  async listRoles(portal?: PortalType): Promise<IStaffRole[]> {
    const filter: Record<string, unknown> = {};
    if (portal) filter.portal = portal;
    return StaffRole.find(filter).sort({ portal: 1, name: 1 }).lean();
  }

  async getRoleById(id: string): Promise<IStaffRole | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return StaffRole.findById(id).lean();
  }

  async createRole(input: CreateStaffRoleInput): Promise<IStaffRole> {
    const name = input.name?.trim();
    if (!name) throw new Error("Role name is required");

    const validation = validatePermissionsForPortal(input.portal, input.permissions || []);
    if (!validation.valid) {
      throw new Error(`Invalid permissions for portal: ${validation.invalid.join(", ")}`);
    }

    const slug = slugifyRoleName(name);
    const existing = await StaffRole.findOne({ portal: input.portal, slug });
    if (existing) {
      throw new Error("A role with this name already exists for this portal");
    }

    const doc = await StaffRole.create({
      name,
      slug,
      portal: input.portal,
      permissions: input.permissions || [],
      isActive: true,
      createdBy: input.createdBy ? new Types.ObjectId(input.createdBy) : undefined,
    });

    return doc.toObject();
  }

  async updateRole(id: string, input: UpdateStaffRoleInput): Promise<IStaffRole | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    const role = await StaffRole.findById(id);
    if (!role) return null;

    if (input.permissions !== undefined) {
      const validation = validatePermissionsForPortal(role.portal, input.permissions);
      if (!validation.valid) {
        throw new Error(`Invalid permissions for portal: ${validation.invalid.join(", ")}`);
      }
      role.permissions = input.permissions;
    }

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new Error("Role name is required");
      const slug = slugifyRoleName(name);
      const duplicate = await StaffRole.findOne({
        portal: role.portal,
        slug,
        _id: { $ne: role._id },
      });
      if (duplicate) {
        throw new Error("A role with this name already exists for this portal");
      }
      role.name = name;
      role.slug = slug;
    }

    if (input.isActive !== undefined) {
      role.isActive = input.isActive;
    }

    await role.save();
    return role.toObject();
  }

  async deactivateRole(id: string): Promise<{ success: boolean; message?: string }> {
    if (!Types.ObjectId.isValid(id)) {
      return { success: false, message: "Invalid role ID" };
    }

    const assignedCount = await User.countDocuments({
      staffRoleId: new Types.ObjectId(id),
      isActive: true,
    });

    if (assignedCount > 0) {
      return {
        success: false,
        message: `Cannot deactivate role: ${assignedCount} active staff user(s) assigned`,
      };
    }

    const role = await StaffRole.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!role) return { success: false, message: "Role not found" };
    return { success: true };
  }

  getUserRoleForPortal(portal: PortalType): "admin" | "bank_admin" | "insurance_admin" {
    return PORTAL_TO_USER_ROLE[portal];
  }
}

export const staffRoleService = new StaffRoleService();

export function generateStaffPassword(): string {
  const part = crypto.randomBytes(6).toString("base64url");
  return `Khaya@${part}1`;
}

// @ts-nocheck
import { IUser } from "../models/User";
import { StaffRole, IStaffRole } from "../models/StaffRole";
import {
  PortalType,
  STAFF_PORTAL_ROLES,
  USER_ROLE_TO_PORTAL,
  getAllPermissionKeysForPortal,
} from "../config/portalPermissions";

export interface StaffAuthContext {
  isSuperAdmin: boolean;
  portal: PortalType | null;
  permissions: string[];
  staffRole: {
    id: string;
    name: string;
    portal: PortalType;
  } | null;
}

export function isStaffPortalRole(role: string): boolean {
  return STAFF_PORTAL_ROLES.includes(role as (typeof STAFF_PORTAL_ROLES)[number]);
}

export function getPortalFromUserRole(role: string): PortalType | null {
  return USER_ROLE_TO_PORTAL[role] || null;
}

/** Super-admins bypass permission checks (explicit flag or legacy staff account without staffRoleId). */
export function isSuperAdminUser(user: Pick<IUser, "role" | "isSuperAdmin" | "staffRoleId">): boolean {
  if (user.isSuperAdmin) return true;
  if (isStaffPortalRole(user.role) && !user.staffRoleId) return true;
  return false;
}

export async function resolveStaffAuthContext(
  user: Pick<IUser, "_id" | "role" | "isSuperAdmin" | "staffRoleId">
): Promise<StaffAuthContext> {
  const portal = getPortalFromUserRole(user.role);

  if (!isStaffPortalRole(user.role)) {
    return {
      isSuperAdmin: false,
      portal: null,
      permissions: [],
      staffRole: null,
    };
  }

  if (isSuperAdminUser(user)) {
    return {
      isSuperAdmin: true,
      portal,
      permissions: portal ? getAllPermissionKeysForPortal(portal) : [],
      staffRole: null,
    };
  }

  if (!user.staffRoleId) {
    return {
      isSuperAdmin: false,
      portal,
      permissions: [],
      staffRole: null,
    };
  }

  const staffRole = await StaffRole.findById(user.staffRoleId).lean<IStaffRole>();
  if (!staffRole || !staffRole.isActive) {
    return {
      isSuperAdmin: false,
      portal,
      permissions: [],
      staffRole: null,
    };
  }

  return {
    isSuperAdmin: false,
    portal: staffRole.portal,
    permissions: staffRole.permissions || [],
    staffRole: {
      id: staffRole._id.toString(),
      name: staffRole.name,
      portal: staffRole.portal,
    },
  };
}

export function userHasPermission(
  context: StaffAuthContext,
  required: string | string[]
): boolean {
  if (context.isSuperAdmin) return true;
  const keys = Array.isArray(required) ? required : [required];
  return keys.some((key) => context.permissions.includes(key));
}

export function slugifyRoleName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

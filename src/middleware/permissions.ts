// @ts-nocheck
import { Response, NextFunction } from "express";
import { AuthRequest } from "./authenticate";
import { resolveStaffAuthContext, userHasPermission, StaffAuthContext } from "../utils/staffAuth";

export interface StaffAuthRequest extends AuthRequest {
  staffAuth?: StaffAuthContext;
}

export async function attachStaffAuth(
  req: StaffAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next();
    }
    req.staffAuth = await resolveStaffAuthContext(req.user);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Require at least one of the given permission keys.
 * Super-admins always pass. Non-staff users (tenant/landlord) always fail.
 */
export function requirePermission(...requiredKeys: string[]) {
  return (req: StaffAuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const context = req.staffAuth;
    if (!context) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
        code: "PERMISSION_DENIED",
      });
    }

    if (userHasPermission(context, requiredKeys)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Forbidden: insufficient permissions",
      code: "PERMISSION_DENIED",
      required: requiredKeys,
    });
  };
}

/** Apply permission check only when the caller is Khayalami admin (shared landlord/admin routes). */
export function requirePermissionIfAdmin(...requiredKeys: string[]) {
  const checker = requirePermission(...requiredKeys);
  return (req: StaffAuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== "admin") {
      return next();
    }
    return checker(req, res, next);
  };
}

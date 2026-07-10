// @ts-nocheck
import jwt from "jsonwebtoken";
import { IUser } from "../models/User";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/jwtConfig";
import { resolveStaffAuthContext, StaffAuthContext } from "./staffAuth";
import { isStaffPortalRole } from "./staffAuth";

export async function buildAuthLoginPayload(user: IUser) {
  const staffAuth: StaffAuthContext = await resolveStaffAuthContext(user);

  const token = jwt.sign(
    {
      userId: user._id,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const documentVerificationStatus = user.documentVerification?.status || "unverified";
  const isDocumentVerified = documentVerificationStatus === "verified";

  const baseUser: Record<string, unknown> = {
    userId: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    phone: user.phone,
    isVerified: user.isVerified,
    isDocumentVerified,
    documentVerificationStatus,
    requiresOnboarding: !user.isVerified,
    isSuperAdmin: staffAuth.isSuperAdmin,
    mustChangePassword: !!user.mustChangePassword,
  };

  if (isStaffPortalRole(user.role)) {
    baseUser.staffRole = staffAuth.staffRole;
    baseUser.portal = staffAuth.portal;
  }

  return {
    token,
    user: baseUser,
    permissions: staffAuth.permissions,
    portal: staffAuth.portal,
    isSuperAdmin: staffAuth.isSuperAdmin,
    mustChangePassword: !!user.mustChangePassword,
  };
}

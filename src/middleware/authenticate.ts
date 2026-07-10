// @ts-nocheck
// src/middleware/authenticate.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/jwtConfig";
import { logger } from "../utils/logger";
import { resolveStaffAuthContext, StaffAuthContext } from "../utils/staffAuth";

export interface AuthRequest extends Request {
  user?: IUser;
  staffAuth?: StaffAuthContext;
}

export function createToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token || null;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authorization token missing or malformed",
      code: "AUTH_MISSING",
    });
  }

  let decoded: { userId: string };

  try {
    decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch (err: any) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
        code: "TOKEN_EXPIRED",
      });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
        code: "TOKEN_INVALID",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      code: "TOKEN_INVALID",
    });
  }

  try {
    const user = await User.findById(decoded.userId).maxTimeMS(15000);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    if (user.adminTerminatedAt) {
      return res.status(403).json({
        success: false,
        message: "This account has been disabled.",
        code: "ACCOUNT_ADMIN_TERMINATED",
      });
    }

    req.user = user;
    req.staffAuth = await resolveStaffAuthContext(user);
    next();
  } catch (err: any) {
    logger.error("Auth DB lookup failed (token may still be valid)", {
      userId: decoded.userId,
      error: err.message,
      path: req.path,
    });

    return res.status(503).json({
      success: false,
      message: "Database temporarily unavailable. Please retry.",
      code: "DB_UNAVAILABLE",
    });
  }
}

export async function authenticateOptional(req: AuthRequest, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    req.user = undefined;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId).maxTimeMS(15000);
    if (user) {
      req.user = user;
    }
  } catch {
    req.user = undefined;
  }

  next();
}

export function authorize(roles: string[] | string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userRole = req.user.role;
    const allowedRoles = typeof roles === "string" ? [roles] : roles;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: "Forbidden: insufficient permissions" });
    }

    next();
  };
}

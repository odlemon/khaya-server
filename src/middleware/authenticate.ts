// @ts-nocheck
// src/middleware/authenticate.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";

export interface AuthRequest extends Request {
  user?: IUser;
}

export function createToken(userId: string): string {
  return jwt.sign(
    { userId }, 
    JWT_SECRET, 
    { expiresIn: "7d" } // 7 days expiration
  );
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Instead of returning a response, call next with an error
    return next(new Error("Authorization token missing or malformed"));
  }

  const token = authHeader.split(" ")[1]; 

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId);
    if (!user) return next(new Error("User not found"));
    if (user.adminTerminatedAt) {
      return res.status(403).json({
        success: false,
        message: "This account has been disabled.",
        code: "ACCOUNT_ADMIN_TERMINATED",
      });
    }
    req.user = user;
    next();
  } catch (err) {
    // Check if error is due to token expiration
    if (err instanceof jwt.TokenExpiredError) {
      return next(new Error("Token has expired"));
    }
    return next(new Error("Invalid or expired token"));
  }
}

export async function authenticateOptional(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // No token provided, continue without authentication
    req.user = undefined;
    return next();
  }

  const token = authHeader.split(" ")[1]; 

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId);
    if (user) {
      req.user = user;
    }
    next();
  } catch (err) {
    // Token is invalid, but we continue without authentication
    req.user = undefined;
    next();
  }
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
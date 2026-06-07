// @ts-nocheck

/** Single source of truth for JWT signing/verification across the app. */
export const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

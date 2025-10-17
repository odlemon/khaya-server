// @ts-nocheck
// types.auth/index.d.ts

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: "tenant" | "landlord" | "admin";
  confirmPassword: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
  expiresIn: number;
}

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  isVerified: boolean;
}

// Add registrationResult interface here as requested
export interface RegistrationResult {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
}

export interface TokenPayload {
  id: number;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface EmailVerification {
  token: string;
}

export enum UserRole {
  TENANT = "tenant",
  LANDLORD = "landlord",
  ADMIN = "admin",
} 
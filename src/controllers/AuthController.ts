// @ts-nocheck

import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { EmailVerificationService } from "../services/EmailVerificationService";
import { TwoFactorAuthService } from "../services/TwoFactorAuthService";
import { PasswordResetService } from "../services/PasswordResetService";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/jwtConfig";
import { buildAuthLoginPayload } from "../utils/authLoginPayload";
import { resolveStaffAuthContext, isStaffPortalRole } from "../utils/staffAuth";

export class AuthController {
      async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, role, phone } = req.body;
  
      // Basic required fields check
      if (!email?.trim() || !password || !firstName?.trim() || !lastName?.trim()) {
        return res.status(400).json({ success: false, message: "All fields are required." });
      }
  
      // Role is now required during registration
      if (!role) {
        return res.status(400).json({ 
          success: false, 
          message: "User type is required. Please select 'tenant' or 'landlord'." 
        });
      }
  
      // Validate role - only tenant and landlord allowed during registration
      const validRoles = ["tenant", "landlord"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid user type. Must be 'tenant' or 'landlord'." 
        });
      }
  
      // Normalize inputs
      const normalizedEmail = email.trim().toLowerCase();
      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();
  
      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        // Soft-deleted account (was verified, then closed): do not allow re-use of email
        if (!existingUser.isActive && existingUser.isVerified) {
          return res.status(409).json({
            success: false,
            message: "This email is no longer available. Please use a different email address.",
          });
        }
        return res.status(409).json({
          success: false,
          message: "This email is already in use. Please use another email or try signing in.",
        });
      }
  
      // Create user with selected role (not verified initially)
      const user = new User({
        email: normalizedEmail,
        password,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        phone: phone?.trim(),
        role: role,
        isVerified: false, // Will be set to true after email verification
        isActive: false, // Will be set to true after email verification
      });
      await user.save();

      // Send verification email
      try {
        await EmailVerificationService.sendVerificationEmail({
          email: normalizedEmail,
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          role: role
        });

        return res.status(201).json({
          success: true,
          message: `Registration successful! Please check your email (${normalizedEmail}) for a 6-digit verification PIN to activate your ${role} account.`,
          data: {
            userId: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            phone: user.phone,
            isVerified: user.isVerified,
            requiresEmailVerification: true,
            message: "Check your email for verification PIN"
          },
        });
      } catch (emailError: any) {
        // ✨ If email fails, keep the user but log the error
        // User can resend verification email later via /api/email-verification/resend
        console.error("Email verification failed:", emailError);
        
        // Check if it's a resource limit error
        const isResourceLimitError = emailError?.code === 'TM_5001' || 
                                     emailError?.message?.includes('Resource Limit Exhausted');
        
        return res.status(201).json({
          success: true,
          message: `Registration successful! However, we couldn't send the verification email at this time. Please use the resend verification email feature to receive your PIN.`,
          data: {
            userId: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            phone: user.phone,
            isVerified: user.isVerified,
            requiresEmailVerification: true,
            emailSent: false,
            emailError: isResourceLimitError ? "Email service temporarily unavailable. Please resend verification email." : "Unable to send verification email. Please resend.",
            message: "Please resend verification email to activate your account"
          },
        });
      }
    } catch (error: any) {
      console.error("Registration error:", error);
  
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "This email is already in use. Please use another email or try signing in.",
        });
      }
  
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password required." });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = await User.findOne({ email: normalizedEmail }).maxTimeMS(15000);
      if (!user) {
        return res.status(401).json({ success: false, message: "Invalid credentials." });
      }

      if (user.adminTerminatedAt) {
        return res.status(403).json({
          success: false,
          message: "This account has been disabled. Please contact support if you believe this is an error.",
          code: "ACCOUNT_ADMIN_TERMINATED",
        });
      }

      // Inactive: unverified new signup (needs PIN) vs soft-deleted / deactivated (verified)
      if (!user.isActive) {
        if (user.isVerified) {
          return res.status(401).json({
            success: false,
            message: "This account is not active. Please contact an administrator.",
            code: "ACCOUNT_INACTIVE",
          });
        }
        return res.status(401).json({
          success: false,
          message: "Account is not verified. Please check your email for verification PIN to activate your account.",
          requiresEmailVerification: true,
        });
      }

      // Check if user is verified
      if (!user.isVerified) {
        return res.status(401).json({ 
          success: false, 
          message: "Email not verified. Please check your email for verification PIN to activate your account.",
          requiresEmailVerification: true
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid credentials." });
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        try {
          // Automatically send 2FA email
          await TwoFactorAuthService.send2FAEmail(
            user._id.toString(),
            user.email,
            user.firstName
          );
          
          // Get document verification status
          const documentVerificationStatus = user.documentVerification?.status || "unverified";
          const isDocumentVerified = documentVerificationStatus === "verified";

          return res.status(200).json({
            success: true,
            message: "2FA verification required. Check your email for the verification PIN.",
            requires2FA: true,
            data: {
              userId: user._id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              isDocumentVerified: isDocumentVerified,
              documentVerificationStatus: documentVerificationStatus
            }
          });
        } catch (emailError) {
          console.error("2FA email sending failed:", emailError);
          return res.status(500).json({
            success: false,
            message: "Unable to send 2FA verification email. Please try again."
          });
        }
      }

      const loginPayload = await buildAuthLoginPayload(user);

      return res.status(200).json({
        success: true,
        message: "Logged in successfully",
        token: loginPayload.token,
        user: loginPayload.user,
        permissions: loginPayload.permissions,
        portal: loginPayload.portal,
        isSuperAdmin: loginPayload.isSuperAdmin,
        mustChangePassword: loginPayload.mustChangePassword,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify 2FA PIN for login
   */
  async verify2FALogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, pin } = req.body;

      if (!userId || !pin) {
        return res.status(400).json({
          success: false,
          message: "User ID and PIN are required"
        });
      }

      if (!/^\d{6}$/.test(pin)) {
        return res.status(400).json({
          success: false,
          message: "PIN must be a 6-digit number"
        });
      }

      const result = await TwoFactorAuthService.verify2FAPin(userId, pin);

      if (result.success) {
        // Get user and generate token
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found"
          });
        }

        if (user.adminTerminatedAt) {
          return res.status(403).json({
            success: false,
            message: "This account has been disabled.",
            code: "ACCOUNT_ADMIN_TERMINATED",
          });
        }

        const loginPayload = await buildAuthLoginPayload(user);

        return res.status(200).json({
          success: true,
          message: "2FA verified successfully! Logged in.",
          token: loginPayload.token,
          user: {
            ...loginPayload.user,
            twoFactorEnabled: user.twoFactorEnabled,
          },
          permissions: loginPayload.permissions,
          portal: loginPayload.portal,
          isSuperAdmin: loginPayload.isSuperAdmin,
          mustChangePassword: loginPayload.mustChangePassword,
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error: any) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const user = await User.findById(userId).select("-password");

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (user.adminTerminatedAt) {
        return res.status(403).json({
          success: false,
          message: "This account has been disabled.",
          code: "ACCOUNT_ADMIN_TERMINATED",
        });
      }

      // Get document verification status
      const documentVerificationStatus = user.documentVerification?.status || "unverified";
      const isDocumentVerified = documentVerificationStatus === "verified";

      const staffAuth = await resolveStaffAuthContext(user);

      const responseData: Record<string, unknown> = {
        userId: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        isVerified: user.isVerified,
        isActive: user.isActive,
        isDocumentVerified,
        documentVerificationStatus,
        requiresOnboarding: !user.isVerified,
        profile: user.profile,
        preferences: user.preferences,
        settings: user.settings,
        isSuperAdmin: staffAuth.isSuperAdmin,
        mustChangePassword: !!user.mustChangePassword,
      };

      if (isStaffPortalRole(user.role)) {
        responseData.staffRole = staffAuth.staffRole;
        responseData.portal = staffAuth.portal;
        responseData.permissions = staffAuth.permissions;
      }

      res.status(200).json({
        success: true,
        data: responseData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request password reset email (public). Does not reveal whether the email exists.
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body || {};
      if (!email || typeof email !== "string" || !email.trim()) {
        return res.status(400).json({ success: false, message: "Email is required." });
      }

      try {
        await PasswordResetService.requestReset(email);
      } catch (sendErr: any) {
        console.error("Password reset email failed:", sendErr?.message || sendErr);
        return res.status(503).json({
          success: false,
          message: "Unable to send reset email at this time. Please try again later.",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "If an account exists for that email, password reset instructions have been sent. Check your inbox.",
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Complete password reset with token from email (public).
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword, confirmPassword } = req.body || {};
      if (confirmPassword !== undefined && confirmPassword !== newPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match." });
      }

      const result = await PasswordResetService.confirmReset(
        typeof token === "string" ? token : "",
        typeof newPassword === "string" ? newPassword : ""
      );

      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message });
      }

      return res.status(200).json({ success: true, message: result.message });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Authenticated password change (staff first-login or voluntary).
   */
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?._id;
      const { currentPassword, newPassword, confirmPassword } = req.body || {};

      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 8 characters.",
        });
      }

      if (confirmPassword !== undefined && confirmPassword !== newPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match." });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (!user.mustChangePassword) {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            message: "Current password is required.",
          });
        }
        const matches = await user.comparePassword(currentPassword);
        if (!matches) {
          return res.status(400).json({ success: false, message: "Current password is incorrect." });
        }
      }

      user.password = newPassword;
      user.mustChangePassword = false;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Password updated successfully.",
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Update user role (Admin only)
  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const currentUser = (req as any).user;

      // Check if current user is admin
      if (currentUser.role !== "admin") {
        return res.status(403).json({ success: false, message: "Only admins can update user roles." });
      }

      // Validate role
      const validRoles = [
        "tenant",
        "landlord",
        "admin",
        "insurance_admin",
        "bank_admin",
      ];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: "Invalid role." });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { role },
        { new: true, runValidators: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      res.status(200).json({
        success: true,
        message: "User role updated successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
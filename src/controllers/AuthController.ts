// @ts-nocheck

import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { EmailVerificationService } from "../services/EmailVerificationService";
import { TwoFactorAuthService } from "../services/TwoFactorAuthService";
import { PasswordResetService } from "../services/PasswordResetService";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

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
      const user = await User.findOne({ email: normalizedEmail });
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

      // Inactive: unverified new signup (needs PIN) vs soft-deleted (verified, then closed)
      if (!user.isActive) {
        if (user.isVerified) {
          return res.status(401).json({
            success: false,
            message: "This account does not exist.",
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

      const token = jwt.sign({
        userId: user._id,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      }, JWT_SECRET, { expiresIn: "7d" });

      // Get document verification status
      const documentVerificationStatus = user.documentVerification?.status || "unverified";
      const isDocumentVerified = documentVerificationStatus === "verified";

      return res.status(200).json({
        success: true,
        message: "Logged in successfully",
        token,
        user: {
          userId: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          phone: user.phone,
          isVerified: user.isVerified,
          isDocumentVerified: isDocumentVerified,
          documentVerificationStatus: documentVerificationStatus, // "unverified" | "pending" | "verified" | "rejected"
          requiresOnboarding: !user.isVerified, // If not verified, they need onboarding
        }
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

        const token = jwt.sign({
          userId: user._id,
          role: user.role,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        }, JWT_SECRET, { expiresIn: "7d" });

        // Get document verification status
        const documentVerificationStatus = user.documentVerification?.status || "unverified";
        const isDocumentVerified = documentVerificationStatus === "verified";

        return res.status(200).json({
          success: true,
          message: "2FA verified successfully! Logged in.",
          token,
          user: {
            userId: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            phone: user.phone,
            isVerified: user.isVerified,
            isDocumentVerified: isDocumentVerified,
            documentVerificationStatus: documentVerificationStatus, // "unverified" | "pending" | "verified" | "rejected"
            twoFactorEnabled: user.twoFactorEnabled
          }
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

      res.status(200).json({
        success: true,
        data: {
          userId: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          phone: user.phone,
          isVerified: user.isVerified,
          isActive: user.isActive,
          isDocumentVerified: isDocumentVerified,
          documentVerificationStatus: documentVerificationStatus, // "unverified" | "pending" | "verified" | "rejected"
          requiresOnboarding: !user.isVerified, // If not verified, they need onboarding
          profile: user.profile,
          preferences: user.preferences,
          settings: user.settings,
        },
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
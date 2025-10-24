// @ts-nocheck

import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { EmailVerificationService } from "../services/EmailVerificationService";
import { TwoFactorAuthService } from "../services/TwoFactorAuthService";
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
        return res.status(409).json({ success: false, message: "Email already registered." });
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
      } catch (emailError) {
        // If email fails, delete the user and return error
        await User.findByIdAndDelete(user._id);
        console.error("Email verification failed:", emailError);
        return res.status(500).json({
          success: false,
          message: "Registration failed. Unable to send verification email. Please try again."
        });
      }
    } catch (error: any) {
      console.error("Registration error:", error);
  
      if (error.code === 11000) {
        return res.status(409).json({ success: false, message: "Email already registered." });
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

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ 
          success: false, 
          message: "Account is not verified. Please check your email for verification PIN to activate your account.",
          requiresEmailVerification: true
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
          
          return res.status(200).json({
            success: true,
            message: "2FA verification required. Check your email for the verification PIN.",
            requires2FA: true,
            data: {
              userId: user._id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role
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

        const token = jwt.sign({
          userId: user._id,
          role: user.role,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        }, JWT_SECRET, { expiresIn: "7d" });

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
      const validRoles = ["tenant", "landlord", "admin"];
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
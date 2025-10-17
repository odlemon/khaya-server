// @ts-nocheck

import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
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
  
      // Create user with selected role
      const user = new User({
        email: normalizedEmail,
        password,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        phone: phone?.trim(),
        role: role,
        isVerified: false, // Will be set to true after onboarding completion
        isActive: true,
      });
      await user.save();
  
      // Generate JWT token for immediate login
      const token = jwt.sign({
        userId: user._id,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      }, JWT_SECRET, { expiresIn: "7d" });
  
      return res.status(201).json({
        success: true,
        message: `Welcome to Khayalami! You've registered as a ${role}. Please complete your onboarding to get started.`,
        token,
        data: {
          userId: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          phone: user.phone,
          isVerified: user.isVerified,
          requiresOnboarding: true,
        },
      });
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
        return res.status(401).json({ success: false, message: "Account is deactivated. Please contact support." });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid credentials." });
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
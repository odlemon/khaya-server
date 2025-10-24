// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { TwoFactorAuthService } from "../services/TwoFactorAuthService";
import { User } from "../models/User";

export class TwoFactorAuthController {
  /**
   * Get user settings including 2FA status
   */
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      
      const user = await User.findById(userId).select("email firstName lastName twoFactorEnabled");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Settings retrieved successfully",
        data: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          twoFactorEnabled: user.twoFactorEnabled || false
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Toggle 2FA status and send verification email if enabling
   */
  async toggle2FA(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { enable } = req.body;

      if (typeof enable !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: "Enable field must be a boolean (true/false)"
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (enable && !user.twoFactorEnabled) {
        // Enable 2FA - send verification email
        try {
          const result = await TwoFactorAuthService.send2FAEmail(
            userId,
            user.email,
            user.firstName
          );

          res.status(200).json({
            success: true,
            message: "2FA setup initiated. Please check your email for verification code.",
            data: {
              twoFactorEnabled: false, // Still false until verified
              requiresVerification: true,
              expiresAt: result.expiresAt
            }
          });
        } catch (emailError) {
          console.error("Failed to send 2FA email:", emailError);
          return res.status(500).json({
            success: false,
            message: "Failed to send verification email. Please try again."
          });
        }
      } else if (!enable && user.twoFactorEnabled) {
        // Disable 2FA
        user.twoFactorEnabled = false;
        await user.save();

        res.status(200).json({
          success: true,
          message: "2FA has been disabled successfully",
          data: {
            twoFactorEnabled: false
          }
        });
      } else {
        // No change needed
        res.status(200).json({
          success: true,
          message: `2FA is already ${user.twoFactorEnabled ? 'enabled' : 'disabled'}`,
          data: {
            twoFactorEnabled: user.twoFactorEnabled
          }
        });
      }
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Verify 2FA PIN and enable 2FA
   */
  async verify2FA(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { pin } = req.body;

      if (!pin || !/^\d{6}$/.test(pin)) {
        return res.status(400).json({
          success: false,
          message: "PIN must be a 6-digit number"
        });
      }

      const result = await TwoFactorAuthService.verify2FAPin(userId, pin);

      if (result.success) {
        // Enable 2FA for user
        await User.findByIdAndUpdate(userId, { twoFactorEnabled: true });

        res.status(200).json({
          success: true,
          message: "2FA has been enabled successfully! Your account is now more secure.",
          data: {
            twoFactorEnabled: true
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Resend 2FA code during login
   */
  async resend2FACode(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required"
        });
      }

      // Get user details
      const user = await User.findById(userId).select("email firstName lastName twoFactorEnabled");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (!user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          message: "2FA is not enabled for this user"
        });
      }

      // Send new 2FA email
      await TwoFactorAuthService.send2FAEmail(
        userId,
        user.email,
        user.firstName
      );

      res.status(200).json({
        success: true,
        message: "2FA code resent successfully. Check your email for the new verification PIN."
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const twoFactorAuthController = new TwoFactorAuthController();

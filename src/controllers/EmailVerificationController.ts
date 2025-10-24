// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { EmailVerificationService } from "../services/EmailVerificationService";

export class EmailVerificationController {
  /**
   * Send verification email
   */
  async sendVerificationEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, firstName, lastName, role } = req.body;

      // Validate required fields
      if (!email || !firstName || !lastName || !role) {
        return res.status(400).json({
          success: false,
          message: "Email, firstName, lastName, and role are required"
        });
      }

      // Validate role
      if (!["tenant", "landlord", "admin"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Role must be tenant, landlord, or admin"
        });
      }

      const result = await EmailVerificationService.sendVerificationEmail({
        email,
        firstName,
        lastName,
        role
      });

      res.status(200).json({
        success: true,
        message: "Verification email sent successfully",
        data: {
          email,
          expiresAt: result.expiresAt,
          // Don't return PIN in production
          ...(process.env.NODE_ENV === 'development' && { pin: result.pin })
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Verify PIN and activate account
   */
  async verifyPin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, pin } = req.body;

      // Validate required fields
      if (!email || !pin) {
        return res.status(400).json({
          success: false,
          message: "Email and PIN are required"
        });
      }

      // Validate PIN format
      if (!/^\d{6}$/.test(pin)) {
        return res.status(400).json({
          success: false,
          message: "PIN must be a 6-digit number"
        });
      }

      const result = await EmailVerificationService.verifyPin(email, pin);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            user: result.user,
            verified: true
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
   * Resend verification email
   */
  async resendVerificationEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required"
        });
      }

      const result = await EmailVerificationService.resendVerificationEmail(email);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message
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
}

export const emailVerificationController = new EmailVerificationController();

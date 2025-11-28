// @ts-nocheck
import { Request, Response } from "express";
import { landlordSubscriptionService } from "../services/LandlordSubscriptionService";
import { emailNotificationService } from "../services/EmailNotificationService";
import { User } from "../models/User";
import { authenticate, authorize } from "../middleware/authenticate";

export class LandlordSubscriptionController {
  /**
   * Subscribe to premium features (in-app payment)
   * POST /api/landlord/subscription/subscribe
   */
  async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const landlordId = (req as any).user?.userId || (req as any).user?.id;
      const { planType, paymentMethod, gatewayResponse, autoRenew } = req.body;

      if (!planType || !paymentMethod) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: planType, paymentMethod"
        });
        return;
      }

      if (!["premium", "premium_plus"].includes(planType)) {
        res.status(400).json({
          success: false,
          message: "Invalid plan type. Must be 'premium' or 'premium_plus'"
        });
        return;
      }

      if (paymentMethod === "in_app" && !gatewayResponse) {
        res.status(400).json({
          success: false,
          message: "Gateway response required for in-app payments"
        });
        return;
      }

      if (paymentMethod === "external") {
        res.status(400).json({
          success: false,
          message: "Use /api/landlord/subscription/request for external payments"
        });
        return;
      }

      const result = await landlordSubscriptionService.subscribe({
        landlordId,
        planType,
        paymentMethod: "in_app",
        gatewayResponse,
        autoRenew: autoRenew !== false
      });

      // Send email notification
      try {
        const landlord = await User.findById(landlordId);
        if (landlord) {
          // TODO: Add subscription confirmation email
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      res.status(200).json({
        success: true,
        message: "Subscription activated successfully",
        data: result
      });
    } catch (error: any) {
      console.error("Error subscribing:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to subscribe"
      });
    }
  }

  /**
   * Create subscription payment request (external payment)
   * POST /api/landlord/subscription/request
   */
  async createSubscriptionRequest(req: Request, res: Response): Promise<void> {
    try {
      const landlordId = (req as any).user?.userId || (req as any).user?.id;
      const { planType, proofOfPayment, paymentMethod, autoRenew, notes } = req.body;

      if (!planType || !proofOfPayment || !paymentMethod) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: planType, proofOfPayment, paymentMethod"
        });
        return;
      }

      if (!["premium", "premium_plus"].includes(planType)) {
        res.status(400).json({
          success: false,
          message: "Invalid plan type. Must be 'premium' or 'premium_plus'"
        });
        return;
      }

      const paymentRequest = await landlordSubscriptionService.createSubscriptionPaymentRequest({
        landlordId,
        planType,
        proofOfPayment,
        paymentMethod,
        autoRenew: autoRenew !== false,
        notes
      });

      // Send email notification
      try {
        const landlord = await User.findById(landlordId);
        if (landlord) {
          // TODO: Add subscription request submitted email
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      res.status(201).json({
        success: true,
        message: "Subscription payment request submitted successfully",
        data: paymentRequest
      });
    } catch (error: any) {
      console.error("Error creating subscription request:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create subscription request"
      });
    }
  }

  /**
   * Get subscription status
   * GET /api/landlord/subscription/status
   */
  async getSubscriptionStatus(req: Request, res: Response): Promise<void> {
    try {
      const landlordId = (req as any).user?.userId || (req as any).user?.id;

      const status = await landlordSubscriptionService.getSubscriptionStatus(landlordId);

      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error: any) {
      console.error("Error getting subscription status:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get subscription status"
      });
    }
  }

  /**
   * Cancel subscription
   * POST /api/landlord/subscription/cancel
   */
  async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      const landlordId = (req as any).user?.userId || (req as any).user?.id;

      await landlordSubscriptionService.cancelSubscription(landlordId);

      res.status(200).json({
        success: true,
        message: "Subscription cancelled successfully"
      });
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to cancel subscription"
      });
    }
  }

  /**
   * Subscribe to Zero Deposit Protection (in-app payment)
   * POST /api/landlord/subscription/zero-deposit-protection
   */
  async subscribeToZeroDepositProtection(req: Request, res: Response): Promise<void> {
    try {
      const landlordId = (req as any).user?.userId || (req as any).user?.id;
      const { paymentMethod, gatewayResponse, autoRenew, propertyCount } = req.body;

      if (!paymentMethod) {
        res.status(400).json({
          success: false,
          message: "Missing required field: paymentMethod"
        });
        return;
      }

      if (paymentMethod === "in_app" && !gatewayResponse) {
        res.status(400).json({
          success: false,
          message: "Gateway response required for in-app payments"
        });
        return;
      }

      if (paymentMethod === "external") {
        res.status(400).json({
          success: false,
          message: "Use /api/landlord/subscription/zero-deposit-protection/request for external payments"
        });
        return;
      }

      const result = await landlordSubscriptionService.subscribeToZeroDepositProtection({
        landlordId,
        paymentMethod: "in_app",
        gatewayResponse,
        autoRenew: autoRenew !== false,
        propertyCount
      });

      res.status(200).json({
        success: true,
        message: "Zero Deposit Protection subscription activated successfully",
        data: result
      });
    } catch (error: any) {
      console.error("Error subscribing to zero deposit protection:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to subscribe"
      });
    }
  }

  /**
   * Create zero deposit protection payment request (external payment)
   * POST /api/landlord/subscription/zero-deposit-protection/request
   */
  async createZeroDepositProtectionRequest(req: Request, res: Response): Promise<void> {
    try {
      const landlordId = (req as any).user?.userId || (req as any).user?.id;
      const { proofOfPayment, paymentMethod, autoRenew, propertyCount, notes } = req.body;

      if (!proofOfPayment || !paymentMethod) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: proofOfPayment, paymentMethod"
        });
        return;
      }

      const paymentRequest = await landlordSubscriptionService.createZeroDepositProtectionRequest({
        landlordId,
        proofOfPayment,
        paymentMethod,
        autoRenew: autoRenew !== false,
        propertyCount,
        notes
      });

      res.status(201).json({
        success: true,
        message: "Zero Deposit Protection payment request submitted successfully",
        data: paymentRequest
      });
    } catch (error: any) {
      console.error("Error creating zero deposit protection request:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create payment request"
      });
    }
  }

  /**
   * Get zero deposit protection status
   * GET /api/landlord/subscription/zero-deposit-protection/status
   */
  async getZeroDepositProtectionStatus(req: Request, res: Response): Promise<void> {
    try {
      const landlordId = (req as any).user?.userId || (req as any).user?.id;

      const status = await landlordSubscriptionService.getZeroDepositProtectionStatus(landlordId);

      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error: any) {
      console.error("Error getting zero deposit protection status:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get status"
      });
    }
  }

  /**
   * Cancel zero deposit protection subscription
   * POST /api/landlord/subscription/zero-deposit-protection/cancel
   */
  async cancelZeroDepositProtection(req: Request, res: Response): Promise<void> {
    try {
      const landlordId = (req as any).user?.userId || (req as any).user?.id;

      await landlordSubscriptionService.cancelZeroDepositProtection(landlordId);

      res.status(200).json({
        success: true,
        message: "Zero Deposit Protection subscription cancelled successfully"
      });
    } catch (error: any) {
      console.error("Error cancelling zero deposit protection:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to cancel subscription"
      });
    }
  }
}

export const landlordSubscriptionController = new LandlordSubscriptionController();


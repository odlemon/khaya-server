// @ts-nocheck
import { Request, Response } from "express";
import { landlordPreferencesService } from "../services/LandlordPreferencesService";
import { authenticate, authorize } from "../middleware/authenticate";

export class LandlordPreferencesController {
  /**
   * Get landlord preferences
   * GET /api/landlord/preferences
   */
  async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const landlordId = (req as any).user?.userId || (req as any).user?.id;
      
      if (!landlordId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const preferences = await landlordPreferencesService.getOrCreatePreferences(landlordId);

      res.status(200).json({
        success: true,
        data: preferences
      });
    } catch (error: any) {
      console.error("Error getting landlord preferences:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get preferences"
      });
    }
  }

  /**
   * Update payment reception method
   * PATCH /api/landlord/preferences/payment-reception
   */
  async updatePaymentReception(req: Request, res: Response): Promise<void> {
    try {
      const landlordId = (req as any).user?.userId || (req as any).user?.id;
      
      if (!landlordId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { method, bankDetails, mobileMoneyDetails, paypalDetails } = req.body;

      if (!method || !["bank_transfer", "mobile_money", "paypal", "cash"].includes(method)) {
        res.status(400).json({
          success: false,
          message: "Invalid payment reception method"
        });
        return;
      }

      // Validate required details based on method
      if (method === "bank_transfer" && !bankDetails) {
        res.status(400).json({
          success: false,
          message: "Bank details are required for bank transfer"
        });
        return;
      }

      // Mobile money details are optional
      if (method === "mobile_money" && mobileMoneyDetails) {
        // If provided, use them, but not required
      }

      if (method === "paypal" && !paypalDetails) {
        res.status(400).json({
          success: false,
          message: "PayPal details are required"
        });
        return;
      }

      const preferences = await landlordPreferencesService.updatePaymentReceptionMethod(
        landlordId,
        method,
        { bankDetails, mobileMoneyDetails, paypalDetails }
      );

      res.status(200).json({
        success: true,
        message: "Payment reception method updated successfully",
        data: preferences
      });
    } catch (error: any) {
      console.error("Error updating payment reception method:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update payment reception method"
      });
    }
  }

  /**
   * Update subscription payment method
   * PATCH /api/landlord/preferences/subscription-payment
   */
  async updateSubscriptionPayment(req: Request, res: Response): Promise<void> {
    try {
      const landlordId = (req as any).user?.userId || (req as any).user?.id;
      
      if (!landlordId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { method, subscriptionDetails } = req.body;

      if (!method || !["no_subscription", "via_rent", "pay_yourself"].includes(method)) {
        res.status(400).json({
          success: false,
          message: "Invalid subscription payment method. Must be: no_subscription, via_rent, or pay_yourself"
        });
        return;
      }

      const preferences = await landlordPreferencesService.updateSubscriptionPaymentMethod(
        landlordId,
        method,
        subscriptionDetails
      );

      res.status(200).json({
        success: true,
        message: "Subscription payment method updated successfully",
        data: preferences
      });
    } catch (error: any) {
      console.error("Error updating subscription payment method:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update subscription payment method"
      });
    }
  }

  /**
   * Update premium features subscription
   * PATCH /api/landlord/preferences/premium-features
   */
  async updatePremiumFeatures(req: Request, res: Response): Promise<void> {
    try {
      const landlordId = (req as any).user?.userId || (req as any).user?.id;
      
      if (!landlordId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { isSubscribed, planType, subscriptionId, startDate, endDate, autoRenew } = req.body;

      const preferences = await landlordPreferencesService.updatePremiumFeatures(
        landlordId,
        {
          isSubscribed: isSubscribed || false,
          planType,
          subscriptionId,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          autoRenew
        }
      );

      res.status(200).json({
        success: true,
        message: "Premium features updated successfully",
        data: preferences
      });
    } catch (error: any) {
      console.error("Error updating premium features:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update premium features"
      });
    }
  }
}

export const landlordPreferencesController = new LandlordPreferencesController();


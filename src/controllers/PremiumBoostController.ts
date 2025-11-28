// @ts-nocheck
import { Request, Response } from "express";
import { premiumBoostService } from "../services/PremiumBoostService";
import { emailNotificationService } from "../services/EmailNotificationService";
import { User } from "../models/User";
import { Property } from "../models/Property";
import { authenticate, authorize } from "../middleware/authenticate";

export class PremiumBoostController {
  /**
   * Purchase premium boost (in-app payment)
   * POST /api/properties/:propertyId/boost
   */
  async purchaseBoost(req: Request, res: Response): Promise<void> {
    try {
      // req.user is the full User document with _id field (MongoDB ObjectId)
      const landlordId = (req as any).user?._id?.toString() || (req as any).user?._id || (req as any).user?.id || (req as any).user?.userId;
      const { propertyId } = req.params;
      const { duration, paymentMethod, gatewayResponse } = req.body;

      if (!duration || !paymentMethod) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: duration, paymentMethod"
        });
        return;
      }

      if (![7, 30, 90].includes(duration)) {
        res.status(400).json({
          success: false,
          message: "Invalid duration. Must be 7, 30, or 90 days"
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
          message: "Use /api/properties/:propertyId/boost/request for external payments"
        });
        return;
      }

      const result = await premiumBoostService.purchaseBoost({
        propertyId,
        landlordId,
        duration,
        paymentMethod: "in_app",
        gatewayResponse
      });

      // Send email notification
      try {
        const landlord = await User.findById(landlordId);
        if (landlord) {
          // TODO: Add boost purchase confirmation email
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      res.status(200).json({
        success: true,
        message: "Premium boost purchased successfully",
        data: result
      });
    } catch (error: any) {
      console.error("Error purchasing boost:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to purchase boost"
      });
    }
  }

  /**
   * Create boost payment request (external payment)
   * POST /api/properties/:propertyId/boost/request
   */
  async createBoostPaymentRequest(req: Request, res: Response): Promise<void> {
    try {
      // req.user is the full User document with _id field (MongoDB ObjectId)
      const landlordId = (req as any).user?._id?.toString() || (req as any).user?._id || (req as any).user?.id || (req as any).user?.userId;
      const { propertyId } = req.params;
      const { duration, proofOfPayment, paymentMethod, notes } = req.body;

      if (!duration || !proofOfPayment || !paymentMethod) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: duration, proofOfPayment, paymentMethod"
        });
        return;
      }

      if (![7, 30, 90].includes(duration)) {
        res.status(400).json({
          success: false,
          message: "Invalid duration. Must be 7, 30, or 90 days"
        });
        return;
      }

      const paymentRequest = await premiumBoostService.createBoostPaymentRequest({
        propertyId,
        landlordId,
        duration,
        proofOfPayment,
        paymentMethod,
        notes
      });

      // Send email notification
      try {
        const landlord = await User.findById(landlordId);
        if (landlord) {
          // TODO: Add boost request submitted email
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      res.status(201).json({
        success: true,
        message: "Boost payment request submitted successfully",
        data: paymentRequest
      });
    } catch (error: any) {
      console.error("Error creating boost payment request:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create boost payment request"
      });
    }
  }

  /**
   * Get boost history for property
   * GET /api/properties/:propertyId/boosts
   */
  async getPropertyBoosts(req: Request, res: Response): Promise<void> {
    try {
      const { propertyId } = req.params;
      // req.user is the full User document with _id field (MongoDB ObjectId)
      const landlordId = (req as any).user?._id?.toString() || (req as any).user?._id || (req as any).user?.id || (req as any).user?.userId;

      // Verify property ownership
      const property = await Property.findById(propertyId);
      if (!property) {
        res.status(404).json({
          success: false,
          message: "Property not found"
        });
        return;
      }

      if (property.landlordId.toString() !== landlordId) {
        res.status(403).json({
          success: false,
          message: "Access denied"
        });
        return;
      }

      const boosts = await premiumBoostService.getPropertyBoosts(propertyId);
      const hasActive = await premiumBoostService.hasActiveBoost(propertyId);

      res.status(200).json({
        success: true,
        data: {
          boosts,
          hasActiveBoost: hasActive,
          property: {
            _id: property._id,
            title: property.title,
            isFeatured: property.isFeatured
          }
        }
      });
    } catch (error: any) {
      console.error("Error getting property boosts:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get property boosts"
      });
    }
  }
}

export const premiumBoostController = new PremiumBoostController();


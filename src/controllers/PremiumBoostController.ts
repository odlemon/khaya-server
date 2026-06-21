// @ts-nocheck
import { Request, Response } from "express";
import { premiumBoostService } from "../services/PremiumBoostService";
import { paymentGatewayService } from "../services/PaymentGatewayService";
import { buildGatewayPaymentFields } from "../utils/paymentGatewayFields";
import { emailNotificationService } from "../services/EmailNotificationService";
import { Payment } from "../models/Payment";
import { User } from "../models/User";
import { Property } from "../models/Property";
import { authenticate, authorize } from "../middleware/authenticate";
import { Types } from "mongoose";

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
      const { duration, paymentMethod } = req.body;

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

      if (paymentMethod === "external") {
        res.status(400).json({ success: false, message: "Use /api/properties/:propertyId/boost/request for external payments" });
        return;
      }

      const { phone, mobileMethod } = req.body;
      if (!phone) {
        res.status(400).json({
          success: false,
          message: "Phone number is required for EcoCash online payments",
        });
        return;
      }

      const priceMap: Record<number, number> = { 7: 5, 30: 15, 90: 35 };
      const price = priceMap[duration] || 15;
      const reference = paymentGatewayService.generateReference("BOOST", landlordId);
      const gatewayMeta = { paymentPurpose: "premium_boost", duration, propertyId };

      const pendingPayment = await Payment.create({
        rentalId: null,
        agreementId: null,
        propertyId: new Types.ObjectId(propertyId),
        landlordId: new Types.ObjectId(landlordId),
        tenantId: new Types.ObjectId(landlordId),
        paymentType: "service",
        amount: price,
        totalAmount: price,
        paymentMethod: "in_app",
        status: "pending",
        notes: `Premium boost - ${duration} days`,
        ...buildGatewayPaymentFields(reference, gatewayMeta),
      });

      const gatewayResult = await paymentGatewayService.initiateMobilePayment({
        reference,
        description: `Premium boost ${duration} days`,
        amount: price,
        phone,
        method: mobileMethod || "ecocash",
      });

      if (!gatewayResult.success) {
        pendingPayment.status = "cancelled";
        pendingPayment.rejectionReason = gatewayResult.error;
        await pendingPayment.save();
        res.status(400).json({ success: false, message: gatewayResult.error || "Payment initiation failed" });
        return;
      }

      if (gatewayResult.pollUrl) {
        pendingPayment.pollUrl = gatewayResult.pollUrl;
        await pendingPayment.save();
      }

      res.status(201).json({
        success: true,
        message: "Boost payment initiated. Check your phone.",
        data: {
          paymentId: pendingPayment._id,
          reference,
          pollUrl: gatewayResult.pollUrl || null,
          instructions: gatewayResult.instructions,
          statusCheckUrl: `/api/webhooks/payment-status/${pendingPayment._id}`,
          gateway: paymentGatewayService.provider,
        },
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


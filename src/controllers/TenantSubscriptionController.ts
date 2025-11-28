// @ts-nocheck
import { Request, Response } from "express";
import { subscriptionService } from "../services/SubscriptionService";
import { PaymentRequest } from "../models/PaymentRequest";
import { Payment } from "../models/Payment";
import { Rental } from "../models/Rental";
import { Property } from "../models/Property";
import { revenueSourceService } from "../services/RevenueSourceService";
import { Types } from "mongoose";

export class TenantSubscriptionController {
  /**
   * Subscribe to zero-deposit access (in-app payment)
   * POST /api/tenant/subscription/subscribe
   */
  async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?._id?.toString() || (req as any).user?._id || (req as any).user?.id || (req as any).user?.userId;
      if (!tenantId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { planType, propertyValueBracket, gatewayResponse, autoRenew } = req.body;

      if (!planType || !propertyValueBracket) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: planType, propertyValueBracket"
        });
        return;
      }

      if (!["premium", "premium_plus"].includes(planType)) {
        res.status(400).json({
          success: false,
          message: "Invalid planType. Must be 'premium' or 'premium_plus'"
        });
        return;
      }

      if (!["low", "medium", "high"].includes(propertyValueBracket)) {
        res.status(400).json({
          success: false,
          message: "Invalid propertyValueBracket. Must be 'low', 'medium', or 'high'"
        });
        return;
      }

      if (!gatewayResponse) {
        res.status(400).json({
          success: false,
          message: "Gateway response required for in-app payments"
        });
        return;
      }

      // Check if tenant already has an active account-level subscription
      const existingSubscription = await subscriptionService.getActiveSubscription(tenantId);
      if (existingSubscription && existingSubscription.status === "active" && new Date(existingSubscription.endDate) >= new Date()) {
        res.status(400).json({
          success: false,
          message: "You already have an active subscription"
        });
        return;
      }

      // Calculate price
      const price = subscriptionService["calculatePrice"](propertyValueBracket, planType);

      // Create payment (no rentalId for account-level subscription)
      const payment = await Payment.create({
        rentalId: null,
        agreementId: null,
        propertyId: null,
        landlordId: new Types.ObjectId(tenantId), // Tenant pays for their own subscription
        tenantId: new Types.ObjectId(tenantId),
        paymentType: "service",
        amount: price,
        totalAmount: price,
        paymentMethod: "in_app",
        status: "verified",
        verifiedAt: new Date(),
        gatewayResponse,
        notes: `Tenant subscription - ${planType}`
      });

      // Create account-level subscription (no rentalId)
      const subscription = await subscriptionService.createSubscription({
        tenantId,
        planType,
        propertyValueBracket
      });

      // Create revenue source
      const revenueSource = await revenueSourceService.createRevenueSource({
        sourceType: "subscription",
        amount: price,
        payerId: tenantId,
        recipientId: "khayalami",
        paymentId: payment._id.toString(),
        rentalId: undefined, // Account-level subscription
        description: `Tenant subscription - ${planType}`,
        notes: `Monthly subscription for zero-deposit access`,
        status: "collected" // In-app payment is immediately collected
      });

      // Add the subscription payment to escrow for accounting (100% to Khayalami)
      const { escrowService } = await import("../services/EscrowService");
      await escrowService.addToEscrow(payment, {
        deductions: {
          subscriptionFee: 0,
          processingFee: 0,
          insurancePremium: 0
        },
        revenueSourceIds: [revenueSource._id.toString()]
      });
      await escrowService.updateEscrowStatus(payment._id.toString(), "held");

      res.status(200).json({
        success: true,
        message: "Subscription activated successfully",
        data: {
          subscription,
          revenueSource,
          payment
        }
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
   * POST /api/tenant/subscription/request
   */
  async createSubscriptionRequest(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?._id?.toString() || (req as any).user?._id || (req as any).user?.id || (req as any).user?.userId;
      if (!tenantId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { planType, propertyValueBracket, proofOfPayment, paymentMethod, autoRenew, notes } = req.body;

      if (!planType || !propertyValueBracket || !proofOfPayment || !paymentMethod) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: planType, propertyValueBracket, proofOfPayment, paymentMethod"
        });
        return;
      }

      if (!["premium", "premium_plus"].includes(planType)) {
        res.status(400).json({
          success: false,
          message: "Invalid planType. Must be 'premium' or 'premium_plus'"
        });
        return;
      }

      if (!["low", "medium", "high"].includes(propertyValueBracket)) {
        res.status(400).json({
          success: false,
          message: "Invalid propertyValueBracket. Must be 'low', 'medium', or 'high'"
        });
        return;
      }

      // Check if tenant already has an active account-level subscription
      const existingSubscription = await subscriptionService.getActiveSubscription(tenantId);
      if (existingSubscription && existingSubscription.status === "active" && new Date(existingSubscription.endDate) >= new Date()) {
        res.status(400).json({
          success: false,
          message: "You already have an active subscription"
        });
        return;
      }

      // Calculate price
      const price = subscriptionService["calculatePrice"](propertyValueBracket, planType);

      // Create payment request (account-level, no rentalId)
      const paymentRequest = await PaymentRequest.create({
        tenantId: new Types.ObjectId(tenantId),
        rentalId: undefined,
        agreementId: undefined,
        propertyId: undefined,
        landlordId: new Types.ObjectId(tenantId), // Tenant pays for their own subscription
        requestType: "tenant_subscription",
        amount: price,
        paymentMethod,
        proofOfPayment,
        status: "pending_admin_approval",
        submittedAt: new Date(),
        notes: `Tenant subscription - ${planType}. Auto-renew: ${autoRenew !== false}. ${notes || ""}`
      });

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
   * GET /api/tenant/subscription/status
   */
  async getSubscriptionStatus(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?._id?.toString() || (req as any).user?._id || (req as any).user?.id || (req as any).user?.userId;
      if (!tenantId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      // Check account-level subscription (rentalId is optional for backward compatibility)
      const { rentalId } = req.query;
      const status = await subscriptionService.checkSubscriptionStatus(tenantId, rentalId as string | undefined);

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
   * Get subscription history
   * GET /api/tenant/subscription/history
   */
  async getSubscriptionHistory(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?._id?.toString() || (req as any).user?._id || (req as any).user?.id || (req as any).user?.userId;
      if (!tenantId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { Subscription } = await import("../models/Subscription");
      // Get account-level subscriptions (rentalId is null) for this tenant
      const subscriptions = await Subscription.find({
        tenantId: new Types.ObjectId(tenantId),
        rentalId: null // Account-level only
      })
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: subscriptions
      });
    } catch (error: any) {
      console.error("Error getting subscription history:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get subscription history"
      });
    }
  }

  /**
   * Cancel subscription
   * POST /api/tenant/subscription/cancel
   */
  async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?._id?.toString() || (req as any).user?._id || (req as any).user?.id || (req as any).user?.userId;
      if (!tenantId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        res.status(400).json({
          success: false,
          message: "Missing required field: subscriptionId"
        });
        return;
      }

      const { Subscription } = await import("../models/Subscription");
      const subscription = await Subscription.findById(subscriptionId);

      if (!subscription) {
        res.status(404).json({ success: false, message: "Subscription not found" });
        return;
      }

      if (subscription.tenantId.toString() !== tenantId.toString()) {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }

      await subscriptionService.cancelSubscription(subscriptionId);

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
}

export const tenantSubscriptionController = new TenantSubscriptionController();




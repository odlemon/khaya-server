// @ts-nocheck
import { Request, Response } from "express";
import { paymentRequestService } from "../services/PaymentRequestService";
import { premiumBoostService } from "../services/PremiumBoostService";
import { landlordSubscriptionService } from "../services/LandlordSubscriptionService";
import { emailNotificationService } from "../services/EmailNotificationService";
import { User } from "../models/User";
import { Property } from "../models/Property";

export class PaymentRequestController {
  /**
   * Create payment request (tenant submits external payment)
   * POST /api/payment-requests
   */
  async createPaymentRequest(req: Request, res: Response): Promise<void> {
    try {
      // Extract user ID - req.user is the full User document with _id field
      const userId = (req as any).user?._id?.toString() || (req as any).user?._id || (req as any).user?.id || (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { rentalId, agreementId, amount, proofOfPayment, paymentMethod, notes, requestType, propertyId } = req.body;

      // Validate required fields
      if (!amount || !proofOfPayment || !paymentMethod) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: amount, proofOfPayment, paymentMethod"
        });
        return;
      }

      // rentalId is only required for rent payments
      const requestTypeValue = requestType || "rent";
      if (requestTypeValue === "rent" && !rentalId) {
        res.status(400).json({
          success: false,
          message: "Missing required field: rentalId (required for rent payments)"
        });
        return;
      }

      // agreementId is required for agreement_fee payments
      if (requestTypeValue === "agreement_fee" && !agreementId) {
        res.status(400).json({
          success: false,
          message: "Missing required field: agreementId (required for agreement fee payment requests)"
        });
        return;
      }

      // propertyId is required for boost payments
      if (requestTypeValue === "premium_boost" && !propertyId) {
        res.status(400).json({
          success: false,
          message: "Missing required field: propertyId (required for boost payment requests)"
        });
        return;
      }

      // For non-rent payments (boost, subscriptions), landlordId is the authenticated user
      // For rent payments, landlordId comes from the rental
      // For agreement_fee, landlordId comes from the agreement (handled in service)
      const landlordId = (requestTypeValue !== "rent" && requestTypeValue !== "agreement_fee") ? userId : undefined;

      // Create payment request
      const paymentRequest = await paymentRequestService.createPaymentRequest({
        tenantId: userId,
        rentalId: rentalId || undefined, // Optional for non-rent payments
        agreementId: agreementId || undefined, // Required for agreement_fee payments
        amount,
        proofOfPayment,
        paymentMethod,
        notes,
        requestType: requestTypeValue,
        landlordId: landlordId, // Automatically set from token for non-rent payments (except agreement_fee)
        propertyId: propertyId || undefined // Required for boost payments
      });

      // Get tenant details for email
      const tenant = await User.findById(userId);
      if (tenant) {
        await emailNotificationService.sendPaymentRequestSubmitted({
          tenantEmail: tenant.email,
          tenantName: `${tenant.firstName} ${tenant.lastName}`,
          amount,
          requestId: paymentRequest._id.toString()
        });
      }

      // TODO: Send email to admin about new payment request

      res.status(201).json({
        success: true,
        message: "Payment request submitted successfully",
        data: paymentRequest
      });
    } catch (error: any) {
      console.error("Error creating payment request:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create payment request"
      });
    }
  }

  /**
   * Get pending payment requests (admin)
   * GET /api/payment-requests/pending
   */
  async getPendingRequests(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, tenantId, landlordId } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (tenantId) filters.tenantId = tenantId as string;
      if (landlordId) filters.landlordId = landlordId as string;

      const requests = await paymentRequestService.getPendingRequests(filters);

      res.status(200).json({
        success: true,
        data: requests
      });
    } catch (error: any) {
      console.error("Error getting pending requests:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get pending requests"
      });
    }
  }

  /**
   * Approve payment request (admin)
   * POST /api/payment-requests/:id/approve
   */
  async approvePaymentRequest(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?._id?.toString() || (req as any).user?._id || (req as any).user?.id || (req as any).user?.userId;
      if (!adminId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { id } = req.params;

      // Check if this is a boost or subscription payment request
      const paymentRequest = await paymentRequestService.getPaymentRequest(id);
      
      if (!paymentRequest) {
        res.status(404).json({
          success: false,
          message: "Payment request not found"
        });
        return;
      }

      // Route based on requestType
      if (paymentRequest.requestType === "premium_boost") {
        const result = await premiumBoostService.approveBoostPaymentRequest(id, adminId);
        
        const landlord = await User.findById(result.paymentRequest.landlordId);
        const property = await Property.findById(result.paymentRequest.propertyId);
        
        if (landlord && property) {
          // TODO: Send boost approved email
        }

        res.status(200).json({
          success: true,
          message: "Boost payment request approved and processed successfully",
          data: result
        });
        return;
      }

      if (paymentRequest.requestType === "zero_deposit_protection") {
        const result = await landlordSubscriptionService.approveZeroDepositProtectionRequest(id, adminId);
        
        const landlord = await User.findById(result.paymentRequest.landlordId);
        
        if (landlord) {
          // TODO: Send zero deposit protection approved email
        }

        res.status(200).json({
          success: true,
          message: "Zero Deposit Protection subscription approved and processed successfully",
          data: result
        });
        return;
      }

      if (paymentRequest.requestType === "premium_features_subscription") {
        const result = await landlordSubscriptionService.approveSubscriptionPaymentRequest(id, adminId);
        
        const landlord = await User.findById(result.paymentRequest.landlordId);
        
        if (landlord) {
          // TODO: Send subscription approved email
        }

        res.status(200).json({
          success: true,
          message: "Subscription payment request approved and processed successfully",
          data: result
        });
        return;
      }

      if (paymentRequest.requestType === "agreement_fee") {
        const { Payment } = await import("../models/Payment");
        const { RevenueSource } = await import("../models/RevenueSource");
        const { PaymentRequest } = await import("../models/PaymentRequest");
        const { revenueSourceService } = await import("../services/RevenueSourceService");
        const { Types } = await import("mongoose");
        const { Property } = await import("../models/Property");

        // Get payment request
        const request = await PaymentRequest.findById(id);
        if (!request) {
          res.status(404).json({ success: false, message: "Payment request not found" });
          return;
        }

        if (!request.agreementId) {
          res.status(400).json({ success: false, message: "Agreement ID is required for agreement fee payment" });
          return;
        }

        // Map PaymentRequest paymentMethod to Payment paymentMethod
        const paymentMethod = request.paymentMethod === "in_app" ? "in_app" : "cash";

        // Get property to calculate fee
        const property = await Property.findById(request.propertyId);
        if (!property) {
          res.status(404).json({ success: false, message: "Property not found" });
          return;
        }

        // Create payment record
        const payment = await Payment.create({
          rentalId: null,
          agreementId: request.agreementId,
          propertyId: request.propertyId || null,
          landlordId: request.landlordId,
          tenantId: request.tenantId,
          paymentType: "service",
          amount: request.amount,
          totalAmount: request.amount,
          paymentMethod: paymentMethod,
          status: "verified",
          verifiedAt: new Date(),
          verifiedBy: new Types.ObjectId(adminId),
          proofOfPayment: request.proofOfPayment,
          notes: `Agreement processing fee - approved by admin`
        });

        // Create revenue source
        const revenueSource = await revenueSourceService.createRevenueSource({
          sourceType: "agreement_fee",
          amount: request.amount,
          payerId: request.tenantId.toString(),
          recipientId: "khayalami",
          paymentId: payment._id.toString(),
          agreementId: request.agreementId.toString(),
          description: `Agreement processing fee`,
          notes: `One-time fee for agreement digitalization`,
          status: "collected"
        });

        // Update payment request
        request.status = "processed";
        request.reviewedBy = new Types.ObjectId(adminId);
        request.reviewedAt = new Date();
        request.paymentId = payment._id;
        await request.save();

        // Update agreement tenant signature payment status to verified
        const { Agreement } = await import("../models/Agreement");
        const { agreementService } = await import("../services/AgreementService");
        const { Signature } = await import("../models/Signature");
        const agreement = await Agreement.findById(request.agreementId);
        if (agreement && agreement.tenantSignature) {
          agreement.tenantSignature.paymentStatus = "verified";
          
          // Check if both parties have signed - if so, update status to "signed"
          const landlordSignature = await Signature.findOne({ 
            agreementId: agreement._id, 
            userRole: "landlord" 
          });
          const tenantSignature = await Signature.findOne({ 
            agreementId: agreement._id, 
            userRole: "tenant" 
          });
          
          if (landlordSignature && tenantSignature) {
            agreement.status = "signed";
            agreement.signedAt = agreement.signedAt || new Date();
            
            // Send signed notifications
            await agreementService.sendAgreementNotification({
              type: "signed",
              recipientId: agreement.landlordId.toString(),
              recipientRole: "landlord",
              message: `Agreement signed by tenant: ${agreement.title}`,
              agreementId: agreement._id.toString(),
              propertyId: agreement.propertyId.toString()
            });

            await agreementService.sendAgreementNotification({
              type: "signed",
              recipientId: agreement.tenantId.toString(),
              recipientRole: "tenant",
              message: `Agreement signed: ${agreement.title}`,
              agreementId: agreement._id.toString(),
              propertyId: agreement.propertyId.toString()
            });
          }
          
          await agreement.save();
        }

        const tenant = await User.findById(request.tenantId);
        if (tenant) {
          // TODO: Send agreement fee approved email
        }

        res.status(200).json({
          success: true,
          message: "Agreement fee payment request approved and processed successfully",
          data: {
            paymentRequest: request,
            payment,
            revenueSource
          }
        });
        return;
      }

      if (paymentRequest.requestType === "tenant_subscription") {
        const { subscriptionService } = await import("../services/SubscriptionService");
        const { Rental } = await import("../models/Rental");
        const { Payment } = await import("../models/Payment");
        const { PaymentRequest } = await import("../models/PaymentRequest");
        const { revenueSourceService } = await import("../services/RevenueSourceService");
        const { Types } = await import("mongoose");

        // Get payment request
        const request = await PaymentRequest.findById(id);
        if (!request) {
          res.status(404).json({ success: false, message: "Payment request not found" });
          return;
        }

        // Map PaymentRequest paymentMethod to Payment paymentMethod
        // PaymentRequest: "bank_transfer" | "cash" | "mobile_money" | "other"
        // Payment: "in_app" | "cash"
        const paymentMethod = request.paymentMethod === "in_app" ? "in_app" : "cash";

        // Create payment (account-level subscription, no rentalId)
        const payment = await Payment.create({
          rentalId: null,
          agreementId: null,
          propertyId: null,
          landlordId: request.landlordId, // Tenant pays for their own subscription
          tenantId: request.tenantId,
          paymentType: "service",
          amount: request.amount,
          totalAmount: request.amount,
          paymentMethod: paymentMethod, // Map to "cash" for external payments
          status: "verified",
          verifiedAt: new Date(),
          verifiedBy: new Types.ObjectId(adminId),
          proofOfPayment: request.proofOfPayment,
          notes: `Tenant subscription payment - approved by admin`
        });

        // Get or create account-level subscription
        const existingSubscription = await subscriptionService.getActiveSubscription(
          request.tenantId.toString()
        );

        let subscription;
        if (existingSubscription && existingSubscription.status === "active") {
          // Renew existing subscription
          subscription = await subscriptionService.renewSubscription(existingSubscription._id.toString());
        } else {
          // Create new subscription - extract from notes or use defaults
          // Note: planType and propertyValueBracket should be stored in payment request
          // For now using defaults - this should be improved
          subscription = await subscriptionService.createSubscription({
            tenantId: request.tenantId.toString(),
            planType: "premium",
            propertyValueBracket: "medium"
          });
        }

        // Create revenue source
        const revenueSource = await revenueSourceService.createRevenueSource({
          sourceType: "subscription",
          amount: request.amount,
          payerId: request.tenantId.toString(),
          recipientId: "khayalami",
          paymentId: payment._id.toString(),
          rentalId: undefined, // Account-level subscription
          description: `Tenant subscription`,
          notes: `Monthly subscription for zero-deposit access`,
          status: "collected"
        });

        // Update payment request
        request.status = "approved";
        request.reviewedBy = new Types.ObjectId(adminId);
        request.reviewedAt = new Date();
        request.paymentId = payment._id;
        await request.save();

        const tenant = await User.findById(request.tenantId);
        if (tenant) {
          // TODO: Send subscription approved email
        }

        res.status(200).json({
          success: true,
          message: "Tenant subscription payment request approved and processed successfully",
          data: {
            paymentRequest: request,
            payment,
            subscription,
            revenueSource
          }
        });
        return;
      }

      // Regular rent payment request
      const result = await paymentRequestService.approvePaymentRequest(id, adminId);

      // Get tenant details for email
      const tenant = await User.findById(result.paymentRequest.tenantId);
      const property = await Property.findById(result.paymentRequest.propertyId);
      
      if (tenant) {
        // Calculate deductions for email
        const deductions = {
          subscriptionFee: 0, // Will be calculated
          processingFee: 0,
          insurancePremium: 0,
          netRentAmount: result.payment.amount
        };

        await emailNotificationService.sendPaymentApproved({
          tenantEmail: tenant.email,
          tenantName: `${tenant.firstName} ${tenant.lastName}`,
          amount: result.paymentRequest.amount,
          deductions
        });
      }

      // Get landlord details for email
      const landlord = await User.findById(result.paymentRequest.landlordId);
      if (landlord && property) {
        await emailNotificationService.sendRentDepositedEscrow({
          landlordEmail: landlord.email,
          landlordName: `${landlord.firstName} ${landlord.lastName}`,
          tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : "Tenant",
          amount: result.paymentRequest.amount,
          netRentAmount: result.payment.amount, // This should be calculated properly
          propertyTitle: property.title || property.address
        });
      }

      res.status(200).json({
        success: true,
        message: "Payment request approved and processed successfully",
        data: result
      });
    } catch (error: any) {
      console.error("Error approving payment request:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to approve payment request"
      });
    }
  }

  /**
   * Reject payment request (admin)
   * POST /api/payment-requests/:id/reject
   */
  async rejectPaymentRequest(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?._id?.toString() || (req as any).user?._id || (req as any).user?.id || (req as any).user?.userId;
      if (!adminId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        res.status(400).json({
          success: false,
          message: "Rejection reason is required"
        });
        return;
      }

      // Reject payment request
      const paymentRequest = await paymentRequestService.rejectPaymentRequest(
        id,
        adminId,
        rejectionReason
      );

      // Get tenant details for email
      const tenant = await User.findById(paymentRequest.tenantId);
      if (tenant) {
        await emailNotificationService.sendPaymentRejected({
          tenantEmail: tenant.email,
          tenantName: `${tenant.firstName} ${tenant.lastName}`,
          amount: paymentRequest.amount,
          rejectionReason
        });
      }

      res.status(200).json({
        success: true,
        message: "Payment request rejected",
        data: paymentRequest
      });
    } catch (error: any) {
      console.error("Error rejecting payment request:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to reject payment request"
      });
    }
  }

  /**
   * Get payment request by ID
   * GET /api/payment-requests/:id
   */
  async getPaymentRequest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const paymentRequest = await paymentRequestService.getPaymentRequest(id);

      if (!paymentRequest) {
        res.status(404).json({
          success: false,
          message: "Payment request not found"
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: paymentRequest
      });
    } catch (error: any) {
      console.error("Error getting payment request:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get payment request"
      });
    }
  }
}

export const paymentRequestController = new PaymentRequestController();


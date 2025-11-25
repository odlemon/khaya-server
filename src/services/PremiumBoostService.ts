// @ts-nocheck
import { Property } from "../models/Property";
import { RevenueSource } from "../models/RevenueSource";
import { PaymentRequest } from "../models/PaymentRequest";
import { Payment } from "../models/Payment";
import { revenueSourceService } from "./RevenueSourceService";
import { Types } from "mongoose";

export class PremiumBoostService {
  /**
   * Calculate boost price based on duration
   */
  calculateBoostPrice(duration: number): number {
    if (duration === 7) return 10;
    if (duration === 30) return 15;
    if (duration === 90) return 25;
    throw new Error("Invalid duration. Must be 7, 30, or 90 days");
  }

  /**
   * Purchase premium boost (in-app payment)
   */
  async purchaseBoost(data: {
    propertyId: string;
    landlordId: string;
    duration: number; // 7, 30, or 90 days
    paymentMethod: "in_app" | "external";
    gatewayResponse?: any; // For in-app payments
  }): Promise<{
    boost: any;
    revenueSource: any;
    property: any;
  }> {
    // Verify property exists and landlord owns it
    const property = await Property.findById(data.propertyId);
    if (!property) {
      throw new Error("Property not found");
    }

    if (property.landlordId.toString() !== data.landlordId.toString()) {
      throw new Error("Access denied. You don't own this property.");
    }

    // Check if property already has an active boost
    const hasActiveBoost = await this.hasActiveBoost(data.propertyId);
    if (hasActiveBoost) {
      throw new Error("This property already has an active boost. Please wait for the current boost to expire before purchasing a new one.");
    }

    // Calculate price
    const amount = this.calculateBoostPrice(data.duration);

    // Calculate expiration date
    const startDate = new Date();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + data.duration);

    if (data.paymentMethod === "in_app") {
      // In-app payment - create payment, revenue source, and activate boost immediately
      const payment = await Payment.create({
        rentalId: null, // Not a rent payment
        agreementId: null,
        propertyId: property._id,
        landlordId: property.landlordId,
        tenantId: property.landlordId, // Landlord pays for their own boost
        paymentType: "service",
        amount,
        totalAmount: amount,
        paymentMethod: "in_app",
        status: "verified",
        verifiedAt: new Date(),
        gatewayResponse: data.gatewayResponse,
        notes: `Premium boost purchase - ${data.duration} days`
      });

      // Create revenue source with "collected" status (in-app payment is verified)
      const revenueSource = await revenueSourceService.createRevenueSource({
        sourceType: "premium_boost",
        amount,
        payerId: data.landlordId,
        recipientId: "khayalami",
        paymentId: payment._id.toString(),
        propertyId: data.propertyId,
        description: `Premium boost - ${data.duration} days`,
        notes: `Property: ${property.title}`,
        status: "collected" // In-app payment is immediately collected
      });

      // Update property to featured
      property.isFeatured = true;
      await property.save();

      return {
        boost: {
          propertyId: property._id,
          duration: data.duration,
          amount,
          startDate,
          expirationDate,
          isActive: true
        },
        revenueSource,
        property
      };
    } else {
      // External payment - create payment request (admin will review)
      throw new Error("External payment flow - use createBoostPaymentRequest()");
    }
  }

  /**
   * Create boost payment request (external payment)
   */
  async createBoostPaymentRequest(data: {
    propertyId: string;
    landlordId: string;
    duration: number;
    proofOfPayment: string;
    paymentMethod: "bank_transfer" | "cash" | "mobile_money" | "other";
    notes?: string;
  }): Promise<any> {
    // Verify property exists and landlord owns it
    const property = await Property.findById(data.propertyId);
    if (!property) {
      throw new Error("Property not found");
    }

    if (property.landlordId.toString() !== data.landlordId.toString()) {
      throw new Error("Access denied. You don't own this property.");
    }

    // Check if property already has an active boost
    const hasActiveBoost = await this.hasActiveBoost(data.propertyId);
    if (hasActiveBoost) {
      throw new Error("This property already has an active boost. Please wait for the current boost to expire before purchasing a new one.");
    }

    // Calculate price
    const amount = this.calculateBoostPrice(data.duration);

    // Create payment request
    const paymentRequest = await PaymentRequest.create({
      tenantId: new Types.ObjectId(data.landlordId), // Landlord is the payer
      rentalId: null, // Not a rent payment
      agreementId: null,
      propertyId: new Types.ObjectId(data.propertyId),
      landlordId: new Types.ObjectId(data.landlordId),
      requestType: "premium_boost",
      amount,
      paymentMethod: data.paymentMethod,
      proofOfPayment: data.proofOfPayment,
      status: "pending_admin_approval",
      submittedAt: new Date(),
      notes: `Premium boost purchase - ${data.duration} days. ${data.notes || ""}`
    });

    return paymentRequest;
  }

  /**
   * Approve boost payment request (admin)
   */
  async approveBoostPaymentRequest(
    requestId: string,
    adminId: string
  ): Promise<{
    paymentRequest: any;
    payment: any;
    revenueSource: any;
    property: any;
  }> {
    const paymentRequest = await PaymentRequest.findById(requestId);
    
    if (!paymentRequest) {
      throw new Error("Payment request not found");
    }

    if (paymentRequest.status !== "pending_admin_approval") {
      throw new Error("Payment request is not pending approval");
    }

    // Get property
    const property = await Property.findById(paymentRequest.propertyId);
    if (!property) {
      throw new Error("Property not found");
    }

    // Check if property already has an active boost (prevent duplicate boosts)
    const hasActiveBoost = await this.hasActiveBoost(paymentRequest.propertyId.toString());
    if (hasActiveBoost) {
      throw new Error("This property already has an active boost. Cannot approve another boost until the current one expires.");
    }

    // Extract duration from notes or use default
    const durationMatch = paymentRequest.notes?.match(/(\d+)\s*days?/i);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 30;

    // Calculate expiration date
    const startDate = new Date();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + duration);

    // Create payment record
    const payment = await Payment.create({
      rentalId: null,
      agreementId: null,
      propertyId: property._id,
      landlordId: property.landlordId,
      tenantId: property.landlordId,
      paymentType: "service",
      amount: paymentRequest.amount,
      totalAmount: paymentRequest.amount,
      paymentMethod: "cash", // External payments are treated as cash
      status: "verified",
      verifiedAt: new Date(),
      proofOfPayment: paymentRequest.proofOfPayment,
      notes: `Premium boost purchase (approved by admin) - ${duration} days`
    });

    // Create revenue source with "collected" status (payment approved)
    const revenueSource = await revenueSourceService.createRevenueSource({
      sourceType: "premium_boost",
      amount: paymentRequest.amount,
      payerId: paymentRequest.landlordId.toString(),
      recipientId: "khayalami",
      paymentId: payment._id.toString(),
      propertyId: paymentRequest.propertyId.toString(),
      description: `Premium boost - ${duration} days`,
      notes: `Property: ${property.title}`,
      status: "collected" // Payment approved, boost is active
    });

    // Update property to featured (boost is now active)
    property.isFeatured = true;
    await property.save();

    // Update payment request
    paymentRequest.status = "processed";
    paymentRequest.paymentId = payment._id;
    paymentRequest.reviewedBy = new Types.ObjectId(adminId);
    paymentRequest.reviewedAt = new Date();
    await paymentRequest.save();

    return {
      paymentRequest,
      payment,
      revenueSource,
      property
    };
  }

  /**
   * Get active boosts for a property
   */
  async getPropertyBoosts(propertyId: string): Promise<any[]> {
    // Get all boosts (collected or pending - pending might be from in-app payments before fix)
    // We'll check payment method to determine if it should be active
    const revenueSources = await RevenueSource.find({
      sourceType: "premium_boost",
      propertyId: new Types.ObjectId(propertyId),
      status: { $in: ["collected", "pending"] } // Include both collected and pending (for in-app payments)
    })
      .populate("paymentId")
      .sort({ createdAt: -1 });

    // For pending boosts, check if payment was in-app (should be collected)
    for (const revenue of revenueSources) {
      if (revenue.status === "pending" && revenue.paymentId) {
        const payment = revenue.paymentId as any;
        // If payment was in-app and verified, update status to collected
        if (payment.paymentMethod === "in_app" && payment.status === "verified") {
          revenue.status = "collected";
          await revenue.save();
        }
      }
    }

    return revenueSources;
  }

  /**
   * Check if property has active boost
   */
  async hasActiveBoost(propertyId: string): Promise<boolean> {
    const property = await Property.findById(propertyId);
    return property?.isFeatured || false;
  }
}

export const premiumBoostService = new PremiumBoostService();


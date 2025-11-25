// @ts-nocheck
import { PaymentRequest, IPaymentRequest } from "../models/PaymentRequest";
import { Payment, IPayment } from "../models/Payment";
import { Rental } from "../models/Rental";
import { Property } from "../models/Property";
import { escrowService } from "./EscrowService";
import { paymentCalculationService } from "./PaymentCalculationService";
import { revenueSourceService } from "./RevenueSourceService";
import { paymentService } from "./PaymentService";
import { premiumBoostService } from "./PremiumBoostService";
import { Types } from "mongoose";

export class PaymentRequestService {
  /**
   * Create payment request (tenant submits external payment)
   */
  async createPaymentRequest(data: {
    tenantId: string;
    rentalId?: string; // Optional - only required for rent payments
    agreementId?: string; // Optional - required for agreement_fee payments
    amount: number;
    proofOfPayment: string;
    paymentMethod: "bank_transfer" | "cash" | "mobile_money" | "other";
    notes?: string;
    requestType?: "rent" | "premium_boost" | "premium_features_subscription" | "zero_deposit_protection" | "agreement_fee" | "tenant_subscription";
    propertyId?: string; // Optional - for boost payments
    landlordId?: string; // Optional - for boost/subscription payments
  }): Promise<IPaymentRequest> {
    const requestType = data.requestType || "rent";

    // For agreement_fee payments, agreementId is required
    if (requestType === "agreement_fee") {
      if (!data.agreementId) {
        throw new Error("Agreement ID is required for agreement fee payment requests");
      }

      // Get agreement details to get landlordId and propertyId
      const { Agreement } = await import("../models/Agreement");
      const agreement = await Agreement.findById(data.agreementId);
      if (!agreement) {
        throw new Error("Agreement not found");
      }

      // Tenant is the payer, landlord is from the agreement
      const paymentRequest = await PaymentRequest.create({
        tenantId: new Types.ObjectId(data.tenantId), // Tenant pays the fee
        rentalId: undefined, // Not required for agreement fees
        agreementId: new Types.ObjectId(data.agreementId),
        propertyId: agreement.propertyId,
        landlordId: agreement.landlordId, // Get landlord from agreement
        requestType: "agreement_fee",
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        proofOfPayment: data.proofOfPayment,
        status: "pending_admin_approval",
        submittedAt: new Date(),
        notes: data.notes
      });

      // Update agreement tenantSignature paymentStatus to pending_payment
      if (agreement.tenantSignature) {
        agreement.tenantSignature.paymentStatus = "pending_payment";
        await agreement.save();
      }

      return paymentRequest;
    }

    // For rent payments, rentalId is required
    if (requestType === "rent") {
      if (!data.rentalId) {
        throw new Error("Rental ID is required for rent payment requests");
      }

      // Get rental details
      const rental = await Rental.findById(data.rentalId);
      if (!rental) {
        throw new Error("Rental not found");
      }

      // Create payment request for rent
      const paymentRequest = await PaymentRequest.create({
        tenantId: new Types.ObjectId(data.tenantId),
        rentalId: new Types.ObjectId(data.rentalId),
        agreementId: rental.agreementId,
        propertyId: rental.propertyId,
        landlordId: rental.landlordId,
        requestType: "rent",
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        proofOfPayment: data.proofOfPayment,
        status: "pending_admin_approval",
        submittedAt: new Date(),
        notes: data.notes
      });

      return paymentRequest;
    }

    // For non-rent payments (boost, subscriptions), landlordId is required
    // The landlord is the payer, so tenantId should be the same as landlordId
    const landlordId = data.landlordId || data.tenantId; // Use landlordId if provided, otherwise tenantId (for backward compatibility)
    
    if (!landlordId) {
      throw new Error("Landlord ID is required for non-rent payment requests");
    }

    // For boost payments, validate property ownership and check for existing active boost
    if (requestType === "premium_boost") {
      if (!data.propertyId) {
        throw new Error("Property ID is required for boost payment requests");
      }

      // Verify property exists and landlord owns it
      const property = await Property.findById(data.propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Compare both as strings to ensure proper comparison
      if (property.landlordId.toString() !== landlordId.toString()) {
        throw new Error("Access denied. You don't own this property.");
      }

      // Check if property already has an active boost
      const hasActiveBoost = await premiumBoostService.hasActiveBoost(data.propertyId);
      if (hasActiveBoost) {
        throw new Error("This property already has an active boost. Please wait for the current boost to expire before purchasing a new one.");
      }
    }

    // Create payment request for boost/subscription
    // For boost/subscription payments, landlord is the payer, so tenantId = landlordId
    const paymentRequest = await PaymentRequest.create({
      tenantId: new Types.ObjectId(landlordId), // Landlord is the payer
      rentalId: undefined, // Not required for boosts/subscriptions
      agreementId: undefined, // Not required for boosts/subscriptions
      propertyId: data.propertyId ? new Types.ObjectId(data.propertyId) : undefined,
      landlordId: new Types.ObjectId(landlordId),
      requestType: requestType,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      proofOfPayment: data.proofOfPayment,
      status: "pending_admin_approval",
      submittedAt: new Date(),
      notes: data.notes
    });

    return paymentRequest;
  }

  /**
   * Get pending payment requests (for admin)
   */
  async getPendingRequests(filters?: {
    startDate?: Date;
    endDate?: Date;
    tenantId?: string;
    landlordId?: string;
  }): Promise<IPaymentRequest[]> {
    const query: any = {
      status: "pending_admin_approval"
    };

    if (filters?.startDate || filters?.endDate) {
      query.submittedAt = {};
      if (filters.startDate) query.submittedAt.$gte = filters.startDate;
      if (filters.endDate) query.submittedAt.$lte = filters.endDate;
    }

    if (filters?.tenantId) {
      query.tenantId = new Types.ObjectId(filters.tenantId);
    }

    if (filters?.landlordId) {
      query.landlordId = new Types.ObjectId(filters.landlordId);
    }

    return await PaymentRequest.find(query)
      .populate("tenantId", "firstName lastName email")
      .populate("landlordId", "firstName lastName email")
      .populate("propertyId", "title address")
      .populate("rentalId")
      .sort({ submittedAt: -1 });
  }

  /**
   * Admin approves payment request
   */
  async approvePaymentRequest(
    requestId: string,
    adminId: string
  ): Promise<{
    paymentRequest: IPaymentRequest;
    payment: IPayment;
    escrowTransaction: any;
  }> {
    const paymentRequest = await PaymentRequest.findById(requestId);
    
    if (!paymentRequest) {
      throw new Error("Payment request not found");
    }

    if (paymentRequest.status !== "pending_admin_approval") {
      throw new Error("Payment request is not pending approval");
    }

    // Validate this is a rent payment request
    if (!paymentRequest.rentalId) {
      throw new Error("This payment request is not a rent payment. Use the appropriate approval method for subscriptions/boosts.");
    }

    // Calculate deductions
    const deductions = await paymentCalculationService.calculateRentDeductions(
      paymentRequest.amount,
      paymentRequest.tenantId.toString(),
      paymentRequest.landlordId.toString(),
      paymentRequest.rentalId.toString()
    );

    // Create payment record
    const payment = await paymentService.createNewPayment(
      paymentRequest.rentalId.toString(),
      paymentRequest.tenantId.toString(),
      {
        amount: paymentRequest.amount,
        paymentMethod: "cash", // External payments are treated as cash
        paymentType: "rent",
        proofOfPayment: paymentRequest.proofOfPayment,
        notes: `External payment - ${paymentRequest.paymentMethod}. ${paymentRequest.notes || ""}`
      }
    );

    // Auto-verify the payment (admin approved)
    await paymentService.verifyPayment(
      payment._id.toString(),
      paymentRequest.landlordId.toString(),
      "Payment approved by admin after external deposit verification"
    );

    // Get escrow transaction
    const escrowTransaction = await escrowService.getEscrowSummary();

    // Update payment request
    paymentRequest.status = "processed";
    paymentRequest.paymentId = payment._id;
    paymentRequest.reviewedBy = new Types.ObjectId(adminId);
    paymentRequest.reviewedAt = new Date();
    await paymentRequest.save();

    return {
      paymentRequest,
      payment,
      escrowTransaction
    };
  }

  /**
   * Admin rejects payment request
   */
  async rejectPaymentRequest(
    requestId: string,
    adminId: string,
    rejectionReason: string
  ): Promise<IPaymentRequest> {
    const paymentRequest = await PaymentRequest.findById(requestId);
    
    if (!paymentRequest) {
      throw new Error("Payment request not found");
    }

    if (paymentRequest.status !== "pending_admin_approval") {
      throw new Error("Payment request is not pending approval");
    }

    paymentRequest.status = "rejected";
    paymentRequest.reviewedBy = new Types.ObjectId(adminId);
    paymentRequest.reviewedAt = new Date();
    paymentRequest.rejectionReason = rejectionReason;
    
    await paymentRequest.save();

    return paymentRequest;
  }

  /**
   * Get payment request by ID
   */
  async getPaymentRequest(requestId: string): Promise<IPaymentRequest | null> {
    return await PaymentRequest.findById(requestId)
      .populate("tenantId", "firstName lastName email")
      .populate("landlordId", "firstName lastName email")
      .populate("propertyId", "title address")
      .populate("rentalId")
      .populate("paymentId");
  }
}

export const paymentRequestService = new PaymentRequestService();


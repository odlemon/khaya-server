// @ts-nocheck
import { LandlordPreferences } from "../models/LandlordPreferences";
import { RevenueSource } from "../models/RevenueSource";
import { PaymentRequest } from "../models/PaymentRequest";
import { Payment } from "../models/Payment";
import { revenueSourceService } from "./RevenueSourceService";
import { Types } from "mongoose";

export class LandlordSubscriptionService {
  /**
   * Calculate subscription price based on plan
   */
  calculateSubscriptionPrice(planType: "premium" | "premium_plus"): number {
    if (planType === "premium") return 15;
    if (planType === "premium_plus") return 25;
    throw new Error("Invalid plan type");
  }

  /**
   * Calculate zero deposit protection subscription price
   * Price varies based on property value or number of properties
   */
  calculateZeroDepositProtectionPrice(propertyCount?: number): number {
    // Base price: K10/month per property or flat rate
    // For now, using flat rate of K10/month
    // Can be adjusted based on property count later
    return 10;
  }

  /**
   * Subscribe to premium features (in-app payment)
   */
  async subscribe(data: {
    landlordId: string;
    planType: "premium" | "premium_plus";
    paymentMethod: "in_app" | "external";
    gatewayResponse?: any;
    autoRenew?: boolean;
  }): Promise<{
    subscription: any;
    revenueSource: any;
    preferences: any;
  }> {
    const amount = this.calculateSubscriptionPrice(data.planType);

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
    const nextBillingDate = new Date(endDate);

    if (data.paymentMethod === "in_app") {
      // In-app payment - create payment and activate subscription immediately
      const payment = await Payment.create({
        rentalId: null,
        agreementId: null,
        propertyId: null,
        landlordId: new Types.ObjectId(data.landlordId),
        tenantId: new Types.ObjectId(data.landlordId), // Landlord pays for their own subscription
        paymentType: "service",
        amount,
        totalAmount: amount,
        paymentMethod: "in_app",
        status: "verified",
        verifiedAt: new Date(),
        gatewayResponse: data.gatewayResponse,
        notes: `Premium features subscription - ${data.planType}`
      });

      // Create revenue source with "collected" status (in-app payment is verified)
      const revenueSource = await revenueSourceService.createRevenueSource({
        sourceType: "subscription",
        amount,
        payerId: data.landlordId,
        recipientId: "khayalami",
        paymentId: payment._id.toString(),
        description: `Landlord premium subscription - ${data.planType}`,
        notes: `Monthly subscription for premium features`,
        status: "collected" // In-app payment is immediately collected
      });

      // Add to escrow (100% to Khayalami, 0% to landlord for subscription payments)
      const { escrowService } = await import("./EscrowService");
      await escrowService.addToEscrow(payment, {
        deductions: {
          subscriptionFee: 0,
          processingFee: 0,
          insurancePremium: 0
        },
        revenueSourceIds: [revenueSource._id.toString()]
      });
      // Update status to "held" since payment is verified
      await escrowService.updateEscrowStatus(payment._id.toString(), "held");

      // Update landlord preferences
      const preferences = await LandlordPreferences.findOne({ landlordId: data.landlordId });
      if (!preferences) {
        throw new Error("Landlord preferences not found");
      }

      if (!preferences.premiumFeatures) {
        preferences.premiumFeatures = {
          isSubscribed: false,
          autoRenew: true
        };
      }

      preferences.premiumFeatures.isSubscribed = true;
      preferences.premiumFeatures.planType = data.planType;
      preferences.premiumFeatures.startDate = startDate;
      preferences.premiumFeatures.endDate = endDate;
      preferences.premiumFeatures.autoRenew = data.autoRenew !== false;
      await preferences.save();

      return {
        subscription: {
          planType: data.planType,
          amount,
          startDate,
          endDate,
          nextBillingDate,
          isActive: true
        },
        revenueSource,
        preferences
      };
    } else {
      // External payment - create payment request
      throw new Error("External payment flow - use createSubscriptionPaymentRequest()");
    }
  }

  /**
   * Create subscription payment request (external payment)
   */
  async createSubscriptionPaymentRequest(data: {
    landlordId: string;
    planType: "premium" | "premium_plus";
    proofOfPayment: string;
    paymentMethod: "bank_transfer" | "cash" | "mobile_money" | "other";
    autoRenew?: boolean;
    notes?: string;
  }): Promise<any> {
    const amount = this.calculateSubscriptionPrice(data.planType);

    // Create payment request
    const paymentRequest = await PaymentRequest.create({
      tenantId: new Types.ObjectId(data.landlordId), // Landlord is the payer
      rentalId: null,
      agreementId: null,
      propertyId: null,
      landlordId: new Types.ObjectId(data.landlordId),
      requestType: "premium_features_subscription",
      amount,
      paymentMethod: data.paymentMethod,
      proofOfPayment: data.proofOfPayment,
      status: "pending_admin_approval",
      submittedAt: new Date(),
      notes: `Premium features subscription - ${data.planType}. Auto-renew: ${data.autoRenew !== false}. ${data.notes || ""}`
    });

    return paymentRequest;
  }

  /**
   * Approve subscription payment request (admin)
   */
  async approveSubscriptionPaymentRequest(
    requestId: string,
    adminId: string
  ): Promise<{
    paymentRequest: any;
    payment: any;
    revenueSource: any;
    preferences: any;
  }> {
    const paymentRequest = await PaymentRequest.findById(requestId);
    
    if (!paymentRequest) {
      throw new Error("Payment request not found");
    }

    if (paymentRequest.status !== "pending_admin_approval") {
      throw new Error("Payment request is not pending approval");
    }

    // Extract plan type from notes
    const planMatch = paymentRequest.notes?.match(/subscription - (premium|premium_plus)/i);
    const planType = (planMatch ? planMatch[1] : "premium") as "premium" | "premium_plus";

    // Extract auto-renew from notes
    const autoRenewMatch = paymentRequest.notes?.match(/Auto-renew: (true|false)/i);
    const autoRenew = autoRenewMatch ? autoRenewMatch[1] === "true" : true;

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    const nextBillingDate = new Date(endDate);

    // Create payment record
    const payment = await Payment.create({
      rentalId: null,
      agreementId: null,
      propertyId: null,
      landlordId: paymentRequest.landlordId,
      tenantId: paymentRequest.landlordId,
      paymentType: "service",
      amount: paymentRequest.amount,
      totalAmount: paymentRequest.amount,
      paymentMethod: "cash",
      status: "verified",
      verifiedAt: new Date(),
      proofOfPayment: paymentRequest.proofOfPayment,
      notes: `Premium features subscription (approved by admin) - ${planType}`
    });

    // Create revenue source
    const revenueSource = await revenueSourceService.createRevenueSource({
      sourceType: "subscription",
      amount: paymentRequest.amount,
      payerId: paymentRequest.landlordId.toString(),
      recipientId: "khayalami",
      paymentId: payment._id.toString(),
      description: `Landlord premium subscription - ${planType}`,
      notes: `Monthly subscription for premium features`
    });

    // Add to escrow (100% to Khayalami, 0% to landlord for subscription payments)
    const { escrowService } = await import("./EscrowService");
    await escrowService.addToEscrow(payment, {
      deductions: {
        subscriptionFee: 0,
        processingFee: 0,
        insurancePremium: 0
      },
      revenueSourceIds: [revenueSource._id.toString()]
    });
    // Update status to "held" since payment is verified
    await escrowService.updateEscrowStatus(payment._id.toString(), "held");

    // Update landlord preferences
    const preferences = await LandlordPreferences.findOne({ 
      landlordId: paymentRequest.landlordId 
    });
    
    if (!preferences) {
      throw new Error("Landlord preferences not found");
    }

    if (!preferences.premiumFeatures) {
      preferences.premiumFeatures = {
        isSubscribed: false,
        autoRenew: true
      };
    }

    preferences.premiumFeatures.isSubscribed = true;
    preferences.premiumFeatures.planType = planType;
    preferences.premiumFeatures.startDate = startDate;
    preferences.premiumFeatures.endDate = endDate;
    preferences.premiumFeatures.autoRenew = autoRenew;
    await preferences.save();

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
      preferences
    };
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(landlordId: string): Promise<any> {
    const preferences = await LandlordPreferences.findOne({ landlordId });
    
    if (!preferences || !preferences.premiumFeatures?.isSubscribed) {
      return {
        isSubscribed: false,
        planType: "basic",
        subscription: null
      };
    }

    const now = new Date();
    const isActive = preferences.premiumFeatures.endDate 
      ? new Date(preferences.premiumFeatures.endDate) > now
      : false;

    return {
      isSubscribed: preferences.premiumFeatures.isSubscribed && isActive,
      planType: preferences.premiumFeatures.planType || "basic",
      subscription: preferences.premiumFeatures
    };
  }

  /**
   * Cancel subscription
   * Note: Access continues until endDate, but auto-renewal is disabled
   */
  async cancelSubscription(landlordId: string): Promise<void> {
    const preferences = await LandlordPreferences.findOne({ landlordId });
    
    if (!preferences) {
      throw new Error("Landlord preferences not found");
    }

    if (preferences.premiumFeatures) {
      // Disable auto-renewal but keep access until endDate
      preferences.premiumFeatures.autoRenew = false;
      // Note: isSubscribed remains true until endDate expires
      // This allows landlord to continue using features until current billing period ends
      await preferences.save();
    }
  }

  /**
   * Subscribe to zero deposit protection (in-app payment)
   */
  async subscribeToZeroDepositProtection(data: {
    landlordId: string;
    paymentMethod: "in_app" | "external";
    gatewayResponse?: any;
    autoRenew?: boolean;
    propertyCount?: number;
  }): Promise<{
    subscription: any;
    revenueSource: any;
    preferences: any;
  }> {
    const amount = this.calculateZeroDepositProtectionPrice(data.propertyCount);

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
    const nextBillingDate = new Date(endDate);

    if (data.paymentMethod === "in_app") {
      // In-app payment - create payment and activate subscription immediately
      const payment = await Payment.create({
        rentalId: null,
        agreementId: null,
        propertyId: null,
        landlordId: new Types.ObjectId(data.landlordId),
        tenantId: new Types.ObjectId(data.landlordId), // Landlord pays for their own subscription
        paymentType: "service",
        amount,
        totalAmount: amount,
        paymentMethod: "in_app",
        status: "verified",
        verifiedAt: new Date(),
        gatewayResponse: data.gatewayResponse,
        notes: `Zero Deposit Protection subscription`
      });

      // Create revenue source with "collected" status (in-app payment is verified)
      const revenueSource = await revenueSourceService.createRevenueSource({
        sourceType: "subscription",
        amount,
        payerId: data.landlordId,
        recipientId: "khayalami",
        paymentId: payment._id.toString(),
        description: `Landlord Zero Deposit Protection subscription`,
        notes: `Monthly subscription for zero deposit protection`,
        status: "collected" // In-app payment is immediately collected
      });

      // Update landlord preferences
      const preferences = await LandlordPreferences.findOne({ landlordId: data.landlordId });
      if (!preferences) {
        throw new Error("Landlord preferences not found");
      }

      if (!preferences.zeroDepositProtection) {
        preferences.zeroDepositProtection = {
          isSubscribed: false,
          autoRenew: true,
          price: 0,
          coverageAmount: 0
        };
      }

      preferences.zeroDepositProtection.isSubscribed = true;
      preferences.zeroDepositProtection.startDate = startDate;
      preferences.zeroDepositProtection.endDate = endDate;
      preferences.zeroDepositProtection.nextBillingDate = nextBillingDate;
      preferences.zeroDepositProtection.autoRenew = data.autoRenew !== false;
      preferences.zeroDepositProtection.price = amount;
      preferences.zeroDepositProtection.coverageAmount = 500; // Default coverage
      await preferences.save();

      return {
        subscription: preferences.zeroDepositProtection,
        revenueSource,
        preferences
      };
    } else {
      throw new Error("Use createZeroDepositProtectionRequest for external payments");
    }
  }

  /**
   * Create zero deposit protection payment request (external payment)
   */
  async createZeroDepositProtectionRequest(data: {
    landlordId: string;
    proofOfPayment: string;
    paymentMethod: "bank_transfer" | "cash" | "mobile_money" | "other";
    autoRenew?: boolean;
    propertyCount?: number;
    notes?: string;
  }): Promise<any> {
    const amount = this.calculateZeroDepositProtectionPrice(data.propertyCount);

    // Create payment request
    const paymentRequest = await PaymentRequest.create({
      tenantId: new Types.ObjectId(data.landlordId),
      rentalId: null,
      agreementId: null,
      propertyId: null,
      landlordId: new Types.ObjectId(data.landlordId),
      requestType: "zero_deposit_protection",
      amount,
      paymentMethod: data.paymentMethod,
      proofOfPayment: data.proofOfPayment,
      status: "pending_admin_approval",
      submittedAt: new Date(),
      notes: `Zero Deposit Protection subscription. Auto-renew: ${data.autoRenew !== false}. ${data.notes || ""}`
    });

    return paymentRequest;
  }

  /**
   * Approve zero deposit protection payment request (admin)
   */
  async approveZeroDepositProtectionRequest(
    requestId: string,
    adminId: string
  ): Promise<{
    paymentRequest: any;
    payment: any;
    revenueSource: any;
    preferences: any;
  }> {
    const paymentRequest = await PaymentRequest.findById(requestId);
    
    if (!paymentRequest) {
      throw new Error("Payment request not found");
    }

    if (paymentRequest.status !== "pending_admin_approval") {
      throw new Error("Payment request is not pending approval");
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    const nextBillingDate = new Date(endDate);

    // Extract auto-renew from notes
    const autoRenewMatch = paymentRequest.notes?.match(/Auto-renew: (true|false)/i);
    const autoRenew = autoRenewMatch ? autoRenewMatch[1] === "true" : true;

    // Create payment record
    const payment = await Payment.create({
      rentalId: null,
      agreementId: null,
      propertyId: null,
      landlordId: paymentRequest.landlordId,
      tenantId: paymentRequest.landlordId,
      paymentType: "service",
      amount: paymentRequest.amount,
      totalAmount: paymentRequest.amount,
      paymentMethod: "cash",
      status: "verified",
      verifiedAt: new Date(),
      proofOfPayment: paymentRequest.proofOfPayment,
      notes: `Zero Deposit Protection subscription (approved by admin)`
    });

    // Create revenue source
    const revenueSource = await revenueSourceService.createRevenueSource({
      sourceType: "subscription",
      amount: paymentRequest.amount,
      payerId: paymentRequest.landlordId.toString(),
      recipientId: "khayalami",
      paymentId: payment._id.toString(),
      description: `Landlord Zero Deposit Protection subscription`,
      notes: `Monthly subscription for zero deposit protection`
    });

    // Add to escrow (100% to Khayalami, 0% to landlord for subscription payments)
    const { escrowService } = await import("./EscrowService");
    await escrowService.addToEscrow(payment, {
      deductions: {
        subscriptionFee: 0,
        processingFee: 0,
        insurancePremium: 0
      },
      revenueSourceIds: [revenueSource._id.toString()]
    });
    // Update status to "held" since payment is verified
    await escrowService.updateEscrowStatus(payment._id.toString(), "held");

    // Update landlord preferences
    const preferences = await LandlordPreferences.findOne({ 
      landlordId: paymentRequest.landlordId 
    });
    
    if (!preferences) {
      throw new Error("Landlord preferences not found");
    }

    if (!preferences.zeroDepositProtection) {
      preferences.zeroDepositProtection = {
        isSubscribed: false,
        autoRenew: true,
        price: 0,
        coverageAmount: 0
      };
    }

    preferences.zeroDepositProtection.isSubscribed = true;
    preferences.zeroDepositProtection.startDate = startDate;
    preferences.zeroDepositProtection.endDate = endDate;
    preferences.zeroDepositProtection.nextBillingDate = nextBillingDate;
    preferences.zeroDepositProtection.autoRenew = autoRenew;
    preferences.zeroDepositProtection.price = paymentRequest.amount;
    preferences.zeroDepositProtection.coverageAmount = 500; // Default coverage
    await preferences.save();

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
      preferences
    };
  }

  /**
   * Get zero deposit protection status
   */
  async getZeroDepositProtectionStatus(landlordId: string): Promise<any> {
    const preferences = await LandlordPreferences.findOne({ landlordId });
    
    if (!preferences || !preferences.zeroDepositProtection?.isSubscribed) {
      return {
        isSubscribed: false,
        subscription: null
      };
    }

    const now = new Date();
    const isActive = preferences.zeroDepositProtection.endDate 
      ? new Date(preferences.zeroDepositProtection.endDate) > now
      : false;

    return {
      isSubscribed: preferences.zeroDepositProtection.isSubscribed && isActive,
      subscription: preferences.zeroDepositProtection
    };
  }

  /**
   * Cancel zero deposit protection subscription
   * Note: Access continues until endDate, but auto-renewal is disabled
   * Properties with zero-deposit enabled will lose this option after endDate
   */
  async cancelZeroDepositProtection(landlordId: string): Promise<void> {
    const preferences = await LandlordPreferences.findOne({ landlordId });
    
    if (!preferences) {
      throw new Error("Landlord preferences not found");
    }

    if (preferences.zeroDepositProtection) {
      // Disable auto-renewal but keep access until endDate
      preferences.zeroDepositProtection.autoRenew = false;
      // Note: isSubscribed remains true until endDate expires
      // This allows landlord to continue offering zero-deposit until current billing period ends
      await preferences.save();
    }
  }
}

export const landlordSubscriptionService = new LandlordSubscriptionService();




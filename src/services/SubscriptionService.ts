// @ts-nocheck
import { Subscription, ISubscription } from "../models/Subscription";
import { Rental } from "../models/Rental";
import { Property } from "../models/Property";
import { Types } from "mongoose";

export class SubscriptionService {
  /**
   * Create subscription for tenant (zero-deposit access) - Account-level
   */
  async createSubscription(data: {
    tenantId: string;
    planType: "premium" | "premium_plus";
    propertyValueBracket: "low" | "medium" | "high";
    rentalId?: string; // Optional - for backward compatibility
  }): Promise<ISubscription> {
    // Check for existing subscription (active, cancelled, or expired) with same tenantId and rentalId
    const existingSubscription = await Subscription.findOne({
      tenantId: new Types.ObjectId(data.tenantId),
      rentalId: data.rentalId ? new Types.ObjectId(data.rentalId) : null
    });

    // If subscription exists and is cancelled/expired, delete it to avoid unique index conflict
    // If it's active, we should have caught this earlier, but handle it here too
    if (existingSubscription) {
      if (existingSubscription.status === "active" && new Date(existingSubscription.endDate) >= new Date()) {
        throw new Error("An active subscription already exists");
      }
      // Delete cancelled/expired subscription
      await Subscription.findByIdAndDelete(existingSubscription._id);
    }

    // Calculate price based on property value bracket
    const price = this.calculatePrice(data.propertyValueBracket, data.planType);
    
    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
    const nextBillingDate = new Date(endDate);

    const subscription = await Subscription.create({
      tenantId: new Types.ObjectId(data.tenantId),
      rentalId: data.rentalId ? new Types.ObjectId(data.rentalId) : null, // Use null instead of undefined
      planType: data.planType,
      price,
      propertyValueBracket: data.propertyValueBracket,
      billingCycle: "monthly",
      status: "active",
      startDate,
      endDate,
      nextBillingDate,
      autoRenew: true,
      features: {
        zeroDepositAccess: true,
        tenantProtectionCoverage: 500,
        discountedServices: true
      }
    });

    return subscription;
  }

  /**
   * Check if tenant has active subscription (account-level)
   */
  async checkSubscriptionStatus(
    tenantId: string,
    rentalId?: string // Optional - for backward compatibility
  ): Promise<{ isActive: boolean; subscription: ISubscription | null }> {
    // Check for account-level subscription (no rentalId) or rental-specific subscription
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      status: "active",
      endDate: { $gte: new Date() }
    };

    // If rentalId provided, check for rental-specific subscription first
    if (rentalId) {
      query.rentalId = new Types.ObjectId(rentalId);
      let subscription = await Subscription.findOne(query);
      if (subscription) {
        return {
          isActive: true,
          subscription
        };
      }
    }

    // Check for account-level subscription (no rentalId)
    query.rentalId = null;
    const subscription = await Subscription.findOne(query);

    return {
      isActive: !!subscription,
      subscription
    };
  }

  /**
   * Calculate subscription fee (account-level)
   */
  async calculateSubscriptionFee(tenantId: string, rentalId?: string): Promise<number> {
    const { subscription } = await this.checkSubscriptionStatus(tenantId, rentalId);
    
    if (!subscription) {
      return 0;
    }
    
    return subscription.price;
  }

  /**
   * Calculate price based on property value bracket
   */
  calculatePrice(
    bracket: "low" | "medium" | "high",
    planType: "premium" | "premium_plus"
  ): number {
    const basePrices = {
      low: { premium: 4.99, premium_plus: 5.99 },
      medium: { premium: 5.99, premium_plus: 6.99 },
      high: { premium: 6.99, premium_plus: 7.99 }
    };

    return basePrices[bracket][planType];
  }

  /**
   * Renew subscription
   */
  async renewSubscription(subscriptionId: string): Promise<ISubscription> {
    const subscription = await Subscription.findById(subscriptionId);
    
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    const newEndDate = new Date(subscription.endDate);
    newEndDate.setMonth(newEndDate.getMonth() + 1);
    
    subscription.endDate = newEndDate;
    subscription.nextBillingDate = newEndDate;
    subscription.status = "active";
    
    await subscription.save();
    
    return subscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    await Subscription.findByIdAndUpdate(subscriptionId, {
      status: "cancelled",
      cancelledAt: new Date(),
      autoRenew: false
    });
  }

  /**
   * Get subscription by tenant (account-level)
   */
  async getSubscription(tenantId: string, rentalId?: string): Promise<ISubscription | null> {
    // First check for account-level subscription (no rentalId)
    let subscription = await Subscription.findOne({
      tenantId: new Types.ObjectId(tenantId),
      rentalId: null,
      status: "active",
      endDate: { $gte: new Date() }
    });

    // If rentalId provided and no account-level subscription, check for rental-specific
    if (!subscription && rentalId) {
      subscription = await Subscription.findOne({
        tenantId: new Types.ObjectId(tenantId),
        rentalId: new Types.ObjectId(rentalId),
        status: "active",
        endDate: { $gte: new Date() }
      });
    }

    return subscription;
  }

  /**
   * Get active subscription for tenant (account-level)
   */
  async getActiveSubscription(tenantId: string): Promise<ISubscription | null> {
    return await Subscription.findOne({
      tenantId: new Types.ObjectId(tenantId),
      rentalId: null, // Account-level only
      status: "active",
      endDate: { $gte: new Date() }
    });
  }
}

export const subscriptionService = new SubscriptionService();


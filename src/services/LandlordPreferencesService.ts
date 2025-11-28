// @ts-nocheck
import { LandlordPreferences, ILandlordPreferences } from "../models/LandlordPreferences";
import { Types } from "mongoose";

export class LandlordPreferencesService {
  /**
   * Get or create landlord preferences
   */
  async getOrCreatePreferences(landlordId: string): Promise<ILandlordPreferences> {
    let preferences = await LandlordPreferences.findOne({ 
      landlordId: new Types.ObjectId(landlordId) 
    });
    
    if (!preferences) {
      preferences = await LandlordPreferences.create({
        landlordId: new Types.ObjectId(landlordId),
        paymentReceptionMethod: "bank_transfer",
        subscriptionPaymentMethod: "via_rent"
      });
    }
    
    return preferences;
  }

  /**
   * Update payment reception method
   */
  async updatePaymentReceptionMethod(
    landlordId: string,
    method: "bank_transfer" | "mobile_money" | "paypal" | "cash",
    details?: {
      bankDetails?: {
        bankName: string;
        accountNumber: string;
        accountHolderName: string;
        branchName?: string;
        swiftCode?: string;
      };
      mobileMoneyDetails?: {
        provider: "ecocash" | "onemoney" | "telecash" | "other";
        phoneNumber: string;
        accountName?: string;
      };
      paypalDetails?: {
        email: string;
        accountName?: string;
      };
    }
  ): Promise<ILandlordPreferences> {
    const preferences = await this.getOrCreatePreferences(landlordId);
    
    preferences.paymentReceptionMethod = method;
    
    // Update relevant details based on method
    if (method === "bank_transfer" && details?.bankDetails) {
      preferences.bankDetails = details.bankDetails;
    } else if (method === "mobile_money" && details?.mobileMoneyDetails) {
      preferences.mobileMoneyDetails = details.mobileMoneyDetails;
    } else if (method === "paypal" && details?.paypalDetails) {
      preferences.paypalDetails = details.paypalDetails;
    }
    
    await preferences.save();
    return preferences;
  }

  /**
   * Update subscription payment method
   */
  async updateSubscriptionPaymentMethod(
    landlordId: string,
    method: "no_subscription" | "via_rent" | "pay_yourself",
    subscriptionDetails?: {
      planType?: "premium" | "premium_plus";
      autoRenew?: boolean;
    }
  ): Promise<ILandlordPreferences> {
    const preferences = await this.getOrCreatePreferences(landlordId);
    
    preferences.subscriptionPaymentMethod = method;
    
    if (method === "pay_yourself" && subscriptionDetails) {
      if (!preferences.subscriptionDetails) {
        preferences.subscriptionDetails = {
          autoRenew: true
        };
      }
      if (subscriptionDetails.planType) {
        preferences.subscriptionDetails.planType = subscriptionDetails.planType;
      }
      if (subscriptionDetails.autoRenew !== undefined) {
        preferences.subscriptionDetails.autoRenew = subscriptionDetails.autoRenew;
      }
    }
    
    await preferences.save();
    return preferences;
  }

  /**
   * Get landlord preferences
   */
  async getPreferences(landlordId: string): Promise<ILandlordPreferences | null> {
    return await LandlordPreferences.findOne({ 
      landlordId: new Types.ObjectId(landlordId) 
    });
  }

  /**
   * Update premium features subscription
   */
  async updatePremiumFeatures(
    landlordId: string,
    data: {
      isSubscribed: boolean;
      planType?: "basic" | "premium" | "premium_plus";
      subscriptionId?: string;
      startDate?: Date;
      endDate?: Date;
      autoRenew?: boolean;
    }
  ): Promise<ILandlordPreferences> {
    const preferences = await this.getOrCreatePreferences(landlordId);
    
    if (!preferences.premiumFeatures) {
      preferences.premiumFeatures = {
        isSubscribed: false,
        autoRenew: true
      };
    }
    
    preferences.premiumFeatures.isSubscribed = data.isSubscribed;
    if (data.planType) preferences.premiumFeatures.planType = data.planType;
    if (data.subscriptionId) {
      preferences.premiumFeatures.subscriptionId = new Types.ObjectId(data.subscriptionId);
    }
    if (data.startDate) preferences.premiumFeatures.startDate = data.startDate;
    if (data.endDate) preferences.premiumFeatures.endDate = data.endDate;
    if (data.autoRenew !== undefined) {
      preferences.premiumFeatures.autoRenew = data.autoRenew;
    }
    
    await preferences.save();
    return preferences;
  }
}

export const landlordPreferencesService = new LandlordPreferencesService();


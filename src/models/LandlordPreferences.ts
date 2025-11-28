// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface ILandlordPreferences extends Document {
  landlordId: mongoose.Types.ObjectId;
  
  // Payment Reception Preferences
  paymentReceptionMethod: "bank_transfer" | "mobile_money" | "paypal" | "cash";
  
  // Bank Transfer Details
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    branchName?: string;
    swiftCode?: string;
  };
  
  // Mobile Money Details
  mobileMoneyDetails?: {
    provider: "ecocash" | "onemoney" | "telecash" | "other";
    phoneNumber: string;
    accountName?: string;
  };
  
  // PayPal Details
  paypalDetails?: {
    email: string;
    accountName?: string;
  };
  
  // Subscription Payment Preference
  subscriptionPaymentMethod: "no_subscription" | "via_rent" | "pay_yourself";
  
  // Subscription Details (if pay_yourself)
  subscriptionDetails?: {
    planType?: "premium" | "premium_plus";
    autoRenew: boolean;
    nextBillingDate?: Date;
  };
  
  // Premium Features Subscription
  premiumFeatures?: {
    isSubscribed: boolean;
    planType?: "basic" | "premium" | "premium_plus";
    subscriptionId?: mongoose.Types.ObjectId;
    startDate?: Date;
    endDate?: Date;
    autoRenew: boolean;
  };
  
  // Zero Deposit Protection Subscription
  zeroDepositProtection?: {
    isSubscribed: boolean;
    subscriptionId?: mongoose.Types.ObjectId;
    startDate?: Date;
    endDate?: Date;
    nextBillingDate?: Date;
    autoRenew: boolean;
    price: number; // Monthly fee
    coverageAmount?: number; // Protection coverage amount
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const landlordPreferencesSchema = new Schema<ILandlordPreferences>({
  landlordId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  
  // Payment Reception
  paymentReceptionMethod: {
    type: String,
    enum: ["bank_transfer", "mobile_money", "paypal", "cash"],
    default: "bank_transfer",
    required: true
  },
  
  // Bank Transfer Details
  bankDetails: {
    bankName: { type: String },
    accountNumber: { type: String },
    accountHolderName: { type: String },
    branchName: { type: String },
    swiftCode: { type: String }
  },
  
  // Mobile Money Details
  mobileMoneyDetails: {
    provider: {
      type: String,
      enum: ["ecocash", "onemoney", "telecash", "other"]
    },
    phoneNumber: { type: String },
    accountName: { type: String }
  },
  
  // PayPal Details
  paypalDetails: {
    email: { type: String },
    accountName: { type: String }
  },
  
  // Subscription Payment Method
  subscriptionPaymentMethod: {
    type: String,
    enum: ["no_subscription", "via_rent", "pay_yourself"],
    default: "no_subscription",
    required: true
  },
  
  // Subscription Details
  subscriptionDetails: {
    planType: {
      type: String,
      enum: ["premium", "premium_plus"]
    },
    autoRenew: {
      type: Boolean,
      default: true
    },
    nextBillingDate: { type: Date }
  },
  
  // Premium Features Subscription
  premiumFeatures: {
    isSubscribed: {
      type: Boolean,
      default: false
    },
    planType: {
      type: String,
      enum: ["basic", "premium", "premium_plus"]
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription"
    },
    startDate: { type: Date },
    endDate: { type: Date },
    autoRenew: {
      type: Boolean,
      default: true
    }
  },
  
  // Zero Deposit Protection Subscription
  zeroDepositProtection: {
    isSubscribed: {
      type: Boolean,
      default: false
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription"
    },
    startDate: { type: Date },
    endDate: { type: Date },
    nextBillingDate: { type: Date },
    autoRenew: {
      type: Boolean,
      default: true
    },
    price: {
      type: Number,
      default: 0
    },
    coverageAmount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes
landlordPreferencesSchema.index({ landlordId: 1 });

export const LandlordPreferences: Model<ILandlordPreferences> = mongoose.model<ILandlordPreferences>(
  "LandlordPreferences",
  landlordPreferencesSchema
);


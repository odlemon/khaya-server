// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface ISubscription extends Document {
  tenantId: mongoose.Types.ObjectId;
  rentalId?: mongoose.Types.ObjectId; // Optional - account-level subscription
  
  // Subscription details
  planType: "premium" | "premium_plus";
  price: number; // USD 4.99-7.99 per month
  propertyValueBracket: "low" | "medium" | "high"; // Determines price
  
  // Billing
  billingCycle: "monthly";
  status: "active" | "cancelled" | "expired";
  
  // Dates
  startDate: Date;
  endDate: Date;
  nextBillingDate: Date;
  cancelledAt?: Date;
  
  // Settings
  autoRenew: boolean;
  
  // Features
  features: {
    zeroDepositAccess: boolean;
    tenantProtectionCoverage: number; // USD 500
    discountedServices: boolean;
  };
  
  // Metadata
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  rentalId: {
    type: Schema.Types.ObjectId,
    ref: "Rental",
    required: false // Optional - account-level subscription
  },
  
  planType: {
    type: String,
    enum: ["premium", "premium_plus"],
    required: true
  },
  
  price: {
    type: Number,
    required: true,
    min: 4.99,
    max: 7.99
  },
  
  propertyValueBracket: {
    type: String,
    enum: ["low", "medium", "high"],
    required: true
  },
  
  billingCycle: {
    type: String,
    enum: ["monthly"],
    default: "monthly",
    required: true
  },
  
  status: {
    type: String,
    enum: ["active", "cancelled", "expired"],
    default: "active",
    required: true
  },
  
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  endDate: {
    type: Date,
    required: true
  },
  
  nextBillingDate: {
    type: Date,
    required: true
  },
  
  cancelledAt: {
    type: Date
  },
  
  autoRenew: {
    type: Boolean,
    default: true
  },
  
  features: {
    zeroDepositAccess: {
      type: Boolean,
      default: true
    },
    tenantProtectionCoverage: {
      type: Number,
      default: 500
    },
    discountedServices: {
      type: Boolean,
      default: true
    }
  },
  
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
subscriptionSchema.index({ tenantId: 1, status: 1 });
subscriptionSchema.index({ rentalId: 1 });
subscriptionSchema.index({ status: 1, nextBillingDate: 1 });
subscriptionSchema.index({ tenantId: 1, status: 1, endDate: 1 }); // For account-level subscription lookup
// Partial unique index: Only one active subscription per tenant (account-level or per rental)
// Note: This index only applies to active subscriptions, allowing multiple cancelled/expired subscriptions
subscriptionSchema.index(
  { tenantId: 1, rentalId: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: "active" }
  }
);

export const Subscription: Model<ISubscription> = mongoose.model<ISubscription>(
  "Subscription",
  subscriptionSchema
);


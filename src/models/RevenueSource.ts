// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IRevenueSource extends Document {
  // Source identification
  sourceType: "subscription" | "agreement_fee" | "processing_fee" | "premium_boost" | "insurance_commission" | "service_fee";
  
  // Financial details
  amount: number;
  
  // Parties
  payerId: mongoose.Types.ObjectId; // Who paid (tenant/landlord)
  recipientId: mongoose.Types.ObjectId | "khayalami"; // Who receives
  
  // References
  paymentId?: mongoose.Types.ObjectId; // Link to payment
  escrowTransactionId?: mongoose.Types.ObjectId; // Link to escrow
  rentalId?: mongoose.Types.ObjectId;
  propertyId?: mongoose.Types.ObjectId; // Link to property (for premium boosts)
  subscriptionId?: mongoose.Types.ObjectId; // If subscription fee
  
  // Status tracking
  status: "pending" | "collected" | "distributed";
  
  // Distribution tracking
  distributedAt?: Date;
  payoutId?: mongoose.Types.ObjectId; // Link to payout when distributed
  
  // Metadata
  description?: string;
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const revenueSourceSchema = new Schema<IRevenueSource>({
  sourceType: {
    type: String,
    enum: ["subscription", "agreement_fee", "processing_fee", "premium_boost", "insurance_commission", "service_fee"],
    required: true
  },
  
  amount: {
    type: Number,
    required: true
  },
  
  payerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  recipientId: {
    type: Schema.Types.Mixed, // Can be ObjectId or "khayalami"
    required: true
  },
  
  paymentId: {
    type: Schema.Types.ObjectId,
    ref: "Payment"
  },
  
  escrowTransactionId: {
    type: Schema.Types.ObjectId,
    ref: "EscrowTransaction"
  },
  
  rentalId: {
    type: Schema.Types.ObjectId,
    ref: "Rental"
  },
  
  propertyId: {
    type: Schema.Types.ObjectId,
    ref: "Property"
  },
  
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: "Subscription"
  },
  
  status: {
    type: String,
    enum: ["pending", "collected", "distributed"],
    default: "pending",
    required: true
  },
  
  distributedAt: {
    type: Date
  },
  
  payoutId: {
    type: Schema.Types.ObjectId,
    ref: "Payout"
  },
  
  description: {
    type: String
  },
  
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
revenueSourceSchema.index({ sourceType: 1, status: 1 });
revenueSourceSchema.index({ payerId: 1 });
revenueSourceSchema.index({ escrowTransactionId: 1 });
revenueSourceSchema.index({ paymentId: 1 });
revenueSourceSchema.index({ status: 1, createdAt: -1 });

export const RevenueSource: Model<IRevenueSource> = mongoose.model<IRevenueSource>(
  "RevenueSource",
  revenueSourceSchema
);


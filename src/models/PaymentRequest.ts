// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IPaymentRequest extends Document {
  tenantId: mongoose.Types.ObjectId;
  rentalId?: mongoose.Types.ObjectId; // Required for rent payments only
  agreementId?: mongoose.Types.ObjectId; // Required for rent payments only
  propertyId?: mongoose.Types.ObjectId; // Required for rent and boost payments
  landlordId: mongoose.Types.ObjectId;
  
  // Payment request type
  requestType: "rent" | "premium_boost" | "premium_features_subscription" | "zero_deposit_protection" | "tenant_subscription" | "agreement_fee";
  
  // Payment details
  amount: number;
  paymentMethod: "bank_transfer" | "cash" | "mobile_money" | "other";
  proofOfPayment: string; // URL to receipt/image
  
  // Status
  status: "pending_admin_approval" | "approved" | "rejected" | "processed";
  
  // Review tracking
  submittedAt: Date;
  reviewedBy?: mongoose.Types.ObjectId; // Admin who reviewed
  reviewedAt?: Date;
  rejectionReason?: string;
  
  // After approval
  paymentId?: mongoose.Types.ObjectId; // Created payment record
  escrowTransactionId?: mongoose.Types.ObjectId; // Created escrow transaction
  
  // Metadata
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const paymentRequestSchema = new Schema<IPaymentRequest>({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  rentalId: {
    type: Schema.Types.ObjectId,
    ref: "Rental",
    required: false // Optional - not needed for subscriptions/boosts
  },
  
  agreementId: {
    type: Schema.Types.ObjectId,
    ref: "Agreement",
    required: false // Optional - not needed for subscriptions/boosts
  },
  
  propertyId: {
    type: Schema.Types.ObjectId,
    ref: "Property",
    required: false // Optional - not needed for subscriptions (but needed for boosts)
  },
  
  landlordId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  requestType: {
    type: String,
    enum: ["rent", "premium_boost", "premium_features_subscription", "zero_deposit_protection", "tenant_subscription", "agreement_fee"],
    required: true,
    default: "rent"
  },
  
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  paymentMethod: {
    type: String,
    enum: ["bank_transfer", "cash", "mobile_money", "other"],
    required: true
  },
  
  proofOfPayment: {
    type: String,
    required: true
  },
  
  status: {
    type: String,
    enum: ["pending_admin_approval", "approved", "rejected", "processed"],
    default: "pending_admin_approval",
    required: true
  },
  
  submittedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  
  reviewedAt: {
    type: Date
  },
  
  rejectionReason: {
    type: String
  },
  
  paymentId: {
    type: Schema.Types.ObjectId,
    ref: "Payment"
  },
  
  escrowTransactionId: {
    type: Schema.Types.ObjectId,
    ref: "EscrowTransaction"
  },
  
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
paymentRequestSchema.index({ status: 1, submittedAt: -1 });
paymentRequestSchema.index({ requestType: 1, status: 1 }); // For filtering by request type
paymentRequestSchema.index({ tenantId: 1 });
paymentRequestSchema.index({ landlordId: 1 });
paymentRequestSchema.index({ rentalId: 1 });
paymentRequestSchema.index({ reviewedBy: 1 });

export const PaymentRequest: Model<IPaymentRequest> = mongoose.model<IPaymentRequest>(
  "PaymentRequest",
  paymentRequestSchema
);


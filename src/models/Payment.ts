// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IPayment extends Document {
  rentalId?: mongoose.Types.ObjectId; // Optional - not needed for subscriptions/boosts
  agreementId?: mongoose.Types.ObjectId; // Optional - not needed for subscriptions/boosts
  propertyId?: mongoose.Types.ObjectId; // Optional - not needed for subscriptions
  invoiceId?: mongoose.Types.ObjectId; // Link to invoice being paid (for rent payments)
  landlordId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  
  // Payment identification
  receiptNumber?: string; // Auto-generated unique receipt number
  
  paymentType: "rent" | "deposit" | "utility" | "service" | "other";
  amount: number;
  
  // Dates
  dueDate?: Date; // Optional - not needed for subscriptions/boosts
  paymentDate?: Date;
  verifiedAt?: Date;
  
  // Late fees
  lateFee?: number;
  daysLate?: number;
  totalAmount?: number; // amount + lateFee
  
  paymentMethod: "in_app" | "cash";
  proofOfPayment?: string; // Firebase URL (optional for cash)
  
  gatewayResponse?: {
    provider: "paynow" | "contipay" | "stripe" | "paystack" | "flutterwave" | "other";
    transactionId: string;
    transactionRef: string;
    paidAt: Date;
    rawResponse: any;
  };
  
  utilityReceipts?: [{
    type: string; // electricity, water, gas, etc.
    amount: number;
    receiptUrl: string;
  }];
  
  status: "pending" | "paid" | "overdue" | "disputed" | "cancelled" | "verified" | "rejected";
  
  // Landlord verification
  verifiedBy?: mongoose.Types.ObjectId; // Landlord who verified
  verificationNotes?: string;
  rejectionReason?: string;
  
  // Reminders
  reminders?: [{
    sentAt: Date;
    type: "email" | "sms" | "push";
    status: "sent" | "failed";
  }];
  
  notes?: string;

  /** Breakdown for first rent when agreement fee is bundled */
  metadata?: {
    rentPortion?: number;
    agreementFeePortion?: number;
    insurancePortion?: number;
    [key: string]: unknown;
  };
  
  // Payment gateway fields (ContiPay / PayNow)
  pollUrl?: string;
  gatewayReference?: string;
  gatewayMetadata?: {
    paymentPurpose: string;
    [key: string]: any;
  };
  /** @deprecated use gatewayReference */
  paynowReference?: string;
  /** @deprecated use gatewayMetadata */
  paynowMetadata?: {
    paymentPurpose: string;
    [key: string]: any;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>({
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
    required: false // Optional - not needed for subscriptions
  },
  landlordId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  tenantId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  
  // Payment identification
  receiptNumber: { type: String, unique: true, sparse: true },
  
  paymentType: { 
    type: String, 
    enum: ["rent", "deposit", "utility", "service", "other"], 
    required: true 
  },
  amount: { type: Number, required: true },
  
  // Dates
  dueDate: { type: Date, required: false }, // Optional - not needed for subscriptions/boosts
  paymentDate: { type: Date },
  verifiedAt: { type: Date },
  
  // Late fees
  lateFee: { type: Number, default: 0 },
  daysLate: { type: Number, default: 0 },
  totalAmount: { type: Number },
  
  paymentMethod: { 
    type: String, 
    enum: ["in_app", "cash"],
    required: true
  },
  proofOfPayment: { type: String }, // Optional for cash
  
  gatewayResponse: {
    provider: { type: String, enum: ["paynow", "contipay", "stripe", "paystack", "flutterwave", "other"] },
    transactionId: { type: String },
    transactionRef: { type: String },
    paidAt: { type: Date },
    rawResponse: { type: Schema.Types.Mixed }
  },
  
  utilityReceipts: [{
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    receiptUrl: { type: String, required: true }
  }],
  
  status: { 
    type: String, 
    enum: ["pending", "paid", "overdue", "disputed", "cancelled", "verified", "rejected"], 
    default: "pending" 
  },
  
  // Landlord verification
  verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  verificationNotes: { type: String },
  rejectionReason: { type: String },
  
  // Reminders
  reminders: [{
    sentAt: { type: Date, required: true },
    type: { type: String, enum: ["email", "sms", "push"], required: true },
    status: { type: String, enum: ["sent", "failed"], required: true }
  }],
  
  notes: { type: String },

  metadata: { type: Schema.Types.Mixed },
  
  // Payment gateway fields
  pollUrl: { type: String },
  gatewayReference: { type: String, index: true },
  gatewayMetadata: { type: Schema.Types.Mixed },
  paynowReference: { type: String, index: true },
  paynowMetadata: { type: Schema.Types.Mixed }
}, { 
  timestamps: true 
});

// Indexes
paymentSchema.index({ rentalId: 1 });
paymentSchema.index({ agreementId: 1 });
paymentSchema.index({ landlordId: 1 });
paymentSchema.index({ tenantId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ dueDate: 1 });
paymentSchema.index({ paymentType: 1 });

// Auto-update status to overdue and calculate late fees
paymentSchema.pre('save', function(next) {
  const now = new Date();

  const hasGatewayRef = !!(this.gatewayReference || this.paynowReference);
  const isInFlightOnline =
    hasGatewayRef && (this.status === "pending" || this.status === "overdue") && !this.verifiedAt;

  // Do not mark in-flight EcoCash/ContiPay payments overdue while awaiting gateway confirmation
  if (this.dueDate && this.dueDate < now && this.status === "pending" && !isInFlightOnline) {
    this.status = "overdue";
    const diffTime = Math.abs(now.getTime() - this.dueDate.getTime());
    this.daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Calculate late fee (example: 5% per week, max 20%)
    const weeksLate = Math.ceil(this.daysLate / 7);
    const lateFeePercentage = Math.min(weeksLate * 5, 20) / 100;
    this.lateFee = Math.round(this.amount * lateFeePercentage);
  }

  // Calculate total amount
  this.totalAmount = this.amount + (this.lateFee || 0);
  
  // Generate receipt number when payment is made
  if (this.isModified('status') && (this.status === 'paid' || this.status === 'verified') && !this.receiptNumber) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.receiptNumber = `REC-${timestamp}-${random}`;
  }
  
  next();
});

export const Payment: Model<IPayment> = mongoose.model<IPayment>("Payment", paymentSchema);


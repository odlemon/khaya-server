// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IEscrowTransaction extends Document {
  // Payment reference
  paymentId: mongoose.Types.ObjectId;
  rentalId: mongoose.Types.ObjectId;
  agreementId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  
  // Parties involved
  landlordId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  
  // Financial details
  totalAmount: number; // Full payment amount from tenant
  landlordAmount: number; // Amount landlord should receive (net rent)
  khayalamiAmount: number; // Total fees/commissions for Khayalami
  
  // Deductions breakdown
  deductions: {
    subscriptionFee: number;
    processingFee: number;
    insurancePremium: number;
    totalDeductions: number;
  };
  
  // Payment details
  paymentMethod: "in_app" | "cash";
  paymentType: "rent" | "deposit" | "utility" | "service" | "other";
  paymentSource: "in_app" | "external_deposit"; // How payment was made
  
  // Escrow status
  status: "pending" | "held" | "distributed" | "cancelled";
  
  // Distribution tracking
  distributedAt?: Date;
  distributedBy?: mongoose.Types.ObjectId; // Admin who distributed
  distributionMethod?: "scheduled" | "manual"; // How it was distributed
  
  // Landlord payout tracking
  landlordPayoutId?: mongoose.Types.ObjectId; // Reference to payout record
  landlordPayoutStatus?: "pending" | "paid" | "failed";
  landlordPayoutDate?: Date;
  
  // Khayalami payout tracking
  khayalamiPayoutId?: mongoose.Types.ObjectId; // Reference to payout record
  khayalamiPayoutStatus?: "pending" | "paid" | "failed";
  khayalamiPayoutDate?: Date;
  
  // Payment verification (for cash payments)
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  
  // Revenue source tracking
  revenueSourceIds: mongoose.Types.ObjectId[]; // Links to RevenueSource records
  
  // Metadata
  receiptNumber?: string;
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const escrowTransactionSchema = new Schema<IEscrowTransaction>({
  // Payment reference
  paymentId: {
    type: Schema.Types.ObjectId,
    ref: "Payment",
    required: true,
    unique: true
  },
  rentalId: {
    type: Schema.Types.ObjectId,
    ref: "Rental",
    required: true
  },
  agreementId: {
    type: Schema.Types.ObjectId,
    ref: "Agreement",
    required: true
  },
  propertyId: {
    type: Schema.Types.ObjectId,
    ref: "Property",
    required: true
  },
  
  // Parties involved
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
  
  // Financial details
  totalAmount: {
    type: Number,
    required: true
  },
  landlordAmount: {
    type: Number,
    required: true
  },
  khayalamiAmount: {
    type: Number,
    required: true
  },
  
  // Deductions breakdown
  deductions: {
    subscriptionFee: { type: Number, default: 0 },
    processingFee: { type: Number, default: 0 },
    insurancePremium: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 }
  },
  
  // Payment details
  paymentMethod: {
    type: String,
    enum: ["in_app", "cash"],
    required: true
  },
  paymentType: {
    type: String,
    enum: ["rent", "deposit", "utility", "service", "other"],
    required: true
  },
  paymentSource: {
    type: String,
    enum: ["in_app", "external_deposit"],
    default: "in_app",
    required: true
  },
  
  // Escrow status
  status: {
    type: String,
    enum: ["pending", "held", "distributed", "cancelled"],
    default: "pending",
    required: true
  },
  
  // Distribution tracking
  distributedAt: {
    type: Date
  },
  distributedBy: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  distributionMethod: {
    type: String,
    enum: ["scheduled", "manual"]
  },
  
  // Landlord payout tracking
  landlordPayoutId: {
    type: Schema.Types.ObjectId,
    ref: "Payout"
  },
  landlordPayoutStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending"
  },
  landlordPayoutDate: {
    type: Date
  },
  
  // Khayalami payout tracking
  khayalamiPayoutId: {
    type: Schema.Types.ObjectId,
    ref: "Payout"
  },
  khayalamiPayoutStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending"
  },
  khayalamiPayoutDate: {
    type: Date
  },
  
  // Payment verification
  verifiedAt: {
    type: Date
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  
  // Revenue source tracking
  revenueSourceIds: [{
    type: Schema.Types.ObjectId,
    ref: "RevenueSource"
  }],
  
  // Revenue source tracking
  revenueSourceIds: [{
    type: Schema.Types.ObjectId,
    ref: "RevenueSource"
  }],
  
  // Metadata
  receiptNumber: {
    type: String
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
escrowTransactionSchema.index({ landlordId: 1, status: 1 });
escrowTransactionSchema.index({ tenantId: 1, status: 1 });
escrowTransactionSchema.index({ status: 1, createdAt: 1 });
escrowTransactionSchema.index({ paymentId: 1 });
escrowTransactionSchema.index({ rentalId: 1 });
escrowTransactionSchema.index({ distributedAt: 1 });
escrowTransactionSchema.index({ landlordPayoutStatus: 1 });
escrowTransactionSchema.index({ khayalamiPayoutStatus: 1 });

export const EscrowTransaction: Model<IEscrowTransaction> = mongoose.model<IEscrowTransaction>(
  "EscrowTransaction",
  escrowTransactionSchema
);

// ============================================
// ESCROW ACCOUNT MODEL (Central Account)
// ============================================

export interface IEscrowAccount extends Document {
  // Account identification
  accountName: string; // "Khayalami Escrow Account"
  accountType: "main" | "reserve"; // Main escrow or reserve account
  
  // Balance tracking
  totalHeld: number; // Total amount currently held in escrow
  totalDistributed: number; // Lifetime total distributed
  totalLandlordPayouts: number; // Total paid to landlords
  totalKhayalamiPayouts: number; // Total commission collected
  
  // Monthly tracking
  monthlyHeld: {
    year: number;
    month: number;
    amount: number;
  }[];
  
  // Transaction counts
  totalTransactions: number;
  pendingTransactions: number;
  distributedTransactions: number;
  
  // Settings
  autoDistributionEnabled: boolean; // Auto-distribute at month end
  distributionDay: number; // Day of month to distribute (e.g., 1st, 15th, last day)
  
  // Last distribution
  lastDistributionDate?: Date;
  lastDistributionAmount?: number;
  lastDistributionMethod?: "scheduled" | "manual";
  
  createdAt: Date;
  updatedAt: Date;
}

const escrowAccountSchema = new Schema<IEscrowAccount>({
  accountName: {
    type: String,
    default: "Khayalami Escrow Account",
    required: true
  },
  accountType: {
    type: String,
    enum: ["main", "reserve"],
    default: "main",
    required: true
  },
  
  totalHeld: {
    type: Number,
    default: 0
  },
  totalDistributed: {
    type: Number,
    default: 0
  },
  totalLandlordPayouts: {
    type: Number,
    default: 0
  },
  totalKhayalamiPayouts: {
    type: Number,
    default: 0
  },
  
  monthlyHeld: [{
    year: Number,
    month: Number,
    amount: Number
  }],
  
  totalTransactions: {
    type: Number,
    default: 0
  },
  pendingTransactions: {
    type: Number,
    default: 0
  },
  distributedTransactions: {
    type: Number,
    default: 0
  },
  
  autoDistributionEnabled: {
    type: Boolean,
    default: false
  },
  distributionDay: {
    type: Number,
    default: 1, // 1st of month
    min: 1,
    max: 31
  },
  
  lastDistributionDate: {
    type: Date
  },
  lastDistributionAmount: {
    type: Number
  },
  lastDistributionMethod: {
    type: String,
    enum: ["scheduled", "manual"]
  }
}, {
  timestamps: true
});

// Ensure only one main account exists
escrowAccountSchema.index({ accountType: 1 }, { unique: true, sparse: true });

export const EscrowAccount: Model<IEscrowAccount> = mongoose.model<IEscrowAccount>(
  "EscrowAccount",
  escrowAccountSchema
);

// ============================================
// PAYOUT MODEL (Distribution Records)
// ============================================

export interface IPayout extends Document {
  // Payout identification
  payoutType: "landlord" | "khayalami" | "bulk_landlord" | "bulk_khayalami";
  
  // Recipient
  recipientId?: mongoose.Types.ObjectId; // Landlord ID (if landlord payout)
  recipientType: "landlord" | "khayalami";
  
  // Amount
  amount: number;
  
  // Source escrow transactions
  escrowTransactionIds: mongoose.Types.ObjectId[]; // Which escrow transactions this payout covers
  
  // Payout method
  payoutMethod: "bank_transfer" | "mobile_money" | "internal_transfer";
  
  // Bank/Mobile money details
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    branchCode?: string;
  };
  mobileMoneyDetails?: {
    provider: "MTN" | "Airtel" | "Vodacom" | "other";
    phoneNumber: string;
    accountName: string;
  };
  
  // Status
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  
  // Processing details
  processedAt?: Date;
  processedBy?: mongoose.Types.ObjectId; // Admin who processed
  failureReason?: string;
  
  // External reference (bank transaction ID, etc.)
  externalReference?: string;
  
  // Distribution batch
  distributionBatchId?: mongoose.Types.ObjectId; // If part of monthly distribution
  
  // Metadata
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const payoutSchema = new Schema<IPayout>({
  payoutType: {
    type: String,
    enum: ["landlord", "khayalami", "bulk_landlord", "bulk_khayalami"],
    required: true
  },
  
  recipientId: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  recipientType: {
    type: String,
    enum: ["landlord", "khayalami"],
    required: true
  },
  
  amount: {
    type: Number,
    required: true
  },
  
  escrowTransactionIds: [{
    type: Schema.Types.ObjectId,
    ref: "EscrowTransaction",
    required: true
  }],
  
  payoutMethod: {
    type: String,
    enum: ["bank_transfer", "mobile_money", "internal_transfer"],
    required: true
  },
  
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    branchCode: String
  },
  
  mobileMoneyDetails: {
    provider: {
      type: String,
      enum: ["MTN", "Airtel", "Vodacom", "other"]
    },
    phoneNumber: String,
    accountName: String
  },
  
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed", "cancelled"],
    default: "pending",
    required: true
  },
  
  processedAt: {
    type: Date
  },
  processedBy: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  failureReason: {
    type: String
  },
  
  externalReference: {
    type: String
  },
  
  distributionBatchId: {
    type: Schema.Types.ObjectId
  },
  
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
payoutSchema.index({ recipientId: 1, status: 1 });
payoutSchema.index({ status: 1, createdAt: -1 });
payoutSchema.index({ distributionBatchId: 1 });
payoutSchema.index({ payoutType: 1 });

export const Payout: Model<IPayout> = mongoose.model<IPayout>("Payout", payoutSchema);


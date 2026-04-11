// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface ITransaction {
  type: "credit" | "debit" | "withdrawal" | "refund";
  amount: number;
  description: string;
  paymentId?: mongoose.Types.ObjectId;
  withdrawalId?: mongoose.Types.ObjectId;
  date: Date;
  balanceAfter: number;
}

export interface ILandlordBalance extends Document {
  landlordId: mongoose.Types.ObjectId;
  
  // Balance tracking
  availableBalance: number; // Can be withdrawn
  pendingBalance: number; // Payments not yet verified
  totalEarnings: number; // Lifetime earnings
  totalWithdrawn: number; // Lifetime withdrawals
  
  /**
   * Exactly one payout destination: `bank` or `ecocash`.
   * Legacy documents may omit this and only have bankDetails / mobileMoneyDetails.
   */
  payoutMethod?: "bank" | "ecocash";

  // Bank details for withdrawals (when payoutMethod is bank)
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    branchCode?: string;
  };

  /** EcoCash (when payoutMethod is ecocash) */
  ecocashDetails?: {
    registeredName: string;
    phoneNumber: string;
  };

  // Mobile money details (legacy / non–EcoCash)
  mobileMoneyDetails?: {
    provider: "MTN" | "Airtel" | "Vodacom" | "other";
    phoneNumber: string;
    accountName: string;
  };
  
  // Transaction history
  transactions: ITransaction[];
  
  // Stats
  stats: {
    totalPaymentsReceived: number;
    totalRentCollected: number;
    totalDepositsCollected: number;
    averageMonthlyIncome: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  type: { 
    type: String, 
    enum: ["credit", "debit", "withdrawal", "refund"], 
    required: true 
  },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
  withdrawalId: { type: Schema.Types.ObjectId, ref: "Withdrawal" },
  date: { type: Date, default: Date.now },
  balanceAfter: { type: Number, required: true }
}, { _id: true });

const landlordBalanceSchema = new Schema<ILandlordBalance>({
  landlordId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    unique: true
  },
  
  availableBalance: { type: Number, default: 0 },
  pendingBalance: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  totalWithdrawn: { type: Number, default: 0 },

  payoutMethod: {
    type: String,
    enum: ["bank", "ecocash"],
  },

  bankDetails: {
    accountName: { type: String },
    accountNumber: { type: String },
    bankName: { type: String },
    branchCode: { type: String },
  },

  ecocashDetails: {
    registeredName: { type: String },
    phoneNumber: { type: String },
  },

  mobileMoneyDetails: {
    provider: { type: String, enum: ["MTN", "Airtel", "Vodacom", "other"] },
    phoneNumber: { type: String },
    accountName: { type: String },
  },
  
  transactions: [transactionSchema],
  
  stats: {
    totalPaymentsReceived: { type: Number, default: 0 },
    totalRentCollected: { type: Number, default: 0 },
    totalDepositsCollected: { type: Number, default: 0 },
    averageMonthlyIncome: { type: Number, default: 0 }
  }
}, { 
  timestamps: true 
});

// Indexes
landlordBalanceSchema.index({ landlordId: 1 });
landlordBalanceSchema.index({ "transactions.date": -1 });

// Method to add transaction
landlordBalanceSchema.methods.addTransaction = function(
  type: "credit" | "debit" | "withdrawal" | "refund",
  amount: number,
  description: string,
  referenceId?: string
) {
  const balanceChange = type === "credit" || type === "refund" ? amount : -amount;
  
  if (type === "credit" || type === "refund") {
    this.availableBalance += amount;
    this.totalEarnings += amount;
  } else if (type === "withdrawal") {
    this.availableBalance -= amount;
    this.totalWithdrawn += amount;
  }
  
  this.transactions.push({
    type,
    amount,
    description,
    paymentId: referenceId,
    date: new Date(),
    balanceAfter: this.availableBalance
  });
  
  // Calculate average monthly income
  const monthlyPayments = this.transactions
    .filter(t => t.type === "credit" && t.date > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
    .reduce((sum, t) => sum + t.amount, 0);
  this.stats.averageMonthlyIncome = Math.round(monthlyPayments / 12);
};

export const LandlordBalance: Model<ILandlordBalance> = mongoose.model<ILandlordBalance>(
  "LandlordBalance", 
  landlordBalanceSchema
);




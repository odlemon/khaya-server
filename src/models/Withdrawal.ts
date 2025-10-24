// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IWithdrawal extends Document {
  landlordId: mongoose.Types.ObjectId;
  
  amount: number;
  withdrawalMethod: "bank_transfer" | "mobile_money" | "cheque";
  
  // Bank details (if bank_transfer)
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    branchCode?: string;
  };
  
  // Mobile money details (if mobile_money)
  mobileMoneyDetails?: {
    provider: "MTN" | "Airtel" | "Vodacom" | "other";
    phoneNumber: string;
    accountName: string;
  };
  
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  
  // Admin processing
  processedBy?: mongoose.Types.ObjectId;
  adminNotes?: string;
  failureReason?: string;
  
  // Transaction reference
  transactionReference?: string; // Bank/Mobile money reference
  
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalSchema = new Schema<IWithdrawal>({
  landlordId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  
  amount: { type: Number, required: true },
  withdrawalMethod: { 
    type: String, 
    enum: ["bank_transfer", "mobile_money", "cheque"], 
    required: true 
  },
  
  bankDetails: {
    accountName: { type: String },
    accountNumber: { type: String },
    bankName: { type: String },
    branchCode: { type: String }
  },
  
  mobileMoneyDetails: {
    provider: { type: String, enum: ["MTN", "Airtel", "Vodacom", "other"] },
    phoneNumber: { type: String },
    accountName: { type: String }
  },
  
  status: { 
    type: String, 
    enum: ["pending", "processing", "completed", "failed", "cancelled"], 
    default: "pending" 
  },
  
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  completedAt: { type: Date },
  
  processedBy: { type: Schema.Types.ObjectId, ref: "User" },
  adminNotes: { type: String },
  failureReason: { type: String },
  
  transactionReference: { type: String }
}, { 
  timestamps: true 
});

// Indexes
withdrawalSchema.index({ landlordId: 1 });
withdrawalSchema.index({ status: 1 });
withdrawalSchema.index({ requestedAt: -1 });

export const Withdrawal: Model<IWithdrawal> = mongoose.model<IWithdrawal>("Withdrawal", withdrawalSchema);




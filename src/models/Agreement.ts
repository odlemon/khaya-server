// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IAgreement extends Document {
  propertyId: mongoose.Types.ObjectId;
  landlordId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  status: "draft" | "pending" | "signed" | "active" | "expired" | "terminated" | "pending_termination";
  type: "tenancy" | "maintenance" | "service";
  
  // Agreement Details
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  rentAmount: number;
  depositAmount: number;
  zeroDeposit: boolean;
  
  // Terms and Conditions
  terms: string[];
  specialConditions: string[];
  
  // Signatures
  landlordSignature?: {
    signedAt: Date;
    signatureData: string;
    ipAddress: string;
  };
  tenantSignature?: {
    signedAt: Date;
    signatureData: string;
    signatureUrl?: string;
    ipAddress: string;
    paymentStatus?: "no_payment" | "pending_payment" | "payment_approved" | "verified" | "deferred";
  };

  /** One-time agreement processing fee (USD 30–50); paid by tenant before signing */
  agreementFeeAmount?: number;
  agreementFeeStatus?: "pending" | "charged";
  agreementFeeChargedAt?: Date;

  /** Snapshot of listing service fee terms at agreement creation */
  serviceFeePayer?: "landlord" | "tenant";
  serviceFeeAmount?: number;
  
  // Documents
  attachments: {
    name: string;
    url: string;
    type: string;
    uploadedAt: Date;
  }[];
  
  // Payment Terms
  paymentSchedule: {
    frequency: "monthly" | "weekly" | "bi-weekly";
    dueDay: number;
    lateFee: number;
    gracePeriod: number;
  };
  
  // Utilities and Services
  utilitiesIncluded: boolean;
  utilitiesList: string[];
  maintenanceIncluded: boolean;
  
  // Notifications
  notifications: {
    rentReminder: boolean;
    maintenanceUpdates: boolean;
    agreementAlerts: boolean;
  };
  
  // Protection Plan
  khayalamiProtection: {
    enabled: boolean;
    planType: "basic" | "premium";
    monthlyFee: number;
    coverage: string[];
  };
  
  // Termination Request (2-step process)
  terminationRequest?: {
    requestedBy: mongoose.Types.ObjectId;
    requestedByRole: "landlord" | "tenant";
    reason: string;
    terminationDate: Date;
    notes?: string;
    requestedAt: Date;
  };
  
  // Extended Template Fields
  agreementDate?: Date; // Date when agreement is executed
  earlyPaymentRentalAmount?: number; // Discounted rental if paid early
  utilityDepositAmount?: number; // Deposit for utilities
  securityDepositMonths?: number; // Number of months as security deposit (default: 2)
  renewalOptionPeriod?: string; // e.g., "One year only"
  renewalNoticePeriod?: string; // e.g., "Two (2) months"
  propertyUsePurpose?: string; // e.g., "Residential Purpose Only"
  minorRepairsLimit?: number; // Maximum tenant responsible for minor repairs
  cleaningFee?: number; // Fee if property not returned properly
  latePaymentInterestRate?: number; // Annual interest rate for late payments
  landlordTerminationNotice?: string; // e.g., "1 month"
  inventoryAddress?: string; // Address for inventory list
  inventoryItems?: Array<{
    item: string;
    quantity: string;
  }>; // List of furniture/fixtures
  witnessName?: string; // Witness name
  witnessSignature?: string; // Witness signature URL
  witnessId?: string; // Witness ID number
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  signedAt?: Date;
  activatedAt?: Date;
  expiredAt?: Date;
  terminatedAt?: Date;
  terminatedBy?: mongoose.Types.ObjectId;
  /** Unauthenticated token for email PDF download links */
  publicPdfToken?: string;
}

const agreementSchema = new Schema<IAgreement>({
  propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true },
  landlordId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  tenantId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { 
    type: String, 
    enum: ["draft", "pending", "signed", "active", "expired", "terminated", "pending_termination"], 
    default: "draft" 
  },
  type: { 
    type: String, 
    enum: ["tenancy", "maintenance", "service"], 
    default: "tenancy" 
  },
  
  // Agreement Details
  title: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  rentAmount: { type: Number, required: true },
  depositAmount: { type: Number, default: 0 },
  zeroDeposit: { type: Boolean, default: false },
  
  // Terms and Conditions
  terms: [{ type: String }],
  specialConditions: [{ type: String }],
  
  // Signatures
  landlordSignature: {
    signedAt: { type: Date },
    signatureUrl: { type: String }, // URL to signature image
    ipAddress: { type: String }
  },
  tenantSignature: {
    signedAt: { type: Date },
    signatureUrl: { type: String }, // URL to signature image
    ipAddress: { type: String },
    paymentStatus: { 
      type: String, 
      enum: ["no_payment", "pending_payment", "payment_approved", "verified", "deferred"]
    }
  },

  agreementFeeAmount: { type: Number, default: 0 },
  agreementFeeStatus: {
    type: String,
    enum: ["pending", "charged"],
    default: "pending",
  },
  agreementFeeChargedAt: { type: Date },

  serviceFeePayer: {
    type: String,
    enum: ["landlord", "tenant"],
    default: "landlord",
  },
  serviceFeeAmount: { type: Number, default: 10 },
  
  // Documents
  attachments: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Payment Terms
  paymentSchedule: {
    frequency: { type: String, enum: ["monthly", "weekly", "bi-weekly"], default: "monthly" },
    dueDay: { type: Number, default: 1 },
    lateFee: { type: Number, default: 0 },
    gracePeriod: { type: Number, default: 5 }
  },
  
  // Utilities and Services
  utilitiesIncluded: { type: Boolean, default: false },
  utilitiesList: [{ type: String }],
  maintenanceIncluded: { type: Boolean, default: false },
  
  // Notifications
  notifications: {
    rentReminder: { type: Boolean, default: true },
    maintenanceUpdates: { type: Boolean, default: true },
    agreementAlerts: { type: Boolean, default: true }
  },
  
  // Protection Plan
  khayalamiProtection: {
    enabled: { type: Boolean, default: false },
    planType: { type: String, enum: ["basic", "premium"], default: "basic" },
    monthlyFee: { type: Number, default: 0 },
    coverage: [{ type: String }]
  },
  
  // Termination Request (2-step process)
  terminationRequest: {
    requestedBy: { type: Schema.Types.ObjectId, ref: "User" },
    requestedByRole: { type: String, enum: ["landlord", "tenant"] },
    reason: { type: String },
    terminationDate: { type: Date },
    notes: { type: String },
    requestedAt: { type: Date }
  },
  
  // Termination tracking
  terminatedAt: { type: Date },
  terminatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  
  // Extended Template Fields
  agreementDate: { type: Date },
  earlyPaymentRentalAmount: { type: Number },
  utilityDepositAmount: { type: Number, default: 0 },
  securityDepositMonths: { type: Number, default: 2 },
  renewalOptionPeriod: { type: String, default: "One year only" },
  renewalNoticePeriod: { type: String, default: "Two (2) months" },
  propertyUsePurpose: { type: String, default: "Residential Purpose Only" },
  minorRepairsLimit: { type: Number, default: 20.00 },
  cleaningFee: { type: Number },
  latePaymentInterestRate: { type: Number, default: 10 },
  landlordTerminationNotice: { type: String, default: "1 month" },
  inventoryAddress: { type: String },
  inventoryItems: [{
    item: { type: String, required: true },
    quantity: { type: String, required: true }
  }],
  witnessName: { type: String },
  witnessSignature: { type: String },
  witnessId: { type: String },

  publicPdfToken: { type: String, unique: true, sparse: true, index: true },
}, { 
  timestamps: true 
});

// Indexes
agreementSchema.index({ propertyId: 1 });
agreementSchema.index({ landlordId: 1 });
agreementSchema.index({ tenantId: 1 });
agreementSchema.index({ status: 1 });
agreementSchema.index({ startDate: 1, endDate: 1 });

// Virtual for agreement duration
agreementSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return 0;
});

// Virtual for isActive
agreementSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.startDate <= now && 
         this.endDate >= now;
});

// Pre-save middleware to update status based on dates
agreementSchema.pre('save', function(next) {
  const now = new Date();
  
  if (this.status === 'signed' && this.startDate <= now && this.endDate >= now) {
    this.status = 'active';
    this.activatedAt = now;
  } else if (this.status === 'active' && this.endDate < now) {
    this.status = 'expired';
    this.expiredAt = now;
  }
  
  next();
});

export const Agreement: Model<IAgreement> = mongoose.model<IAgreement>("Agreement", agreementSchema); 
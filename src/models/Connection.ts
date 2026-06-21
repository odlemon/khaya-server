// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IConnection extends Document {
  tenantId: mongoose.Types.ObjectId;
  landlordId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  message: string;
  expectedMoveInDate?: Date;
  /**
   * Preferred monthly budget range (tenant-provided).
   * Frontend should send expectedBudgetMin/expectedBudgetMax.
   */
  expectedBudgetMin?: number;
  expectedBudgetMax?: number;
  numberOfOccupants?: number;
  employmentStatus?: "employed" | "self-employed" | "student" | "unemployed" | "retired" | "other";
  leaseDurationMonths?: number;
  hasPets?: boolean;
  petDetails?: string;
  specialRequirements?: string;
  responseMessage?: string;
  respondedAt?: Date;
  respondedBy?: mongoose.Types.ObjectId;
  isActive: boolean;
  /** Set when tenant soft-clears a cancelled/rejected request from their list */
  dismissedByTenantAt?: Date;
  /** Set when landlord soft-clears a cancelled/rejected request from their list */
  dismissedByLandlordAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const connectionSchema = new Schema<IConnection>({
  tenantId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  landlordId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  propertyId: { 
    type: Schema.Types.ObjectId, 
    ref: "Property", 
    required: true 
  },
  status: { 
    type: String, 
    enum: ["pending", "accepted", "rejected", "cancelled"],
    default: "pending" 
  },
  message: { 
    type: String, 
    required: true, 
    maxlength: 500 
  },
  expectedMoveInDate: {
    type: Date
  },
  expectedBudgetMin: {
    type: Number,
    min: 0
  },
  expectedBudgetMax: {
    type: Number,
    min: 0
  },
  numberOfOccupants: {
    type: Number,
    min: 1
  },
  employmentStatus: {
    type: String,
    enum: ["employed", "self-employed", "student", "unemployed", "retired", "other"]
  },
  leaseDurationMonths: {
    type: Number,
    min: 1
  },
  hasPets: {
    type: Boolean
  },
  petDetails: {
    type: String,
    maxlength: 300
  },
  specialRequirements: {
    type: String,
    maxlength: 500
  },
  responseMessage: { 
    type: String, 
    maxlength: 500 
  },
  respondedAt: { 
    type: Date 
  },
  respondedBy: { 
    type: Schema.Types.ObjectId, 
    ref: "User" 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  dismissedByTenantAt: {
    type: Date,
    default: null
  },
  dismissedByLandlordAt: {
    type: Date,
    default: null
  }
}, { 
  timestamps: true 
});

// Indexes for better query performance
connectionSchema.index({ landlordId: 1, status: 1 });
connectionSchema.index({ tenantId: 1, status: 1 });
connectionSchema.index({ tenantId: 1, dismissedByTenantAt: 1, status: 1 });
connectionSchema.index({ landlordId: 1, dismissedByLandlordAt: 1, status: 1 });
connectionSchema.index({ propertyId: 1, status: 1 });

// Only one active request per tenant/landlord/property; inactive rows kept for History
connectionSchema.index(
  { tenantId: 1, landlordId: 1, propertyId: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

// Virtual for checking if connection allows chat
connectionSchema.virtual('canChat').get(function() {
  return this.status === 'accepted' && this.isActive;
});

export const Connection: Model<IConnection> = mongoose.model<IConnection>("Connection", connectionSchema);































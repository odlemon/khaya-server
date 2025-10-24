// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IRental extends Document {
  agreementId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  landlordId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  
  status: "active" | "suspended" | "ended";
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  depositAmount: number;
  
  // Payment tracking
  nextPaymentDue: Date;
  
  // Quick stats
  stats: {
    totalPaymentsDue: number;
    paidPayments: number;
    overduePayments: number;
    conditionLogsUploaded: number;
    conditionLogsPending: number;
    maintenanceRequests: number;
    serviceBookings: number;
  };
  
  // Move-in confirmation
  moveInConfirmed: boolean;
  moveInConfirmedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
  endedAt?: Date;
}

const rentalSchema = new Schema<IRental>({
  agreementId: { 
    type: Schema.Types.ObjectId, 
    ref: "Agreement", 
    required: true,
    unique: true // One rental per agreement
  },
  propertyId: { 
    type: Schema.Types.ObjectId, 
    ref: "Property", 
    required: true 
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
  
  status: { 
    type: String, 
    enum: ["active", "suspended", "ended"], 
    default: "active" 
  },
  
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  monthlyRent: { type: Number, required: true },
  depositAmount: { type: Number, default: 0 },
  
  nextPaymentDue: { type: Date },
  
  stats: {
    totalPaymentsDue: { type: Number, default: 0 },
    paidPayments: { type: Number, default: 0 },
    overduePayments: { type: Number, default: 0 },
    conditionLogsUploaded: { type: Number, default: 0 },
    conditionLogsPending: { type: Number, default: 5 }, // move-in, month 3, 6, 9, move-out
    maintenanceRequests: { type: Number, default: 0 },
    serviceBookings: { type: Number, default: 0 }
  },
  
  moveInConfirmed: { type: Boolean, default: false },
  moveInConfirmedAt: { type: Date },
  
  endedAt: { type: Date }
}, { 
  timestamps: true 
});

// Indexes
rentalSchema.index({ agreementId: 1 });
rentalSchema.index({ propertyId: 1 });
rentalSchema.index({ landlordId: 1 });
rentalSchema.index({ tenantId: 1 });
rentalSchema.index({ status: 1 });

// Virtual for rental duration
rentalSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return 0;
});

// Virtual for remaining days
rentalSchema.virtual('remainingDays').get(function() {
  if (this.endDate) {
    const now = new Date();
    const diffTime = this.endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }
  return 0;
});

export const Rental: Model<IRental> = mongoose.model<IRental>("Rental", rentalSchema);




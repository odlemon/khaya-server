// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IServiceProvider {
  name: string;
  phoneNumber: string;
  company?: string;
  rating?: number;
}

export interface IServiceBooking extends Document {
  // Basic Info
  rentalId: mongoose.Types.ObjectId;
  agreementId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  landlordId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  
  // Service Details
  serviceType: "aircon_servicing" | "cleaning" | "plumbing" | "electrical" 
                | "handyman" | "gardening" | "pest_control" | "custom";
  customServiceName?: string; // For "custom" type
  
  title: string;
  description: string;
  urgency: "low" | "medium" | "high" | "emergency";
  
  // Media
  photoUrls?: string[];
  videoUrls?: string[];
  
  // Scheduling
  requestedDate: Date;
  scheduledDate?: Date;
  completedDate?: Date;
  
  // Service Provider
  serviceProvider?: IServiceProvider;
  
  // Payment
  estimatedCost?: number;
  finalCost?: number;
  paidBy: "tenant" | "landlord" | "split";
  paymentStatus: "unpaid" | "pending_approval" | "paid" | "refunded";
  
  // Bill/Invoice
  billId?: mongoose.Types.ObjectId;
  invoiceUrl?: string; // PDF invoice
  receiptNumber?: string;
  
  // Status & Tracking
  status: "pending_landlord_approval" | "approved" | "rejected" | "pending_assignment"
          | "scheduled" | "in_progress" | "completed" | "cancelled";
  
  // Who requested and approved
  requestedBy: mongoose.Types.ObjectId;
  requestedByRole: "tenant" | "landlord";
  
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  approvalNotes?: string;
  
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  
  // Landlord-provided vendor (optional)
  landlordProvidedVendor?: {
    name: string;
    phoneNumber: string;
    company?: string;
  };
  
  // Admin assignment
  assignedAdmin?: mongoose.Types.ObjectId;
  assignedVendor?: mongoose.Types.ObjectId;
  
  // Notes & Updates
  landlordNotes?: string;
  tenantNotes?: string;
  adminNotes?: string;
  completionNotes?: string;
  
  // Ratings & Feedback
  rating?: number; // 1-5 stars
  feedback?: string;
  
  // Recurring Service (for aircon, etc.)
  isRecurring: boolean;
  recurringInterval?: number; // In months (e.g., 3 or 6)
  lastServiceDate?: Date;
  nextServiceDue?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const serviceBookingSchema = new Schema<IServiceBooking>({
  // Basic Info
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
  
  // Service Details
  serviceType: { 
    type: String, 
    enum: ["aircon_servicing", "cleaning", "plumbing", "electrical", "handyman", "gardening", "pest_control", "custom"], 
    required: true 
  },
  customServiceName: { type: String },
  
  title: { type: String, required: true },
  description: { type: String, required: true },
  urgency: {
    type: String,
    enum: ["low", "medium", "high", "emergency"],
    default: "medium"
  },
  
  // Media
  photoUrls: [{ type: String }],
  videoUrls: [{ type: String }],
  
  // Scheduling
  requestedDate: { type: Date, required: true },
  scheduledDate: { type: Date },
  completedDate: { type: Date },
  
  // Service Provider
  serviceProvider: {
    name: { type: String },
    phoneNumber: { type: String },
    company: { type: String },
    rating: { type: Number, min: 1, max: 5 }
  },
  
  // Payment
  estimatedCost: { type: Number },
  finalCost: { type: Number },
  paidBy: { 
    type: String, 
    enum: ["tenant", "landlord", "split"], 
    required: true 
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "pending_approval", "paid", "refunded"],
    default: "unpaid"
  },
  
  // Bill/Invoice
  billId: { type: Schema.Types.ObjectId, ref: "Bill" },
  invoiceUrl: { type: String },
  receiptNumber: { type: String },
  
  // Status & Tracking
  status: { 
    type: String, 
    enum: ["pending_landlord_approval", "approved", "rejected", "pending_assignment", "scheduled", "in_progress", "completed", "cancelled"], 
    default: "pending_landlord_approval" 
  },
  
  // Who requested and approved
  requestedBy: { 
    type: Schema.Types.ObjectId, 
    ref: "User",
    required: true
  },
  requestedByRole: {
    type: String,
    enum: ["tenant", "landlord"],
    required: true
  },
  
  approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  approvedAt: { type: Date },
  approvalNotes: { type: String },
  
  rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
  rejectedAt: { type: Date },
  rejectionReason: { type: String },
  
  // Landlord-provided vendor (optional)
  landlordProvidedVendor: {
    name: { type: String },
    phoneNumber: { type: String },
    company: { type: String }
  },
  
  // Admin assignment
  assignedAdmin: { type: Schema.Types.ObjectId, ref: "User" },
  assignedVendor: { type: Schema.Types.ObjectId, ref: "User" },
  
  // Notes & Updates
  landlordNotes: { type: String },
  tenantNotes: { type: String },
  adminNotes: { type: String },
  completionNotes: { type: String },
  
  // Ratings & Feedback
  rating: { type: Number, min: 1, max: 5 },
  feedback: { type: String },
  
  // Recurring Service
  isRecurring: { type: Boolean, default: false },
  recurringInterval: { type: Number }, // In months
  lastServiceDate: { type: Date },
  nextServiceDue: { type: Date }
}, { 
  timestamps: true 
});

// Indexes
serviceBookingSchema.index({ rentalId: 1 });
serviceBookingSchema.index({ tenantId: 1 });
serviceBookingSchema.index({ landlordId: 1 });
serviceBookingSchema.index({ status: 1 });
serviceBookingSchema.index({ scheduledDate: 1 });
serviceBookingSchema.index({ requestedDate: 1 });
serviceBookingSchema.index({ serviceType: 1 });
serviceBookingSchema.index({ paymentStatus: 1 });
serviceBookingSchema.index({ urgency: 1 });

// Auto-calculate next service due date for recurring services
serviceBookingSchema.pre('save', function(next) {
  if (this.isRecurring && this.recurringInterval && this.completedDate) {
    const nextDue = new Date(this.completedDate);
    nextDue.setMonth(nextDue.getMonth() + this.recurringInterval);
    this.nextServiceDue = nextDue;
    this.lastServiceDate = this.completedDate;
  }
  next();
});

export const ServiceBooking: Model<IServiceBooking> = mongoose.model<IServiceBooking>("ServiceBooking", serviceBookingSchema);


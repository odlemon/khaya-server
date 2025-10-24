// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IMaintenanceRequest extends Document {
  rentalId: mongoose.Types.ObjectId;
  agreementId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  landlordId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  
  issueType: "plumbing" | "electrical" | "hvac" | "aircon" | "appliance" | "structural" | "pest_control" | "other";
  urgency: "low" | "medium" | "high" | "emergency";
  
  title: string;
  description: string;
  
  photoUrls: string[];
  videoUrls: string[];
  
  status: "pending" | "approved" | "rejected" | "awaiting_vendor" | "vendor_assigned" | "in_progress" | "completed" | "cancelled";
  
  landlordNotes?: string;
  rejectionReason?: string;
  resolutionNotes?: string;
  
  // Vendor assignment (Khayalami assigns)
  assignedVendor?: {
    vendorId: mongoose.Types.ObjectId;
    vendorName: string;
    phoneNumber: string;
    company: string;
    email?: string;
  };
  
  // ETA tracking
  estimatedArrival?: Date;
  actualArrival?: Date;
  
  // Vendor updates
  vendorUpdates?: [{
    message: string;
    timestamp: Date;
    from: "vendor" | "landlord" | "tenant" | "admin";
    type: "eta_update" | "status_update" | "completion_update";
  }];
  
  // Work completion
  workCompletedAt?: Date;
  invoiceUrl?: string;
  totalCost?: number;
  
  // Timestamps
  approvedAt?: Date;
  rejectedAt?: Date;
  vendorAssignedAt?: Date;
  completedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceRequestSchema = new Schema<IMaintenanceRequest>({
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
  
  issueType: { 
    type: String, 
    enum: ["plumbing", "electrical", "hvac", "aircon", "appliance", "structural", "pest_control", "other"], 
    required: true 
  },
  urgency: { 
    type: String, 
    enum: ["low", "medium", "high", "emergency"], 
    required: true 
  },
  
  title: { type: String, required: true },
  description: { type: String, required: true },
  
  photoUrls: [{ type: String }],
  videoUrls: [{ type: String }],
  
  status: { 
    type: String, 
    enum: ["pending", "approved", "rejected", "awaiting_vendor", "vendor_assigned", "in_progress", "completed", "cancelled"], 
    default: "pending" 
  },
  
  landlordNotes: { type: String },
  rejectionReason: { type: String },
  resolutionNotes: { type: String },
  
  // Vendor assignment
  assignedVendor: {
    vendorId: { type: Schema.Types.ObjectId, ref: "ServiceProvider" },
    vendorName: { type: String },
    phoneNumber: { type: String },
    company: { type: String },
    email: { type: String }
  },
  
  // ETA tracking
  estimatedArrival: { type: Date },
  actualArrival: { type: Date },
  
  // Vendor updates
  vendorUpdates: [{
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    from: { type: String, enum: ["vendor", "landlord", "tenant", "admin"], required: true },
    type: { type: String, enum: ["eta_update", "status_update", "completion_update"], required: true }
  }],
  
  // Work completion
  workCompletedAt: { type: Date },
  invoiceUrl: { type: String },
  totalCost: { type: Number },
  
  // Timestamps
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  vendorAssignedAt: { type: Date },
  completedAt: { type: Date }
}, { 
  timestamps: true 
});

// Indexes
maintenanceRequestSchema.index({ rentalId: 1 });
maintenanceRequestSchema.index({ tenantId: 1 });
maintenanceRequestSchema.index({ landlordId: 1 });
maintenanceRequestSchema.index({ status: 1 });
maintenanceRequestSchema.index({ urgency: 1 });

export const MaintenanceRequest: Model<IMaintenanceRequest> = mongoose.model<IMaintenanceRequest>("MaintenanceRequest", maintenanceRequestSchema);




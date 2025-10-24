// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IServiceProvider extends Document {
  name: string;
  company: string;
  phoneNumber: string;
  email: string;
  
  // Service types they can handle
  serviceTypes: ("plumbing" | "electrical" | "hvac" | "aircon" | "appliance" | "structural" | "pest_control" | "other")[];
  
  // Location and availability
  location: {
    city: string;
    area: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Business details
  businessLicense?: string;
  insuranceNumber?: string;
  rating: number; // 1-5 stars
  totalJobs: number;
  
  // Availability
  isActive: boolean;
  workingHours: {
    start: string; // "08:00"
    end: string;   // "17:00"
    days: string[]; // ["monday", "tuesday", ...]
  };
  
  // Admin management
  createdBy: mongoose.Types.ObjectId; // Admin who added this provider
  isVerified: boolean;
  verificationNotes?: string;
  
  // Stats
  stats: {
    completedJobs: number;
    averageRating: number;
    responseTime: number; // in hours
    onTimeRate: number; // percentage
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const serviceProviderSchema = new Schema<IServiceProvider>({
  name: { type: String, required: true },
  company: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  
  serviceTypes: [{
    type: String,
    enum: ["plumbing", "electrical", "hvac", "aircon", "appliance", "structural", "pest_control", "other"]
  }],
  
  location: {
    city: { type: String, required: true },
    area: { type: String, required: true },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  
  businessLicense: { type: String },
  insuranceNumber: { type: String },
  rating: { type: Number, min: 1, max: 5, default: 3 },
  totalJobs: { type: Number, default: 0 },
  
  isActive: { type: Boolean, default: true },
  workingHours: {
    start: { type: String, default: "08:00" },
    end: { type: String, default: "17:00" },
    days: [{ type: String, enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] }]
  },
  
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  isVerified: { type: Boolean, default: false },
  verificationNotes: { type: String },
  
  stats: {
    completedJobs: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    responseTime: { type: Number, default: 24 }, // hours
    onTimeRate: { type: Number, default: 0 } // percentage
  }
}, {
  timestamps: true
});

// Indexes
serviceProviderSchema.index({ serviceTypes: 1 });
serviceProviderSchema.index({ location: 1 });
serviceProviderSchema.index({ isActive: 1 });
serviceProviderSchema.index({ rating: -1 });

export const ServiceProvider: Model<IServiceProvider> = mongoose.model<IServiceProvider>("ServiceProvider", serviceProviderSchema);




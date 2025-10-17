// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IAgreementTemplate extends Document {
  name: string;
  description: string;
  category: "residential" | "commercial" | "student" | "short_term" | "zero_deposit";
  isDefault: boolean;
  isActive: boolean;
  
  // Template structure
  sections: {
    name: string;
    order: number;
    required: boolean;
    fields: {
      name: string;
      type: "text" | "number" | "date" | "boolean" | "select" | "textarea";
      label: string;
      placeholder?: string;
      required: boolean;
      defaultValue?: any;
      options?: string[]; // For select type
      validation?: {
        min?: number;
        max?: number;
        pattern?: string;
      };
    }[];
  }[];
  
  // Default terms and conditions
  defaultTerms: string[];
  defaultSpecialConditions: string[];
  
  // Default payment schedule
  defaultPaymentSchedule: {
    frequency: "monthly" | "weekly" | "bi-weekly";
    dueDay: number;
    lateFee: number;
    gracePeriod: number;
  };
  
  // Default utilities and services
  defaultUtilitiesIncluded: boolean;
  defaultUtilitiesList: string[];
  defaultMaintenanceIncluded: boolean;
  
  // Default protection plan
  defaultKhayalamiProtection: {
    enabled: boolean;
    planType: "basic" | "premium";
    monthlyFee: number;
    coverage: string[];
  };
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  version: string;
  tags: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const agreementTemplateSchema = new Schema<IAgreementTemplate>({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ["residential", "commercial", "student", "short_term", "zero_deposit"], 
    required: true 
  },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  
  // Template structure
  sections: [{
    name: { type: String, required: true },
    order: { type: Number, required: true },
    required: { type: Boolean, default: true },
    fields: [{
      name: { type: String, required: true },
      type: { 
        type: String, 
        enum: ["text", "number", "date", "boolean", "select", "textarea"], 
        required: true 
      },
      label: { type: String, required: true },
      placeholder: { type: String },
      required: { type: Boolean, default: false },
      defaultValue: { type: Schema.Types.Mixed },
      options: [{ type: String }],
      validation: {
        min: { type: Number },
        max: { type: Number },
        pattern: { type: String }
      }
    }]
  }],
  
  // Default terms and conditions
  defaultTerms: [{ type: String }],
  defaultSpecialConditions: [{ type: String }],
  
  // Default payment schedule
  defaultPaymentSchedule: {
    frequency: { type: String, enum: ["monthly", "weekly", "bi-weekly"], default: "monthly" },
    dueDay: { type: Number, default: 1 },
    lateFee: { type: Number, default: 0 },
    gracePeriod: { type: Number, default: 5 }
  },
  
  // Default utilities and services
  defaultUtilitiesIncluded: { type: Boolean, default: false },
  defaultUtilitiesList: [{ type: String }],
  defaultMaintenanceIncluded: { type: Boolean, default: false },
  
  // Default protection plan
  defaultKhayalamiProtection: {
    enabled: { type: Boolean, default: false },
    planType: { type: String, enum: ["basic", "premium"], default: "basic" },
    monthlyFee: { type: Number, default: 0 },
    coverage: [{ type: String }]
  },
  
  // Metadata
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  version: { type: String, default: "1.0.0" },
  tags: [{ type: String }]
}, { 
  timestamps: true 
});

// Indexes
agreementTemplateSchema.index({ category: 1, isActive: 1 });
agreementTemplateSchema.index({ isDefault: 1 });
agreementTemplateSchema.index({ tags: 1 });

export const AgreementTemplate: Model<IAgreementTemplate> = mongoose.model<IAgreementTemplate>("AgreementTemplate", agreementTemplateSchema); 
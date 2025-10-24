// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IConditionLog extends Document {
  rentalId: mongoose.Types.ObjectId;
  agreementId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  
  logType: "move-in" | "month-1" | "month-2" | "month-3" | "month-4" | "month-5" | "month-6" | "month-7" | "month-8" | "month-9" | "month-10" | "month-11" | "month-12" | "move-out" | "other";
  customLabel?: string; // For "other" type
  
  videoUrl: string; // Single video (required)
  photoUrls: string[]; // Up to 3 photos
  notes?: string;
  
  uploadedBy: "tenant" | "landlord";
  uploadedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const conditionLogSchema = new Schema<IConditionLog>({
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
  tenantId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  
  logType: { 
    type: String, 
    enum: ["move-in", "month-1", "month-2", "month-3", "month-4", "month-5", "month-6", "month-7", "month-8", "month-9", "month-10", "month-11", "month-12", "move-out", "other"], 
    required: true 
  },
  customLabel: { type: String },
  
  videoUrl: { type: String, required: true },
  photoUrls: { 
    type: [{ type: String }],
    validate: {
      validator: function(v: string[]) {
        return v.length <= 3;
      },
      message: 'Maximum 3 photos allowed'
    }
  },
  notes: { type: String },
  
  uploadedBy: { 
    type: String, 
    enum: ["tenant", "landlord"],
    required: true
  },
  uploadedAt: { type: Date, default: Date.now }
}, { 
  timestamps: true 
});

// Indexes
conditionLogSchema.index({ rentalId: 1 });
conditionLogSchema.index({ agreementId: 1 });
conditionLogSchema.index({ tenantId: 1 });
conditionLogSchema.index({ logType: 1 });
conditionLogSchema.index({ createdAt: -1 });

export const ConditionLog: Model<IConditionLog> = mongoose.model<IConditionLog>("ConditionLog", conditionLogSchema);


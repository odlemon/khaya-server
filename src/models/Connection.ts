// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IConnection extends Document {
  tenantId: mongoose.Types.ObjectId;
  landlordId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  message: string;
  responseMessage?: string;
  respondedAt?: Date;
  respondedBy?: mongoose.Types.ObjectId;
  isActive: boolean;
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
    enum: ["pending", "accepted", "rejected"], 
    default: "pending" 
  },
  message: { 
    type: String, 
    required: true, 
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
  }
}, { 
  timestamps: true 
});

// Indexes for better query performance
connectionSchema.index({ tenantId: 1, landlordId: 1, propertyId: 1 });
connectionSchema.index({ landlordId: 1, status: 1 });
connectionSchema.index({ tenantId: 1, status: 1 });
connectionSchema.index({ propertyId: 1, status: 1 });

// Compound index to ensure unique connections
connectionSchema.index(
  { tenantId: 1, landlordId: 1, propertyId: 1 }, 
  { unique: true }
);

// Virtual for checking if connection allows chat
connectionSchema.virtual('canChat').get(function() {
  return this.status === 'accepted' && this.isActive;
});

export const Connection: Model<IConnection> = mongoose.model<IConnection>("Connection", connectionSchema);

















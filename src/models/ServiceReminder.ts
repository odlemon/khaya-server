// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IServiceReminder extends Document {
  rentalId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  landlordId: mongoose.Types.ObjectId;
  
  serviceType: string;
  message: string;
  dueDate: Date;
  
  status: "pending" | "sent" | "dismissed" | "booked";
  sentAt?: Date;
  
  // Link to booked service (if reminder was acted upon)
  bookedServiceId?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const serviceReminderSchema = new Schema<IServiceReminder>({
  rentalId: { 
    type: Schema.Types.ObjectId, 
    ref: "Rental", 
    required: true 
  },
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
  
  serviceType: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  dueDate: { 
    type: Date, 
    required: true 
  },
  
  status: { 
    type: String, 
    enum: ["pending", "sent", "dismissed", "booked"], 
    default: "pending" 
  },
  sentAt: { type: Date },
  
  bookedServiceId: { 
    type: Schema.Types.ObjectId, 
    ref: "ServiceBooking" 
  }
}, { 
  timestamps: true 
});

// Indexes
serviceReminderSchema.index({ rentalId: 1 });
serviceReminderSchema.index({ tenantId: 1 });
serviceReminderSchema.index({ status: 1 });
serviceReminderSchema.index({ dueDate: 1 });

export const ServiceReminder: Model<IServiceReminder> = mongoose.model<IServiceReminder>("ServiceReminder", serviceReminderSchema);




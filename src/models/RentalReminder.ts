// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IRentalReminder extends Document {
  rentalId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  paymentId: mongoose.Types.ObjectId;
  invoiceId?: mongoose.Types.ObjectId; // Link to invoice (created on first reminder)
  reminderType: "7_days" | "3_days" | "1_day";
  dueDate: Date;
  sentAt: Date;
  status: "pending" | "sent" | "dismissed";
  createdAt: Date;
  updatedAt: Date;
}

const rentalReminderSchema = new Schema<IRentalReminder>(
  {
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
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      required: true
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      default: null
    },
    reminderType: {
      type: String,
      enum: ["7_days", "3_days", "1_day"],
      required: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    sentAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "sent", "dismissed"],
      default: "sent"
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
rentalReminderSchema.index({ rentalId: 1 });
rentalReminderSchema.index({ paymentId: 1 });
rentalReminderSchema.index({ tenantId: 1 });
rentalReminderSchema.index({ dueDate: 1 });
rentalReminderSchema.index({ status: 1 });
// Compound index to prevent duplicate reminders
rentalReminderSchema.index({ paymentId: 1, reminderType: 1 }, { unique: true });

export const RentalReminder: Model<IRentalReminder> = mongoose.model<IRentalReminder>(
  "RentalReminder",
  rentalReminderSchema
);





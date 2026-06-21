// @ts-nocheck
import mongoose, { Document, Schema } from "mongoose";

export type NotificationType =
  | "new_message"
  | "viewing_request"
  | "move_in_request"
  | "viewing_response"
  | "move_in_response"
  | "chat"
  | "system"
  | "connection_request"
  | "connection_accepted"
  | "connection_rejected"
  | "connection_cancelled"
  | "property_submitted"
  | "property_verified"
  | "property_rejected"
  | "agreement_created"
  | "agreement_signed"
  | "agreement_completed"
  | "payment_received"
  | "maintenance_request"
  | "maintenance_update";

export interface INotificationData {
  chatId?: string;
  messageId?: string;
  propertyId?: string;
  senderId?: string;
  isPrivate?: boolean;
  suppressBanner?: boolean;
  [key: string]: unknown;
}

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  data: INotificationData;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "new_message",
        "viewing_request",
        "move_in_request",
        "viewing_response",
        "move_in_response",
        "chat",
        "system",
        "connection_request",
        "connection_accepted",
        "connection_rejected",
        "connection_cancelled",
        "property_submitted",
        "property_verified",
        "property_rejected",
        "agreement_created",
        "agreement_signed",
        "agreement_completed",
        "payment_received",
        "maintenance_request",
        "maintenance_update",
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    data: { type: Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);

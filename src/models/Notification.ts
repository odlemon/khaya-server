// @ts-nocheck
import mongoose, { Document, Schema } from "mongoose";
import { NotificationGroup, resolveNotificationGroup } from "../utils/notificationGroup";

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
  | "maintenance_update"
  | "document_verification_submitted"
  | "document_verification_approved"
  | "document_verification_rejected";

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
  group: NotificationGroup;
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
        "document_verification_submitted",
        "document_verification_approved",
        "document_verification_rejected",
      ],
      required: true,
    },
    group: {
      type: String,
      enum: ["messages", "actions"],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    data: { type: Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.pre("validate", function (next) {
  if (!this.group && this.type) {
    this.group = resolveNotificationGroup(this.type);
  }
  next();
});

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, group: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);

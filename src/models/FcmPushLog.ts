// @ts-nocheck
import mongoose, { Document, Schema } from "mongoose";

export interface IFcmPushLog extends Document {
  messageId: mongoose.Types.ObjectId;
  recipientUserId: mongoose.Types.ObjectId;
  token: string;
  sentAt: Date;
}

const fcmPushLogSchema = new Schema<IFcmPushLog>({
  messageId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  recipientUserId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  token: {
    type: String,
    required: true,
  },
  sentAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

fcmPushLogSchema.index(
  { messageId: 1, recipientUserId: 1, token: 1 },
  { unique: true }
);
fcmPushLogSchema.index({ sentAt: 1 }, { expireAfterSeconds: 86400 });

export const FcmPushLog = mongoose.model<IFcmPushLog>("FcmPushLog", fcmPushLogSchema);

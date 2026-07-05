// @ts-nocheck
import mongoose, { Document, Schema } from "mongoose";

export interface IDeviceToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  platform: "android" | "ios";
  createdAt: Date;
  updatedAt: Date;
}

const deviceTokenSchema = new Schema<IDeviceToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ["android", "ios"],
      required: true,
      default: "android",
    },
  },
  { timestamps: true }
);

deviceTokenSchema.index({ userId: 1, token: 1 }, { unique: true });
deviceTokenSchema.index({ userId: 1, platform: 1 });

export const DeviceToken = mongoose.model<IDeviceToken>("DeviceToken", deviceTokenSchema);

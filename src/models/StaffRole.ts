// @ts-nocheck
import mongoose, { Document, Schema } from "mongoose";
import type { PortalType } from "../config/portalPermissions";

export interface IStaffRole extends Document {
  name: string;
  slug: string;
  portal: PortalType;
  permissions: string[];
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const staffRoleSchema = new Schema<IStaffRole>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    portal: {
      type: String,
      enum: ["khayalami", "bank", "insurance"],
      required: true,
    },
    permissions: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

staffRoleSchema.index({ portal: 1, slug: 1 }, { unique: true });
staffRoleSchema.index({ portal: 1, isActive: 1 });

export const StaffRole = mongoose.model<IStaffRole>("StaffRole", staffRoleSchema);

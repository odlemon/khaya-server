import mongoose, { Document, Schema } from "mongoose";

export interface ITwoFactorAuth extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  pin: string;
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
  createdAt: Date;
  verifiedAt?: Date;
}

const twoFactorAuthSchema = new Schema<ITwoFactorAuth>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    lowercase: true,
    trim: true 
  },
  pin: { 
    type: String, 
    required: true,
    length: 6
  },
  expiresAt: { 
    type: Date, 
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  },
  isUsed: { 
    type: Boolean, 
    default: false 
  },
  attempts: { 
    type: Number, 
    default: 0,
    max: 3
  },
  verifiedAt: { 
    type: Date 
  }
}, { 
  timestamps: true 
});

// Indexes
twoFactorAuthSchema.index({ userId: 1 });
twoFactorAuthSchema.index({ email: 1 });
twoFactorAuthSchema.index({ pin: 1 });
twoFactorAuthSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export const TwoFactorAuth = mongoose.model<ITwoFactorAuth>("TwoFactorAuth", twoFactorAuthSchema);

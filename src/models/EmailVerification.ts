import mongoose, { Document, Schema } from "mongoose";

export interface IEmailVerification extends Document {
  email: string;
  pin: string;
  role: "tenant" | "landlord" | "admin";
  firstName: string;
  lastName: string;
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
  createdAt: Date;
  verifiedAt?: Date;
}

const emailVerificationSchema = new Schema<IEmailVerification>({
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
  role: { 
    type: String, 
    enum: ["tenant", "landlord", "admin"], 
    required: true 
  },
  firstName: { 
    type: String, 
    required: true 
  },
  lastName: { 
    type: String, 
    required: true 
  },
  expiresAt: { 
    type: Date, 
    required: true,
    default: () => new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
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
emailVerificationSchema.index({ email: 1 });
emailVerificationSchema.index({ pin: 1 });
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Prevent multiple active verifications for same email
emailVerificationSchema.index({ email: 1, isUsed: 1 });

export const EmailVerification = mongoose.model<IEmailVerification>("EmailVerification", emailVerificationSchema);

// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";
import crypto from "crypto";

export interface ISignature extends Document {
  agreementId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userRole: "landlord" | "tenant";
  
  // Signature data
  signatureData: string; // Base64 encoded signature image
  signatureHash: string; // SHA-256 hash for integrity verification
  signatureType: "drawing" | "typed" | "uploaded";
  
  // Security and audit
  ipAddress: string;
  userAgent: string;
  deviceInfo: {
    type: string;
    os: string;
    browser: string;
  };
  
  // Timestamp and verification
  signedAt: Date;
  verifiedAt?: Date;
  verificationMethod: "email" | "sms" | "2fa" | "none";
  
  // Legal compliance
  consentGiven: boolean;
  termsAccepted: boolean;
  privacyPolicyAccepted: boolean;
  
  // Metadata
  sessionId: string;
  isActive: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const signatureSchema = new Schema<ISignature>({
  agreementId: { type: Schema.Types.ObjectId, ref: "Agreement", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  userRole: { 
    type: String, 
    enum: ["landlord", "tenant"], 
    required: true 
  },
  
  // Signature data (support URL-based storage)
  signatureData: { type: String }, // legacy base64
  signatureUrl: { type: String },  // Firebase download URL
  signatureHash: { type: String },
  signatureType: { 
    type: String, 
    enum: ["drawing", "typed", "uploaded"], 
    default: "drawing" 
  },
  // Optional metadata for URL-based signatures
  storagePath: { type: String },
  contentType: { type: String },
  sizeBytes: { type: Number },
  width: { type: Number },
  height: { type: Number },
  
  // Security and audit
  ipAddress: { type: String, required: true },
  userAgent: { type: String, required: true },
  deviceInfo: {
    type: { type: String },
    os: { type: String },
    browser: { type: String }
  },
  
  // Timestamp and verification
  signedAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date },
  verificationMethod: { 
    type: String, 
    enum: ["email", "sms", "2fa", "none"], 
    default: "none" 
  },
  
  // Legal compliance
  consentGiven: { type: Boolean, default: true },
  termsAccepted: { type: Boolean, default: true },
  privacyPolicyAccepted: { type: Boolean, default: true },
  
  // Metadata
  sessionId: { type: String },
  isActive: { type: Boolean, default: true }
}, { 
  timestamps: true 
});

// Indexes
signatureSchema.index({ agreementId: 1, userId: 1 });
signatureSchema.index({ signatureHash: 1 });
signatureSchema.index({ signedAt: 1 });

// Pre-save middleware to generate signature hash if not provided (legacy base64 only)
signatureSchema.pre('save', function(next) {
  if (!this.signatureHash && this.signatureData) {
    this.signatureHash = crypto
      .createHash('sha256')
      .update(this.signatureData)
      .digest('hex');
  }
  next();
});

// Method to verify signature integrity
signatureSchema.methods.verifyIntegrity = function(): boolean {
  const expectedHash = crypto
    .createHash('sha256')
    .update(this.signatureData + this.signedAt.toISOString())
    .digest('hex');
  
  return this.signatureHash === expectedHash;
};

// Method to get signature metadata
signatureSchema.methods.getMetadata = function() {
  return {
    id: this._id,
    agreementId: this.agreementId,
    userId: this.userId,
    userRole: this.userRole,
    signedAt: this.signedAt,
    verifiedAt: this.verifiedAt,
    verificationMethod: this.verificationMethod,
    deviceInfo: this.deviceInfo,
    isActive: this.isActive
  };
};

export const Signature: Model<ISignature> = mongoose.model<ISignature>("Signature", signatureSchema); 
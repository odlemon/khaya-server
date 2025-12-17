// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role: "admin" | "landlord" | "tenant";
  isVerified: boolean;
  isActive: boolean;
  twoFactorEnabled: boolean;
  documentVerification: {
    status: "unverified" | "pending" | "verified" | "rejected";
    documents: {
      // Common documents
      idDocument?: {
        url: string;
        selfieUrl?: string; // Selfie image to compare with ID photo
        selfieWithIdUrl?: string; // Selfie image holding the ID document
        type: "passport" | "national_id" | "drivers_license";
        uploadedAt: Date;
        verified: boolean;
      };
      // Tenant documents
      payslips?: {
        urls: string[];
        uploadedAt: Date;
        verified: boolean;
      };
      utilityBills?: {
        urls: string[];
        uploadedAt: Date;
        verified: boolean;
      };
      bankStatements?: {
        urls: string[];
        uploadedAt: Date;
        verified: boolean;
      };
      employmentLetter?: {
        url: string;
        uploadedAt: Date;
        verified: boolean;
      };
      // Landlord documents
      propertyProof?: {
        urls: string[];
        uploadedAt: Date;
        verified: boolean;
      };
      propertyDocuments?: {
        urls: string[];
        uploadedAt: Date;
        verified: boolean;
      };
    };
    adminFeedback?: string;
    verifiedAt?: Date;
    verifiedBy?: mongoose.Types.ObjectId;
    rejectedAt?: Date;
    rejectedBy?: mongoose.Types.ObjectId;
    rejectionReason?: string;
  };
  profile?: {
    avatar?: string;
    bio?: string;
    location?: string;
    dateOfBirth?: Date;
    idNumber?: string;
    idType?: "passport" | "national_id" | "drivers_license";
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  // Landlord-specific fields
  bankAccount?: string;
  bankName?: string;
  preferences?: {
    theme?: string;
    language?: string;
    notifications?: { 
      email?: boolean; 
      sms?: boolean;
      push?: boolean;
      rentReminders?: boolean;
      maintenanceUpdates?: boolean;
      agreementAlerts?: boolean;
    };
    autoReloadReminder?: {
      enabled: boolean;
      time: string; // HH:MM format
      date: number; // Day of month
    };
  };
  settings?: {
    zeroDepositMode?: boolean;
    maintenanceApproval?: boolean; // For landlords
    runnerMode?: boolean; // Let Khayalami agents manage viewings
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  googleId?: string;
  registrationMethod?: "google" | "email";
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ["admin", "landlord", "tenant"], default: "tenant" },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    twoFactorEnabled: { type: Boolean, default: false },
    documentVerification: {
      status: { 
        type: String, 
        enum: ["unverified", "pending", "verified", "rejected"], 
        default: "unverified" 
      },
      documents: {
        // Common documents
        idDocument: {
          url: { type: String },
          selfieUrl: { type: String }, // Selfie image to compare with ID photo
          selfieWithIdUrl: { type: String }, // Selfie image holding the ID document
          type: { type: String, enum: ["passport", "national_id", "drivers_license"] },
          uploadedAt: { type: Date },
          verified: { type: Boolean, default: false }
        },
        // Tenant documents
        payslips: {
          urls: [{ type: String }],
          uploadedAt: { type: Date },
          verified: { type: Boolean, default: false }
        },
        utilityBills: {
          urls: [{ type: String }],
          uploadedAt: { type: Date },
          verified: { type: Boolean, default: false }
        },
        bankStatements: {
          urls: [{ type: String }],
          uploadedAt: { type: Date },
          verified: { type: Boolean, default: false }
        },
        employmentLetter: {
          url: { type: String },
          uploadedAt: { type: Date },
          verified: { type: Boolean, default: false }
        },
        // Landlord documents
        propertyProof: {
          urls: [{ type: String }],
          uploadedAt: { type: Date },
          verified: { type: Boolean, default: false }
        },
        propertyDocuments: {
          urls: [{ type: String }],
          uploadedAt: { type: Date },
          verified: { type: Boolean, default: false }
        }
      },
      adminFeedback: { type: String },
      verifiedAt: { type: Date },
      verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
      rejectedAt: { type: Date },
      rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
      rejectionReason: { type: String }
    },
    profile: {
      avatar: { type: String },
      bio: { type: String, maxlength: 500 },
      location: { type: String },
      dateOfBirth: { type: Date },
      idNumber: { type: String },
      idType: { type: String, enum: ["passport", "national_id", "drivers_license"] },
      address: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        postalCode: { type: String },
        country: { type: String }
      }
    },
    bankAccount: { type: String },
    bankName: { type: String },
    preferences: {
      type: Schema.Types.Mixed,
      default: {
        theme: "light",
        language: "en",
        notifications: { 
          email: true, 
          sms: false,
          push: true,
          rentReminders: true,
          maintenanceUpdates: true,
          agreementAlerts: true
        },
        autoReloadReminder: {
          enabled: false,
          time: "09:00",
          date: 1
        }
      }
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {
        zeroDepositMode: false,
        maintenanceApproval: true,
        runnerMode: false
      }
    },
    googleId: { type: String, default: null },
    registrationMethod: { type: String, enum: ["google", "email"], default: "email" },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as any);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

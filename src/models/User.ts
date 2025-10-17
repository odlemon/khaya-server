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
  profile?: {
    avatar?: string;
    bio?: string;
    location?: string;
    dateOfBirth?: Date;
    idNumber?: string;
    idType?: "passport" | "national_id" | "drivers_license";
  };
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
    profile: {
      avatar: { type: String },
      bio: { type: String, maxlength: 500 },
      location: { type: String },
      dateOfBirth: { type: Date },
      idNumber: { type: String },
      idType: { type: String, enum: ["passport", "national_id", "drivers_license"] }
    },
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

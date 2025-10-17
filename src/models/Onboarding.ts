// @ts-nocheck
import mongoose, { Document, Schema, Model } from "mongoose";

// Base onboarding interface
export interface IOnboarding extends Document {
  userId: mongoose.Types.ObjectId;
  userType: "landlord" | "tenant";
  isCompleted: boolean;
  currentStep: number;
  totalSteps: number;
  createdAt: Date;
  updatedAt: Date;
}

// Landlord onboarding interface
export interface ILandlordOnboarding extends IOnboarding {
  userType: "landlord";
  steps: {
    profileSetup: {
      completed: boolean;
      data: {
        businessName?: string;
        businessType?: string;
        businessLicense?: string;
        taxId?: string;
        yearsInBusiness?: number;
        portfolioSize?: number;
      };
    };
    propertyDetails: {
      completed: boolean;
      data: {
        propertyTypes: string[];
        totalProperties: number;
        averageRent: number;
        preferredAreas: string[];
        propertyManagement: boolean;
      };
    };
    verification: {
      completed: boolean;
      data: {
        idDocument?: string;
        proofOfOwnership?: string[];
        bankStatement?: string;
        references?: string[];
        backgroundCheck?: boolean;
      };
    };
    preferences: {
      completed: boolean;
      data: {
        preferredTenants: string[];
        minimumRent: number;
        leaseTerms: string[];
        maintenanceServices: boolean;
        khayalamiAgent: boolean;
        zeroDeposit: boolean;
      };
    };
    paymentSetup: {
      completed: boolean;
      data: {
        bankAccount?: string;
        paymentMethod?: string;
        autoPayments: boolean;
        preferredCurrency: string;
      };
    };
  };
}

// Tenant onboarding interface
export interface ITenantOnboarding extends IOnboarding {
  userType: "tenant";
  steps: {
    profileSetup: {
      completed: boolean;
      data: {
        employmentStatus: string;
        employer?: string;
        monthlyIncome: number;
        employmentDuration: number;
        references: string[];
      };
    };
    rentalHistory: {
      completed: boolean;
      data: {
        previousLandlords: string[];
        rentalHistory: number;
        evictionHistory: boolean;
        paymentHistory: string;
        references: string[];
      };
    };
    preferences: {
      completed: boolean;
      data: {
        preferredAreas: string[];
        budget: {
          min: number;
          max: number;
        };
        propertyTypes: string[];
        bedrooms: number;
        moveInDate: Date;
        leaseDuration: number;
        petFriendly: boolean;
        parkingRequired: boolean;
      };
    };
    verification: {
      completed: boolean;
      data: {
        idDocument?: string;
        payslips?: string[];
        bankStatement?: string;
        creditCheck?: boolean;
        backgroundCheck?: boolean;
      };
    };
    documents: {
      completed: boolean;
      data: {
        proofOfIncome?: string[];
        employmentLetter?: string;
        bankStatements?: string[];
        references?: string[];
      };
    };
    servicePreferences: {
      completed: boolean;
      data: {
        zeroDeposit: boolean;
        utilitiesIncluded: boolean;
        maintenanceServices: boolean;
        notificationPreferences: {
          email: boolean;
          sms: boolean;
          push: boolean;
        };
      };
    };
  };
}

// Landlord onboarding schema
const landlordOnboardingSchema = new Schema<ILandlordOnboarding>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  userType: { type: String, enum: ["landlord"], default: "landlord" },
  isCompleted: { type: Boolean, default: false },
  currentStep: { type: Number, default: 1 },
  totalSteps: { type: Number, default: 5 },
  steps: {
    profileSetup: {
      completed: { type: Boolean, default: false },
      data: {
        businessName: { type: String },
        businessType: { type: String },
        businessLicense: { type: String },
        taxId: { type: String },
        yearsInBusiness: { type: Number },
        portfolioSize: { type: Number }
      }
    },
    propertyDetails: {
      completed: { type: Boolean, default: false },
      data: {
        propertyTypes: [{ type: String }],
        totalProperties: { type: Number },
        averageRent: { type: Number },
        preferredAreas: [{ type: String }],
        propertyManagement: { type: Boolean }
      }
    },
    verification: {
      completed: { type: Boolean, default: false },
      data: {
        idDocument: { type: String },
        proofOfOwnership: [{ type: String }],
        bankStatement: { type: String },
        references: [{ type: String }],
        backgroundCheck: { type: Boolean }
      }
    },
    preferences: {
      completed: { type: Boolean, default: false },
      data: {
        preferredTenants: [{ type: String }],
        minimumRent: { type: Number },
        leaseTerms: [{ type: String }],
        maintenanceServices: { type: Boolean },
        khayalamiAgent: { type: Boolean },
        zeroDeposit: { type: Boolean }
      }
    },
    paymentSetup: {
      completed: { type: Boolean, default: false },
      data: {
        bankAccount: { type: String },
        paymentMethod: { type: String },
        autoPayments: { type: Boolean },
        preferredCurrency: { type: String, default: "ZAR" }
      }
    }
  }
}, { timestamps: true });

// Tenant onboarding schema
const tenantOnboardingSchema = new Schema<ITenantOnboarding>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  userType: { type: String, enum: ["tenant"], default: "tenant" },
  isCompleted: { type: Boolean, default: false },
  currentStep: { type: Number, default: 1 },
  totalSteps: { type: Number, default: 6 },
  steps: {
    profileSetup: {
      completed: { type: Boolean, default: false },
      data: {
        employmentStatus: { type: String },
        employer: { type: String },
        monthlyIncome: { type: Number },
        employmentDuration: { type: Number },
        references: [{ type: String }]
      }
    },
    rentalHistory: {
      completed: { type: Boolean, default: false },
      data: {
        previousLandlords: [{ type: String }],
        rentalHistory: { type: Number },
        evictionHistory: { type: Boolean, default: false },
        paymentHistory: { type: String },
        references: [{ type: String }]
      }
    },
    preferences: {
      completed: { type: Boolean, default: false },
      data: {
        preferredAreas: [{ type: String }],
        budget: {
          min: { type: Number },
          max: { type: Number }
        },
        propertyTypes: [{ type: String }],
        bedrooms: { type: Number },
        moveInDate: { type: Date },
        leaseDuration: { type: Number },
        petFriendly: { type: Boolean },
        parkingRequired: { type: Boolean }
      }
    },
    verification: {
      completed: { type: Boolean, default: false },
      data: {
        idDocument: { type: String },
        payslips: [{ type: String }],
        bankStatement: { type: String },
        creditCheck: { type: Boolean },
        backgroundCheck: { type: Boolean }
      }
    },
    documents: {
      completed: { type: Boolean, default: false },
      data: {
        proofOfIncome: [{ type: String }],
        employmentLetter: { type: String },
        bankStatements: [{ type: String }],
        references: [{ type: String }]
      }
    },
    servicePreferences: {
      completed: { type: Boolean, default: false },
      data: {
        zeroDeposit: { type: Boolean },
        utilitiesIncluded: { type: Boolean },
        maintenanceServices: { type: Boolean },
        notificationPreferences: {
          email: { type: Boolean, default: true },
          sms: { type: Boolean, default: true },
          push: { type: Boolean, default: true }
        }
      }
    }
  }
}, { timestamps: true });

// Indexes
landlordOnboardingSchema.index({ userId: 1 });
tenantOnboardingSchema.index({ userId: 1 });

// Export models
export const LandlordOnboarding: Model<ILandlordOnboarding> = mongoose.model<ILandlordOnboarding>("LandlordOnboarding", landlordOnboardingSchema);
export const TenantOnboarding: Model<ITenantOnboarding> = mongoose.model<ITenantOnboarding>("TenantOnboarding", tenantOnboardingSchema); 
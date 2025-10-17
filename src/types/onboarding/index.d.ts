// @ts-nocheck

// Base onboarding types
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  required: boolean;
  fields: OnboardingField[];
}

export interface OnboardingField {
  name: string;
  type: "text" | "number" | "select" | "multiselect" | "boolean" | "date" | "file" | "files";
  label: string;
  required: boolean;
  options?: string[];
}

export interface OnboardingRequirements {
  userType: "landlord" | "tenant";
  totalSteps: number;
  steps: OnboardingStep[];
}

export interface OnboardingStatus {
  isCompleted: boolean;
  currentStep: number;
  totalSteps: number;
  userType: "landlord" | "tenant";
  steps: Record<string, OnboardingStepData>;
}

export interface OnboardingStepData {
  completed: boolean;
  data: Record<string, any>;
}

export interface OnboardingProgress {
  progress: number;
  completedSteps: number;
  totalSteps: number;
  currentStep: number;
  isCompleted: boolean;
  userType: "landlord" | "tenant";
}

// Landlord onboarding specific types
export interface LandlordOnboardingData {
  profileSetup: {
    businessName?: string;
    businessType?: string;
    businessLicense?: string;
    taxId?: string;
    yearsInBusiness?: number;
    portfolioSize?: number;
  };
  propertyDetails: {
    propertyTypes: string[];
    totalProperties: number;
    averageRent: number;
    preferredAreas: string[];
    propertyManagement: boolean;
  };
  verification: {
    idDocument?: string;
    proofOfOwnership?: string[];
    bankStatement?: string;
    references?: string[];
    backgroundCheck?: boolean;
  };
  preferences: {
    preferredTenants: string[];
    minimumRent: number;
    leaseTerms: string[];
    maintenanceServices: boolean;
    khayalamiAgent: boolean;
    zeroDeposit: boolean;
  };
  paymentSetup: {
    bankAccount?: string;
    paymentMethod?: string;
    autoPayments: boolean;
    preferredCurrency: string;
  };
}

// Tenant onboarding specific types
export interface TenantOnboardingData {
  profileSetup: {
    employmentStatus: string;
    employer?: string;
    monthlyIncome: number;
    employmentDuration: number;
    references: string[];
  };
  rentalHistory: {
    previousLandlords: string[];
    rentalHistory: number;
    evictionHistory: boolean;
    paymentHistory: string;
    references: string[];
  };
  preferences: {
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
  verification: {
    idDocument?: string;
    payslips?: string[];
    bankStatement?: string;
    creditCheck?: boolean;
    backgroundCheck?: boolean;
  };
  documents: {
    proofOfIncome?: string[];
    employmentLetter?: string;
    bankStatements?: string[];
    references?: string[];
  };
  preferences: {
    zeroDeposit: boolean;
    utilitiesIncluded: boolean;
    maintenanceServices: boolean;
    notificationPreferences: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
}

// API Request/Response types
export interface UpdateOnboardingRequest {
  step: string;
  data: Record<string, any>;
}

export interface SkipOnboardingRequest {
  step: string;
}

// Registration with role selection
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "tenant" | "landlord"; // Required during registration
  phone?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  token: string;
  data: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: "tenant" | "landlord";
    phone?: string;
    isVerified: boolean;
    requiresOnboarding: boolean;
  };
} 
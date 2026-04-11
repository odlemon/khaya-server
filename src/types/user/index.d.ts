// @ts-nocheck
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: UserRole
  isVerified: boolean
  isActive: boolean
  profile?: {
    avatar?: string
    bio?: string
    location?: string
    dateOfBirth?: Date
    idNumber?: string
    idType?: "passport" | "national_id" | "drivers_license"
  }
  preferences?: {
    theme?: string
    language?: string
    notifications?: { 
      email?: boolean; 
      sms?: boolean;
      push?: boolean;
      rentReminders?: boolean;
      maintenanceUpdates?: boolean;
      agreementAlerts?: boolean;
    }
    autoReloadReminder?: {
      enabled: boolean
      time: string
      date: number
    }
  }
  settings?: {
    zeroDepositMode?: boolean
    maintenanceApproval?: boolean
    runnerMode?: boolean
    emergencyContact?: {
      name: string
      phone: string
      relationship: string
    }
  }
  createdAt: Date
  updatedAt: Date
}

export enum UserRole {
  ADMIN = "admin",
  INSURANCE_ADMIN = "insurance_admin",
  BANK_ADMIN = "bank_admin",
  LANDLORD = "landlord",
  TENANT = "tenant",
} 
// @ts-nocheck

// Agreement Status Types
export type AgreementStatus = "draft" | "pending" | "signed" | "active" | "expired" | "terminated";
export type AgreementType = "tenancy" | "maintenance" | "service";
export type PaymentFrequency = "monthly" | "weekly" | "bi-weekly";
export type ProtectionPlanType = "basic" | "premium";

// Signature Interface
export interface AgreementSignature {
  signedAt: Date;
  signatureData: string;
  ipAddress: string;
}

// Payment Schedule Interface
export interface PaymentSchedule {
  frequency: PaymentFrequency;
  dueDay: number;
  lateFee: number;
  gracePeriod: number;
}

// Attachment Interface
export interface AgreementAttachment {
  name: string;
  url: string;
  type: string;
  uploadedAt: Date;
}

// Notifications Interface
export interface AgreementNotifications {
  rentReminder: boolean;
  maintenanceUpdates: boolean;
  agreementAlerts: boolean;
}

// Khayalami Protection Plan Interface
export interface KhayalamiProtection {
  enabled: boolean;
  planType: ProtectionPlanType;
  monthlyFee: number;
  coverage: string[];
}

// Main Agreement Interface
export interface Agreement {
  _id: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;
  status: AgreementStatus;
  type: AgreementType;
  
  // Agreement Details
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  rentAmount: number;
  depositAmount: number;
  zeroDeposit: boolean;
  
  // Terms and Conditions
  terms: string[];
  specialConditions: string[];
  
  // Signatures
  landlordSignature?: AgreementSignature;
  tenantSignature?: AgreementSignature;
  
  // Documents
  attachments: AgreementAttachment[];
  
  // Payment Terms
  paymentSchedule: PaymentSchedule;
  
  // Utilities and Services
  utilitiesIncluded: boolean;
  utilitiesList: string[];
  maintenanceIncluded: boolean;
  
  // Notifications
  notifications: AgreementNotifications;
  
  // Protection Plan
  khayalamiProtection: KhayalamiProtection;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  signedAt?: Date;
  activatedAt?: Date;
  expiredAt?: Date;
  
  // Virtual fields
  duration?: number;
  isActive?: boolean;
}

// Create Agreement Request Interface
export interface CreateAgreementRequest {
  propertyId: string;
  tenantId: string;
  title: string;
  description?: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  rentAmount: number;
  depositAmount?: number;
  zeroDeposit?: boolean;
  terms?: string[];
  specialConditions?: string[];
  paymentSchedule?: Partial<PaymentSchedule>;
  utilitiesIncluded?: boolean;
  utilitiesList?: string[];
  maintenanceIncluded?: boolean;
  khayalamiProtection?: Partial<KhayalamiProtection>;
}

// Update Agreement Request Interface
export interface UpdateAgreementRequest {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  rentAmount?: number;
  depositAmount?: number;
  zeroDeposit?: boolean;
  terms?: string[];
  specialConditions?: string[];
  paymentSchedule?: Partial<PaymentSchedule>;
  utilitiesIncluded?: boolean;
  utilitiesList?: string[];
  maintenanceIncluded?: boolean;
  notifications?: Partial<AgreementNotifications>;
  khayalamiProtection?: Partial<KhayalamiProtection>;
}

// Sign Agreement Request Interface
export interface SignAgreementRequest {
  signatureData: string;
  ipAddress?: string;
}

// Terminate Agreement Request Interface
export interface TerminateAgreementRequest {
  reason: string;
}

// Upload Attachment Request Interface
export interface UploadAttachmentRequest {
  name: string;
  url: string;
  type: string;
}

// Agreement Statistics Interface
export interface AgreementStats {
  total: number;
  active: number;
  pending: number;
  expired: number;
  draft: number;
}

// Agreement Template Interface
export interface AgreementTemplate {
  id: string;
  name: string;
  description: string;
  terms: string[];
}

// API Response Interfaces
export interface AgreementResponse {
  success: boolean;
  message?: string;
  data: Agreement;
}

export interface AgreementsResponse {
  success: boolean;
  data: Agreement[];
}

export interface AgreementStatsResponse {
  success: boolean;
  data: AgreementStats;
}

export interface AgreementTemplatesResponse {
  success: boolean;
  data: AgreementTemplate[];
}

export interface PDFResponse {
  success: boolean;
  data: { pdfUrl: string };
}

// Error Response Interface
export interface AgreementErrorResponse {
  success: false;
  message: string;
  errors?: string[];
} 
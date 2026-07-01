// @ts-nocheck
import { Agreement, IAgreement } from "../models/Agreement";
import { User } from "../models/User";
import { Property } from "../models/Property";
import { AgreementTemplate, IAgreementTemplate } from "../models/AgreementTemplate";
import { Signature, ISignature } from "../models/Signature";
import { Types } from "mongoose";
import crypto from "crypto";

export interface CreateAgreementData {
  // Required - Selection
  propertyId: string;
  landlordId: string;
  tenantId: string;
  
  // Required - Basic Agreement Info
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  rentAmount: number;
  depositAmount?: number;
  zeroDeposit?: boolean;
  
  // Optional - Extended Financial Fields
  earlyPaymentRentalAmount?: number; // Discounted rent for early payment
  utilityDepositAmount?: number; // Utility deposit (default: 0)
  securityDepositMonths?: number; // Number of months as deposit (default: 2)
  minorRepairsLimit?: number; // Max tenant responsible for repairs (default: 20.00)
  cleaningFee?: number; // Fee if property not returned properly
  latePaymentInterestRate?: number; // Annual interest rate (default: 10)
  
  // Optional - Agreement Terms
  renewalOptionPeriod?: string; // e.g., "One year only" (default: "One year only")
  renewalNoticePeriod?: string; // e.g., "Two (2) months" (default: "Two (2) months")
  propertyUsePurpose?: string; // e.g., "Residential Purpose Only" (default: "Residential Purpose Only")
  landlordTerminationNotice?: string; // e.g., "1 month" (default: "1 month")
  
  // Optional - Inventory
  inventoryAddress?: string; // Address for inventory (defaults to property address)
  inventoryItems?: Array<{
    item: string;
    quantity: string;
  }>; // List of furniture/fixtures
  
  // Optional - Witness (for legal purposes)
  witnessName?: string;
  witnessId?: string;
  
  // Existing Optional Fields
  terms?: string[];
  specialConditions?: string[];
  paymentSchedule?: {
    frequency: "monthly" | "weekly" | "bi-weekly";
    dueDay: number;
    lateFee: number;
    gracePeriod: number;
  };
  utilitiesIncluded?: boolean;
  utilitiesList?: string[];
  maintenanceIncluded?: boolean;
  khayalamiProtection?: {
    enabled: boolean;
    planType: "basic" | "premium";
    monthlyFee: number;
    coverage: string[];
  };
  
  // Optional - Agreement Date (defaults to createdAt)
  agreementDate?: Date;
}

export interface SignatureData {
  signatureData: string;
  ipAddress: string;
  userAgent?: string;
  deviceInfo?: {
    type: string;
    os: string;
    browser: string;
  };
  signatureType?: "drawing" | "typed" | "uploaded";
  verificationMethod?: "email" | "sms" | "2fa" | "none";
  sessionId?: string;
}

export interface CreateAgreementFromTemplateData {
  templateId: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;
  formData: Record<string, any>;
  customTerms?: string[];
  customSpecialConditions?: string[];
}

export interface AgreementNotification {
  type: "created" | "sent_for_review" | "signed" | "activated" | "expired" | "terminated";
  recipientId: string;
  recipientRole: "landlord" | "tenant";
  message: string;
  agreementId: string;
  propertyId: string;
  /** Who just signed (partial sign → notify the other party) */
  signedByRole?: "landlord" | "tenant";
  /** party = one side signed; completed = both sides executed */
  signPhase?: "party" | "completed";
  senderId?: string;
}

export class AgreementService {
  
  /**
   * Create a new agreement (admin only, but landlordId must be provided)
   */
  async createAgreement(data: CreateAgreementData): Promise<IAgreement> {
    // Validate that the landlord exists (admin creates on behalf of landlord)
    const landlord = await User.findById(data.landlordId);
    if (!landlord || landlord.role !== "landlord") {
      throw new Error("Invalid landlord specified");
    }

    // Validate that the tenant exists (temporarily not enforcing verification)
    const tenant = await User.findById(data.tenantId);
    if (!tenant || tenant.role !== "tenant") {
      throw new Error("Invalid tenant");
    }
    // NOTE: Tenant verification temporarily disabled
    // if (!tenant.isVerified) {
    //   throw new Error("Tenant must be verified before creating an agreement");
    // }

    // Validate that the property exists and belongs to the landlord
    const property = await Property.findById(data.propertyId);
    if (!property) {
      throw new Error("Property not found");
    }
    // Robust ownership check using ObjectId.equals to avoid string/ObjectId mismatches
    if (!(property.landlordId as any)?.equals?.(data.landlordId)) {
      throw new Error("Property does not belong to this landlord");
    }

    // Validate dates
    if (data.startDate >= data.endDate) {
      throw new Error("Start date must be before end date");
    }

    // Check for existing active agreements for this property
    const existingAgreement = await Agreement.findOne({
      propertyId: data.propertyId,
      status: { $in: ["active", "pending", "signed"] }
    });

    if (existingAgreement) {
      throw new Error("Property already has an active or pending agreement");
    }

    const { agreementFeeService } = await import("./AgreementFeeService");
    const agreementFeeAmount = agreementFeeService.calculateFeeForProperty(property as any);

    // Create the agreement with all extended fields
    const agreement = new Agreement({
      ...data,
      status: "pending",
      type: "tenancy",
      agreementFeeAmount,
      agreementFeeStatus: "pending",
      
      // Extended template fields
      agreementDate: data.agreementDate || new Date(),
      earlyPaymentRentalAmount: data.earlyPaymentRentalAmount,
      utilityDepositAmount: data.utilityDepositAmount || 0,
      securityDepositMonths: data.securityDepositMonths || 2,
      renewalOptionPeriod: data.renewalOptionPeriod || "One year only",
      renewalNoticePeriod: data.renewalNoticePeriod || "Two (2) months",
      propertyUsePurpose: data.propertyUsePurpose || "Residential Purpose Only",
      minorRepairsLimit: data.minorRepairsLimit || 20.00,
      cleaningFee: data.cleaningFee,
      latePaymentInterestRate: data.latePaymentInterestRate || 10,
      landlordTerminationNotice: data.landlordTerminationNotice || "1 month",
      inventoryAddress: data.inventoryAddress,
      inventoryItems: data.inventoryItems || [],
      witnessName: data.witnessName,
      witnessId: data.witnessId,
      
      // Existing fields
      paymentSchedule: data.paymentSchedule || {
        frequency: "monthly",
        dueDay: 1,
        lateFee: 100,
        gracePeriod: 5
      },
      utilitiesIncluded: data.utilitiesIncluded || false,
      utilitiesList: data.utilitiesList || [],
      maintenanceIncluded: data.maintenanceIncluded || false,
      khayalamiProtection: data.khayalamiProtection || {
        enabled: false,
        planType: "basic",
        monthlyFee: 0,
        coverage: []
      },
      notifications: {
        rentReminder: true,
        maintenanceUpdates: true,
        agreementAlerts: true
      },
      attachments: [],
      terms: data.terms || [
        "Tenant shall pay rent on time",
        "Tenant shall maintain the property in good condition",
        "Tenant shall not sublet without written permission",
        "Landlord shall provide necessary maintenance"
      ],
      specialConditions: data.specialConditions || []
    });

    await agreement.save();

    // Send email notifications to both landlord and tenant
    await this.sendAgreementNotification({
      type: "created",
      recipientId: data.landlordId.toString(),
      recipientRole: "landlord",
      message: `New agreement created for ${property.title}`,
      agreementId: agreement._id.toString(),
      propertyId: data.propertyId
    });

    await this.sendAgreementNotification({
      type: "created",
      recipientId: data.tenantId.toString(),
      recipientRole: "tenant",
      message: `New agreement created for ${property.title}`,
      agreementId: agreement._id.toString(),
      propertyId: data.propertyId
    });

    return agreement;
  }

  /**
   * Get user's agreements with enhanced filtering
   */
  async getUserAgreements(userId: string, userRole: string, status?: string): Promise<IAgreement[]> {
    const query: any = {};
    
    if (userRole === "landlord") {
      query.landlordId = userId;
    } else if (userRole === "tenant") {
      query.tenantId = userId;
    } else {
      throw new Error("Invalid user role");
    }

    if (status) {
      query.status = status;
    }

    const agreements = await Agreement.find(query)
      .populate("propertyId", "title address images")
      .populate("landlordId", "firstName lastName email phone")
      .populate("tenantId", "firstName lastName email phone")
      .sort({ createdAt: -1 });

    const agreementsWithFormatted = await Promise.all(
      agreements.map(async (agreement) => {
        try {
          await this.syncEmbeddedSignaturesFromRecords(agreement);
          const formattedAgreement = this.generateFormattedAgreement(agreement);
          const agreementObj = agreement.toObject();
          agreementObj.formattedAgreement = formattedAgreement;
          return this.enrichAgreementForList(agreementObj);
        } catch (error) {
          console.error("❌ Error generating formatted agreement for agreement:", agreement._id, error);
          const agreementObj = agreement.toObject();
          agreementObj.formattedAgreement = "Error generating formatted agreement";
          return this.enrichAgreementForList(agreementObj);
        }
      })
    );

    return agreementsWithFormatted;
  }

  /** Sync Signature collection into embedded fields when missing (list/detail consistency). */
  private async syncEmbeddedSignaturesFromRecords(agreement: any): Promise<void> {
    const needsLandlord = !agreement.landlordSignature?.signedAt;
    const needsTenant = !agreement.tenantSignature?.signedAt;
    if (!needsLandlord && !needsTenant) return;

    const [landlordSig, tenantSig] = await Promise.all([
      needsLandlord
        ? Signature.findOne({ agreementId: agreement._id, userRole: "landlord", isActive: { $ne: false } })
        : null,
      needsTenant
        ? Signature.findOne({ agreementId: agreement._id, userRole: "tenant", isActive: { $ne: false } })
        : null,
    ]);

    let changed = false;
    if (landlordSig && needsLandlord) {
      agreement.landlordSignature = {
        signedAt: landlordSig.signedAt,
        signatureUrl: landlordSig.signatureUrl,
        ipAddress: landlordSig.ipAddress,
      };
      changed = true;
    }
    if (tenantSig && needsTenant) {
      agreement.tenantSignature = {
        signedAt: tenantSig.signedAt,
        signatureUrl: tenantSig.signatureUrl,
        ipAddress: tenantSig.ipAddress,
        paymentStatus: agreement.tenantSignature?.paymentStatus || "deferred",
      };
      changed = true;
    }
    if (changed) await agreement.save();
  }

  /** Explicit flags for agreement list cards (sign status, fee deferral). */
  private enrichAgreementForList(agreementObj: any): any {
    agreementObj.landlordSigned = !!agreementObj.landlordSignature?.signedAt;
    agreementObj.tenantSigned = !!agreementObj.tenantSignature?.signedAt;
    agreementObj.bothSigned = agreementObj.landlordSigned && agreementObj.tenantSigned;
    agreementObj.canSignWithoutPayment = true;
    agreementObj.paymentStatus =
      agreementObj.tenantSignature?.paymentStatus || "no_payment";
    return agreementObj;
  }

  /**
   * Get a specific agreement by ID with access control
   */
  async getAgreementById(agreementId: string, userId: string, userRole: string): Promise<IAgreement> {
    const agreement = await Agreement.findById(agreementId)
      .populate("propertyId", "title address images")
      .populate("landlordId", "firstName lastName email phone")
      .populate("tenantId", "firstName lastName email phone");

    if (!agreement) {
      throw new Error("Agreement not found");
    }

    // Check access control (handle populated refs and ObjectId vs string)
    const landlordIdStr = (agreement.landlordId as any)?._id?.toString?.() ?? agreement.landlordId?.toString?.();
    const tenantIdStr = (agreement.tenantId as any)?._id?.toString?.() ?? agreement.tenantId?.toString?.();
    const userIdStr = (userId as any)?.toString?.() ?? String(userId);
    if (userRole === "landlord" && landlordIdStr !== userIdStr) {
      throw new Error("Access denied");
    }
    if (userRole === "tenant" && tenantIdStr !== userIdStr) {
      throw new Error("Access denied");
    }

    // Sync legacy upfront-fee payment status when tenant has signed
    if (agreement.tenantSignature?.signedAt) {
      const { agreementFeeService } = await import("./AgreementFeeService");
      const correctPaymentStatus = await agreementFeeService.resolveTenantFeePaymentStatus(
        agreement,
        tenantIdStr
      );

      if (
        agreement.tenantSignature.paymentStatus !== correctPaymentStatus &&
        correctPaymentStatus !== "deferred"
      ) {
        agreement.tenantSignature.paymentStatus = correctPaymentStatus;
        await agreement.save();
      } else if (
        correctPaymentStatus === "deferred" &&
        agreement.tenantSignature.paymentStatus !== "deferred" &&
        agreement.tenantSignature.paymentStatus !== "verified"
      ) {
        agreement.tenantSignature.paymentStatus = "deferred";
        await agreement.save();
      }

      agreement.set("computedTenantPaymentStatus", agreement.tenantSignature.paymentStatus);
    }

    // Generate formatted rental agreement template
    console.log('🔍 Starting formatted agreement generation for agreement:', agreement._id);
    try {
      const formattedAgreement = this.generateFormattedAgreement(agreement);
      console.log('📝 Generated formatted agreement length:', formattedAgreement.length);
      
      // Convert Mongoose document to plain object and add formatted agreement
      const agreementObj: any = agreement.toObject();
      agreementObj.formattedAgreement = formattedAgreement;
      agreementObj.paymentStatus = agreement.get("computedTenantPaymentStatus") ||
        agreementObj.tenantSignature?.paymentStatus ||
        "no_payment";
      agreementObj.canSignWithoutPayment = true;
      if (!agreementObj.agreementFeeAmount && agreementObj.agreementFeeAmount !== 0) {
        agreementObj.agreementFeeAmount = agreement.agreementFeeAmount ?? 0;
      }
      if (!agreementObj.agreementFeeStatus) {
        agreementObj.agreementFeeStatus = agreement.agreementFeeStatus ?? "pending";
      }
      if (!agreementObj.tenantSignature) {
        agreementObj.tenantSignature = {
          paymentStatus: agreementObj.paymentStatus
        };
      } else if (!agreementObj.tenantSignature.paymentStatus) {
        agreementObj.tenantSignature.paymentStatus = agreementObj.paymentStatus;
      }
      
      console.log('✅ Formatted agreement added to response for agreement:', agreement._id);
      console.log('🔍 Agreement object keys after adding formattedAgreement:', Object.keys(agreementObj));
      
      return agreementObj as any;
    } catch (error) {
      console.error('❌ Error generating formatted agreement:', error);
      const agreementObj = agreement.toObject();
      agreementObj.formattedAgreement = 'Error generating formatted agreement';
      return agreementObj as any;
    }
  }

  /**
   * Update agreement (landlord only)
   */
  async updateAgreement(agreementId: string, landlordId: string, updates: Partial<IAgreement>): Promise<IAgreement> {
    const agreement = await Agreement.findById(agreementId);
    
    if (!agreement) {
      throw new Error("Agreement not found");
    }

    if (agreement.landlordId.toString() !== landlordId) {
      throw new Error("Only the landlord can update this agreement");
    }

    if (agreement.status !== "draft") {
      throw new Error("Only draft agreements can be updated");
    }

    // Update the agreement
    Object.assign(agreement, updates);
    await agreement.save();

    // Send notification to tenant about update
    await this.sendAgreementNotification({
      type: "created", // Treat as new notification
      recipientId: agreement.tenantId.toString(),
      recipientRole: "tenant",
      message: `Agreement updated for ${agreement.title}`,
      agreementId: agreement._id.toString(),
      propertyId: agreement.propertyId.toString()
    });

    return agreement;
  }

  /**
   * Delete agreement (landlord only, draft or pending only)
   */
  async deleteAgreement(agreementId: string, landlordId: string): Promise<void> {
    const agreement = await Agreement.findById(agreementId);
    
    if (!agreement) {
      throw new Error("Agreement not found");
    }

    // Allow both landlord and tenant to delete
    const landlordIdStr = agreement.landlordId.toString();
    const tenantIdStr = agreement.tenantId.toString();
    const userIdStr = landlordId.toString();

    if (landlordIdStr !== userIdStr && tenantIdStr !== userIdStr) {
      throw new Error("You are not authorized to delete this agreement");
    }

    // Only allow deletion of draft and pending agreements
    if (!["draft", "pending"].includes(agreement.status)) {
      throw new Error(`Cannot delete ${agreement.status} agreements. Only draft and pending agreements can be deleted.`);
    }

    // Determine who deleted and who to notify
    const deletedByLandlord = landlordIdStr === userIdStr;
    const otherPartyId = deletedByLandlord ? tenantIdStr : landlordIdStr;
    const otherPartyRole = deletedByLandlord ? "tenant" : "landlord";
    const deletedBy = deletedByLandlord ? "landlord" : "tenant";

    // Send notification to the other party if agreement was pending
    if (agreement.status === "pending") {
      await this.sendAgreementNotification({
        type: "created", // Using created as fallback
        recipientId: otherPartyId,
        recipientRole: otherPartyRole,
        message: `Agreement "${agreement.title}" has been withdrawn by the ${deletedBy}`,
        agreementId: agreement._id.toString(),
        propertyId: agreement.propertyId.toString()
      });
    }

    // Delete the agreement
    await Agreement.findByIdAndDelete(agreementId);
    
    console.log(`🗑️ Agreement deleted by ${deletedBy}: ${agreementId}`);
  }

  /**
   * Send agreement for review (landlord only)
   */
  async sendForReview(agreementId: string, landlordId: string): Promise<IAgreement> {
    const agreement = await Agreement.findById(agreementId)
      .populate("propertyId", "title")
      .populate("tenantId", "firstName lastName email");

    if (!agreement) {
      throw new Error("Agreement not found");
    }

    if (agreement.landlordId.toString() !== landlordId) {
      throw new Error("Only the landlord can send this agreement for review");
    }

    if (agreement.status !== "draft") {
      throw new Error("Only draft agreements can be sent for review");
    }

    // Update status to pending
    agreement.status = "pending";
    await agreement.save();

    // Send notification to tenant
    await this.sendAgreementNotification({
      type: "sent_for_review",
      recipientId: agreement.tenantId.toString(),
      recipientRole: "tenant",
      message: `Agreement sent for review: ${agreement.title}`,
      agreementId: agreement._id.toString(),
      propertyId: agreement.propertyId.toString()
    });

    return agreement;
  }

  /**
   * Sign agreement with enhanced e-signature system
   */
  async signAgreement(agreementId: string, userId: string, userRole: string, signatureData: SignatureData): Promise<IAgreement> {
    const agreement = await Agreement.findById(agreementId)
      .populate("propertyId", "title")
      .populate("landlordId", "firstName lastName email")
      .populate("tenantId", "firstName lastName email");

    if (!agreement) {
      throw new Error("Agreement not found");
    }

    // Check if user is authorized to sign (handle populated refs and ObjectId vs string)
    const landlordIdStr = (agreement.landlordId as any)?._id?.toString?.() ?? agreement.landlordId?.toString?.();
    const tenantIdStr = (agreement.tenantId as any)?._id?.toString?.() ?? agreement.tenantId?.toString?.();
    const userIdStr = (userId as any)?.toString?.() ?? String(userId);
    if (userRole === "landlord" && landlordIdStr !== userIdStr) {
      throw new Error("Only the landlord can sign this agreement");
    }
    if (userRole === "tenant" && tenantIdStr !== userIdStr) {
      throw new Error("Only the tenant can sign this agreement");
    }

    // Landlord must sign first, then tenant
    if (userRole === "tenant") {
      const landlordSignature = await Signature.findOne({ agreementId, userRole: "landlord" });
      if (!landlordSignature && !agreement.landlordSignature?.signedAt) {
        throw new Error("Landlord must sign the agreement before tenant can sign");
      }

      const { agreementFeeService } = await import("./AgreementFeeService");
      const paymentStatus = await agreementFeeService.resolveTenantFeePaymentStatus(
        agreement,
        tenantIdStr
      );
      (signatureData as any).paymentStatus = paymentStatus;
    }

    // Check if user has already signed
    const existingSignature = await Signature.findOne({
      agreementId,
      userId,
      userRole
    });

    if (existingSignature) {
      // Idempotent: user already signed; ensure in-document signature fields are set and return
      if (userRole === "landlord" && !agreement.landlordSignature?.signedAt) {
        agreement.landlordSignature = {
          signedAt: existingSignature.signedAt,
          signatureUrl: existingSignature.signatureUrl || undefined,
          ipAddress: existingSignature.ipAddress
        } as any;
      }
      if (userRole === "tenant" && !agreement.tenantSignature?.signedAt) {
        const { agreementFeeService } = await import("./AgreementFeeService");
        const paymentStatus = await agreementFeeService.resolveTenantFeePaymentStatus(
          agreement,
          tenantIdStr
        );
        agreement.tenantSignature = {
          signedAt: existingSignature.signedAt,
          signatureUrl: existingSignature.signatureUrl || undefined,
          ipAddress: existingSignature.ipAddress,
          paymentStatus,
        } as any;
        await agreement.save();
      }
      await this.completeAgreementIfBothSigned(agreement, agreementId);
      return agreement;
    }

    // Create signature record (simple URL-based signature)
    const signature = new Signature({
      agreementId,
      userId,
      userRole,
      signatureUrl: (signatureData as any).signatureUrl,
      // Accept legacy base64 for backward compat
      signatureData: (signatureData as any).signatureData,
      signatureType: (signatureData as any).signatureUrl ? "uploaded" : (signatureData.signatureType || "drawing"),
      ipAddress: signatureData.ipAddress,
      userAgent: signatureData.userAgent,
      deviceInfo: signatureData.deviceInfo,
      signedAt: new Date(),
      verificationMethod: signatureData.verificationMethod || "none",
      sessionId: (signatureData as any).sessionId,
      consentGiven: true,
      termsAccepted: true,
      privacyPolicyAccepted: true,
      isActive: true
    });

    await signature.save();

    if (userRole === "landlord") {
      agreement.landlordSignature = {
        signedAt: signature.signedAt,
        signatureUrl: signature.signatureUrl || undefined,
        ipAddress: signature.ipAddress
      } as any;
    } else {
      const { agreementFeeService } = await import("./AgreementFeeService");
      const paymentStatus =
        (signatureData as any).paymentStatus ||
        (await agreementFeeService.resolveTenantFeePaymentStatus(agreement, tenantIdStr));
      agreement.tenantSignature = {
        signedAt: signature.signedAt,
        signatureUrl: signature.signatureUrl || undefined,
        ipAddress: signature.ipAddress,
        paymentStatus,
      } as any;
    }

    if (agreement.status === "draft") {
      agreement.status = "pending";
    }

    const landlordSignature = await Signature.findOne({ agreementId, userRole: "landlord" });
    const tenantSignature = await Signature.findOne({ agreementId, userRole: "tenant" });

    if (landlordSignature && tenantSignature) {
      await this.completeAgreementIfBothSigned(agreement, agreementId);
    } else {
      // One party signed — notify the other in real time
      const propertyIdStr = this.refIdString(agreement.propertyId);
      const otherPartyId = userRole === "landlord" ? tenantIdStr : landlordIdStr;
      const otherPartyRole = userRole === "landlord" ? "tenant" : "landlord";
      const signerLabel = userRole === "landlord" ? "Landlord" : "Tenant";

      await this.sendAgreementNotification({
        type: "signed",
        signPhase: "party",
        signedByRole: userRole as "landlord" | "tenant",
        recipientId: otherPartyId,
        recipientRole: otherPartyRole as "landlord" | "tenant",
        message: `${signerLabel} has signed "${agreement.title}". Please review and sign when you are ready.`,
        agreementId: agreement._id.toString(),
        propertyId: propertyIdStr,
        senderId: userIdStr,
      });
    }

    await agreement.save();
    return agreement;
  }

  /**
   * Pay agreement fee online (in-app payment)
   * Creates payment record, revenue source, and updates agreement payment status
   */
  async payAgreementFeeOnline(
    agreementId: string,
    userId: string,
    data: {
      amount: number;
      gatewayResponse?: any; // Optional for testing
      notes?: string;
    }
  ): Promise<{
    payment: any;
    revenueSource: any;
    agreement: IAgreement;
  }> {
    const { Payment } = await import("../models/Payment");
    const { RevenueSource } = await import("../models/RevenueSource");
    const { paymentCalculationService } = await import("./PaymentCalculationService");
    const { revenueSourceService } = await import("./RevenueSourceService");
    const { Types } = await import("mongoose");

    // Get agreement
    const agreement = await Agreement.findById(agreementId)
      .populate("propertyId", "title")
      .populate("landlordId", "firstName lastName email")
      .populate("tenantId", "firstName lastName email");

    if (!agreement) {
      throw new Error("Agreement not found");
    }

    // Verify user is the tenant
    const tenantIdStr = ((agreement.tenantId as any)?._id ?? agreement.tenantId)?.toString();
    const userIdStr = userId.toString();

    if (tenantIdStr !== userIdStr) {
      throw new Error("Only the tenant can pay the agreement fee");
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({
      agreementId: agreement._id,
      tenantId: new Types.ObjectId(tenantIdStr),
      paymentType: "service",
      status: "verified"
    });

    if (existingPayment) {
      throw new Error("Agreement fee has already been paid");
    }

    // Get property value for fee calculation (optional validation)
    const property = await Property.findById(agreement.propertyId);
    const calculatedFee = paymentCalculationService.calculateAgreementFee(
      (property as any)?.estimatedValue
    );

    // Validate amount (should match calculated fee, but allow slight variance)
    if (data.amount < calculatedFee * 0.9 || data.amount > calculatedFee * 1.1) {
      console.warn(`⚠️  Payment amount (${data.amount}) doesn't match calculated fee (${calculatedFee})`);
    }

    // Get IDs
    const landlordId = ((agreement.landlordId as any)?._id ?? agreement.landlordId)?.toString();
    const propertyId = ((agreement.propertyId as any)?._id ?? agreement.propertyId)?.toString();

    // Create payment record
    const paymentData: any = {
      agreementId: agreement._id,
      propertyId: new Types.ObjectId(propertyId),
      landlordId: new Types.ObjectId(landlordId),
      tenantId: new Types.ObjectId(tenantIdStr),
      paymentType: "service",
      amount: data.amount,
      totalAmount: data.amount,
      paymentMethod: "in_app",
      paymentDate: new Date(),
      dueDate: new Date(),
      status: "verified", // Auto-verified for online payments
      verifiedAt: new Date(),
      notes: data.notes || "Agreement processing fee (online payment)"
    };

    // Only include gatewayResponse if provided
    if (data.gatewayResponse) {
      paymentData.gatewayResponse = data.gatewayResponse;
    }

    const payment = await Payment.create(paymentData);

    // Create revenue source
    const revenueSource = await revenueSourceService.createRevenueSource({
      sourceType: "agreement_fee",
      amount: data.amount,
      payerId: tenantIdStr,
      recipientId: "khayalami",
      paymentId: payment._id.toString(),
      agreementId: agreement._id.toString(),
      propertyId: propertyId,
      description: "Agreement processing fee",
      status: "collected" // Immediately collected for online payments
    });

    // Add to escrow (100% to Khayalami, 0% to landlord for agreement fees)
    const { escrowService } = await import("./EscrowService");
    await escrowService.addToEscrow(payment, {
      deductions: {
        subscriptionFee: 0,
        processingFee: 0,
        insurancePremium: 0
      },
      revenueSourceIds: [revenueSource._id.toString()]
    });
    // Update status to "held" since payment is verified
    await escrowService.updateEscrowStatus(payment._id.toString(), "held");

    // Update agreement — fee collected upfront (legacy path)
    const { agreementFeeService } = await import("./AgreementFeeService");
    await agreementFeeService.markFeeChargedFromUpfrontPayment(agreement, data.amount);

    const { Signature } = await import("../models/Signature");
    const landlordSignature = await Signature.findOne({
      agreementId: agreement._id,
      userRole: "landlord",
    });
    const tenantSignature = await Signature.findOne({
      agreementId: agreement._id,
      userRole: "tenant",
    });

    if (landlordSignature && tenantSignature) {
      await this.completeAgreementIfBothSigned(agreement, agreementId);
    } else {
      await agreement.save();
    }

    console.log(`✅ Agreement fee paid online: ${data.amount} for agreement: ${agreementId}`);

    return {
      payment,
      revenueSource,
      agreement
    };
  }

  /**
   * Terminate agreement (both landlord and tenant)
   */
  /**
   * Request termination (Step 1: First party requests termination)
   */
  async requestTermination(agreementId: string, userId: string, userRole: string, data: {
    reason: string;
    terminationDate: Date;
    notes?: string;
  }): Promise<IAgreement> {
    const agreement = await Agreement.findById(agreementId)
      .populate("propertyId", "title")
      .populate("landlordId", "firstName lastName email")
      .populate("tenantId", "firstName lastName email");

    if (!agreement) {
      throw new Error("Agreement not found");
    }

    // Check if user is authorized to request termination
    const landlordIdStr = (agreement.landlordId as any)?._id?.toString?.() ?? agreement.landlordId?.toString?.();
    const tenantIdStr = (agreement.tenantId as any)?._id?.toString?.() ?? agreement.tenantId?.toString?.();
    const userIdStr = userId.toString();

    if (userRole === "landlord" && landlordIdStr !== userIdStr) {
      throw new Error("Only the landlord can request termination of this agreement");
    }
    if (userRole === "tenant" && tenantIdStr !== userIdStr) {
      throw new Error("Only the tenant can request termination of this agreement");
    }

    // Only active agreements can be terminated
    if (agreement.status !== "active") {
      throw new Error("Only active agreements can be terminated");
    }

    // Check if already terminated or pending termination
    if (agreement.status === "terminated") {
      throw new Error("Agreement is already terminated");
    }
    if (agreement.status === "pending_termination") {
      throw new Error("Agreement already has a pending termination request");
    }

    // Set termination request
    agreement.terminationRequest = {
      requestedBy: userId as any,
      requestedByRole: userRole as "landlord" | "tenant",
      reason: data.reason,
      terminationDate: data.terminationDate,
      notes: data.notes,
      requestedAt: new Date()
    };
    agreement.status = "pending_termination";

    await agreement.save();

    // Send notification to the other party
    const otherPartyId = userRole === "landlord" ? tenantIdStr : landlordIdStr;
    const otherPartyRole = userRole === "landlord" ? "tenant" : "landlord";

    await this.sendAgreementNotification({
      type: "created", // Using created as fallback
      recipientId: otherPartyId,
      recipientRole: otherPartyRole,
      message: `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} has requested to terminate the agreement: ${agreement.title}. Please review and confirm.`,
      agreementId: agreement._id.toString(),
      propertyId: agreement.propertyId.toString()
    });

    return agreement;
  }

  /**
   * Confirm termination (Step 2: Other party confirms termination)
   */
  async confirmTermination(agreementId: string, userId: string, userRole: string): Promise<IAgreement> {
    const agreement = await Agreement.findById(agreementId)
      .populate("propertyId", "title")
      .populate("landlordId", "firstName lastName email")
      .populate("tenantId", "firstName lastName email");

    if (!agreement) {
      throw new Error("Agreement not found");
    }

    // Check if user is authorized to confirm termination
    const landlordIdStr = (agreement.landlordId as any)?._id?.toString?.() ?? agreement.landlordId?.toString?.();
    const tenantIdStr = (agreement.tenantId as any)?._id?.toString?.() ?? agreement.tenantId?.toString?.();
    const userIdStr = userId.toString();

    if (userRole === "landlord" && landlordIdStr !== userIdStr) {
      throw new Error("Only the landlord can confirm termination of this agreement");
    }
    if (userRole === "tenant" && tenantIdStr !== userIdStr) {
      throw new Error("Only the tenant can confirm termination of this agreement");
    }

    // Must be pending termination
    if (agreement.status !== "pending_termination") {
      throw new Error("No pending termination request found");
    }

    // Check if termination request exists
    if (!agreement.terminationRequest) {
      throw new Error("No termination request found");
    }

    // Check if user is NOT the one who requested termination (can't confirm own request)
    const requestedByStr = agreement.terminationRequest.requestedBy.toString();
    if (requestedByStr === userIdStr) {
      throw new Error("You cannot confirm your own termination request");
    }

    // Terminate the agreement
    agreement.status = "terminated";
    agreement.terminatedAt = new Date();
    agreement.terminatedBy = userId as any;

    await agreement.save();

    try {
      const { rentalService } = await import("./RentalService");
      await rentalService.finalizeAgreementTermination(
        agreement._id.toString(),
        agreement.propertyId
      );
    } catch (err: any) {
      console.error(`❌ Post-termination cleanup failed for agreement ${agreementId}:`, err.message);
    }

    // Send notification to both parties
    const requesterRole = agreement.terminationRequest.requestedByRole;
    const requesterId = requestedByStr;

    await this.sendAgreementNotification({
      type: "terminated",
      recipientId: requesterId,
      recipientRole: requesterRole,
      message: `Agreement terminated: ${agreement.title}. The other party has confirmed your termination request.`,
      agreementId: agreement._id.toString(),
      propertyId: agreement.propertyId.toString()
    });

    return agreement;
  }

  /**
   * Reject termination request (other party rejects termination)
   */
  async rejectTermination(agreementId: string, userId: string, userRole: string, rejectionReason?: string): Promise<IAgreement> {
    const agreement = await Agreement.findById(agreementId)
      .populate("propertyId", "title")
      .populate("landlordId", "firstName lastName email")
      .populate("tenantId", "firstName lastName email");

    if (!agreement) {
      throw new Error("Agreement not found");
    }

    // Check if user is authorized to reject termination
    const landlordIdStr = (agreement.landlordId as any)?._id?.toString?.() ?? agreement.landlordId?.toString?.();
    const tenantIdStr = (agreement.tenantId as any)?._id?.toString?.() ?? agreement.tenantId?.toString?.();
    const userIdStr = userId.toString();

    if (userRole === "landlord" && landlordIdStr !== userIdStr) {
      throw new Error("Only the landlord can reject termination of this agreement");
    }
    if (userRole === "tenant" && tenantIdStr !== userIdStr) {
      throw new Error("Only the tenant can reject termination of this agreement");
    }

    // Must be pending termination
    if (agreement.status !== "pending_termination") {
      throw new Error("No pending termination request found");
    }

    // Check if termination request exists
    if (!agreement.terminationRequest) {
      throw new Error("No termination request found");
    }

    // Check if user is NOT the one who requested termination
    const requestedByStr = agreement.terminationRequest.requestedBy.toString();
    if (requestedByStr === userIdStr) {
      throw new Error("You cannot reject your own termination request");
    }

    // Revert status back to active and clear termination request
    agreement.status = "active";
    agreement.terminationRequest = undefined;

    await agreement.save();

    // Send notification to requester
    const requesterRole = agreement.terminationRequest?.requestedByRole || "landlord";

    await this.sendAgreementNotification({
      type: "created", // Using created as fallback
      recipientId: requestedByStr,
      recipientRole: requesterRole,
      message: `Your termination request for "${agreement.title}" was declined${rejectionReason ? `: ${rejectionReason}` : '.'}`,
      agreementId: agreement._id.toString(),
      propertyId: agreement.propertyId.toString()
    });

    return agreement;
  }

  /**
   * Cancel termination request (requester cancels their own request)
   */
  async cancelTerminationRequest(agreementId: string, userId: string, userRole: string): Promise<IAgreement> {
    const agreement = await Agreement.findById(agreementId);

    if (!agreement) {
      throw new Error("Agreement not found");
    }

    // Must be pending termination
    if (agreement.status !== "pending_termination") {
      throw new Error("No pending termination request found");
    }

    // Check if termination request exists
    if (!agreement.terminationRequest) {
      throw new Error("No termination request found");
    }

    // Check if user is the one who requested termination
    const requestedByStr = agreement.terminationRequest.requestedBy.toString();
    const userIdStr = userId.toString();

    if (requestedByStr !== userIdStr) {
      throw new Error("Only the requester can cancel their own termination request");
    }

    // Revert status back to active and clear termination request
    agreement.status = "active";
    agreement.terminationRequest = undefined;

    await agreement.save();

    return agreement;
  }

  /**
   * Legacy method: Direct termination (kept for backward compatibility, but now deprecated)
   * @deprecated Use requestTermination and confirmTermination instead
   */
  async terminateAgreement(agreementId: string, userId: string, userRole: string, reason: string): Promise<IAgreement> {
    // This now acts as a shortcut that immediately terminates (for admin or special cases)
    const agreement = await Agreement.findById(agreementId);

    if (!agreement) {
      throw new Error("Agreement not found");
    }

    if (agreement.status !== "active") {
      throw new Error("Only active agreements can be terminated");
    }

    // Direct termination (bypass 2-step process)
    agreement.status = "terminated";
    agreement.terminatedAt = new Date();
    agreement.terminatedBy = userId as any;

    await agreement.save();

    try {
      const { rentalService } = await import("./RentalService");
      await rentalService.finalizeAgreementTermination(
        agreement._id.toString(),
        agreement.propertyId
      );
    } catch (err: any) {
      console.error(`❌ Post-termination cleanup failed for agreement ${agreementId}:`, err.message);
    }

    return agreement;
  }

  /**
   * Upload attachment to agreement (both landlord and tenant)
   */
  async uploadAttachment(agreementId: string, userId: string, userRole: string, attachment: {
    name: string;
    url: string;
    type: string;
  }): Promise<IAgreement> {
    const agreement = await Agreement.findById(agreementId);

    if (!agreement) {
      throw new Error("Agreement not found");
    }

    // Check if user is authorized to upload attachments
    if (userRole === "landlord" && agreement.landlordId.toString() !== userId) {
      throw new Error("Only the landlord can upload attachments to this agreement");
    }
    if (userRole === "tenant" && agreement.tenantId.toString() !== userId) {
      throw new Error("Only the tenant can upload attachments to this agreement");
    }

    // Add attachment
    agreement.attachments.push({
      name: attachment.name,
      url: attachment.url,
      type: attachment.type,
      uploadedAt: new Date()
    });

    await agreement.save();

    // Send notification to the other party
    const otherPartyId = userRole === "landlord" ? agreement.tenantId.toString() : agreement.landlordId.toString();
    const otherPartyRole = userRole === "landlord" ? "tenant" : "landlord";

    await this.sendAgreementNotification({
      type: "created", // Treat as general notification
      recipientId: otherPartyId,
      recipientRole: otherPartyRole,
      message: `New attachment uploaded to agreement: ${attachment.name}`,
      agreementId: agreement._id.toString(),
      propertyId: agreement.propertyId.toString()
    });

    return agreement;
  }

  /**
   * Get agreement statistics
   */
  async getAgreementStats(userId: string, userRole: string): Promise<{
    total: number;
    active: number;
    pending: number;
    expired: number;
    draft: number;
    signed: number;
    terminated: number;
  }> {
    const query: any = {};
    
    if (userRole === "landlord") {
      query.landlordId = userId;
    } else if (userRole === "tenant") {
      query.tenantId = userId;
    } else {
      throw new Error("Invalid user role");
    }

    const agreements = await Agreement.find(query);
    
    const stats = {
      total: agreements.length,
      active: agreements.filter(a => a.status === "active").length,
      pending: agreements.filter(a => a.status === "pending").length,
      expired: agreements.filter(a => a.status === "expired").length,
      draft: agreements.filter(a => a.status === "draft").length,
      signed: agreements.filter(a => a.status === "signed").length,
      terminated: agreements.filter(a => a.status === "terminated").length
    };

    return stats;
  }

  /**
   * Generate agreement PDF (placeholder)
   */
  async generateAgreementPDF(agreementId: string): Promise<string> {
    const agreement = await Agreement.findById(agreementId)
      .populate("propertyId", "title address")
      .populate("landlordId", "firstName lastName email phone")
      .populate("tenantId", "firstName lastName email phone");

    if (!agreement) {
      throw new Error("Agreement not found");
    }

    // This would integrate with a PDF generation service
    // For now, return a placeholder URL
    return `https://api.khayalami.com/agreements/${agreementId}/pdf`;
  }

  /**
   * Get agreement templates
   */
  async getAgreementTemplates(category?: string): Promise<IAgreementTemplate[]> {
    const query: any = { isActive: true };
    
    if (category) {
      query.category = category;
    }

    const templates = await AgreementTemplate.find(query).sort({ name: 1 });
    return templates;
  }

  /**
   * Get specific agreement template
   */
  async getAgreementTemplate(templateId: string): Promise<IAgreementTemplate> {
    const template = await AgreementTemplate.findById(templateId);
    
    if (!template) {
      throw new Error("Template not found");
    }

    if (!template.isActive) {
      throw new Error("Template is not active");
    }

    return template;
  }

  /**
   * Create agreement from template (admin only, but landlordId must be provided)
   */
  async createAgreementFromTemplate(data: CreateAgreementFromTemplateData): Promise<IAgreement> {
    // Validate template
    const template = await this.getAgreementTemplate(data.templateId);
    
    // Validate landlord (admin creates on behalf of landlord)
    const landlord = await User.findById(data.landlordId);
    if (!landlord || landlord.role !== "landlord") {
      throw new Error("Invalid landlord specified");
    }

    // Validate tenant
    const tenant = await User.findById(data.tenantId);
    if (!tenant || tenant.role !== "tenant") {
      throw new Error("Invalid tenant");
    }

    // Validate property
    const property = await Property.findById(data.propertyId);
    if (!property) {
      throw new Error("Property not found");
    }

    // Create agreement data from template
    const agreementData: CreateAgreementData = {
      propertyId: data.propertyId,
      landlordId: data.landlordId,
      tenantId: data.tenantId,
      title: data.formData.title || template.name,
      description: data.formData.description || template.description,
      startDate: new Date(data.formData.startDate),
      endDate: new Date(data.formData.endDate),
      rentAmount: data.formData.rentAmount,
      depositAmount: data.formData.depositAmount,
      zeroDeposit: data.formData.zeroDeposit,
      terms: [...(template.defaultTerms || []), ...(data.customTerms || [])],
      specialConditions: [...(template.defaultSpecialConditions || []), ...(data.customSpecialConditions || [])],
      paymentSchedule: data.formData.paymentSchedule || template.defaultPaymentSchedule,
      utilitiesIncluded: data.formData.utilitiesIncluded,
      utilitiesList: data.formData.utilitiesList,
      maintenanceIncluded: data.formData.maintenanceIncluded,
      khayalamiProtection: data.formData.khayalamiProtection
    };

    // Create the agreement
    return await this.createAgreement(agreementData);
  }

  /**
   * Get agreement signatures
   */
  async getAgreementSignatures(agreementId: string): Promise<ISignature[]> {
    const signatures = await Signature.find({ agreementId, isActive: true })
      .populate("userId", "firstName lastName email")
      .sort({ signedAt: 1 });

    return signatures;
  }

  /**
   * Verify signature integrity
   */
  async verifySignature(signatureId: string): Promise<{
    isValid: boolean;
    signature: ISignature;
    metadata: any;
  }> {
    const signature = await Signature.findById(signatureId);
    
    if (!signature) {
      throw new Error("Signature not found");
    }

    // Simplified integrity check: if legacy base64 exists, consider present; otherwise rely on URL presence
    const isValid = Boolean(signature.signatureData || signature.signatureUrl);

    const metadata = {
      signedAt: signature.signedAt,
      ipAddress: signature.ipAddress,
      userAgent: signature.userAgent,
      deviceInfo: signature.deviceInfo,
      verificationMethod: signature.verificationMethod,
      sessionId: signature.sessionId
    };

    return { isValid, signature, metadata };
  }

  /**
   * Get agreement audit trail
   */
  async getAgreementAuditTrail(agreementId: string): Promise<{
    agreement: IAgreement;
    signatures: ISignature[];
    timeline: any[];
  }> {
    const agreement = await Agreement.findById(agreementId)
      .populate("propertyId", "title address")
      .populate("landlordId", "firstName lastName email")
      .populate("tenantId", "firstName lastName email");

    if (!agreement) {
      throw new Error("Agreement not found");
    }

    const signatures = await Signature.find({ agreementId, isActive: true })
      .populate("userId", "firstName lastName email")
      .sort({ signedAt: 1 });

    // Build timeline
    const timeline = [];

    // Agreement creation
    timeline.push({
      event: "agreement_created",
      timestamp: agreement.createdAt,
      user: "landlord",
      description: "Agreement created by landlord"
    });

    // Status changes
    if (agreement.status === "pending") {
      timeline.push({
        event: "sent_for_review",
        timestamp: agreement.updatedAt,
        user: "landlord",
        description: "Agreement sent for tenant review"
      });
    }

    // Signatures
    signatures.forEach(signature => {
      timeline.push({
        event: "signed",
        timestamp: signature.signedAt,
        user: signature.userRole,
        description: `Agreement signed by ${signature.userRole}`,
        signatureId: signature._id
      });
    });

    // Agreement activation
    if (agreement.status === "active") {
      timeline.push({
        event: "activated",
        timestamp: agreement.activatedAt,
        user: "system",
        description: "Agreement activated"
      });
    }

    // Agreement termination
    if (agreement.status === "terminated") {
      timeline.push({
        event: "terminated",
        timestamp: agreement.terminatedAt,
        user: agreement.terminatedBy ? "user" : "system",
        description: "Agreement terminated"
      });
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return { agreement, signatures, timeline };
  }

  /**
   * Generate formatted rental agreement template
   */
  private generateFormattedAgreement(agreement: IAgreement): string {
    console.log('🔍 generateFormattedAgreement called for agreement:', agreement._id);
    
    const landlord = agreement.landlordId as any;
    const tenant = agreement.tenantId as any;
    const property = agreement.propertyId as any;
    
    console.log('🔍 Landlord data:', landlord);
    console.log('🔍 Tenant data:', tenant);
    console.log('🔍 Property data:', property);
    
    const landlordName = `${landlord.firstName} ${landlord.lastName}`;
    const tenantName = `${tenant.firstName} ${tenant.lastName}`;
    const propertyTitle = property.title || 'Property';
    
    // Handle address object properly
    let propertyAddress = 'Address not specified';
    if (property.address) {
      if (typeof property.address === 'string') {
        propertyAddress = property.address;
      } else if (typeof property.address === 'object') {
        const addr = property.address;
        propertyAddress = `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.postalCode || ''}, ${addr.country || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '');
      }
    }
    
    const startDate = new Date(agreement.startDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const endDate = new Date(agreement.endDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const createdDate = new Date(agreement.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const rentAmount = agreement.rentAmount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
    
    const depositAmount = agreement.depositAmount ? agreement.depositAmount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    }) : 'No deposit required';
    
    const paymentSchedule = agreement.paymentSchedule || {
      frequency: 'monthly',
      dueDay: 1,
      lateFee: 0,
      gracePeriod: 5
    };
    const paymentFrequency = paymentSchedule.frequency;
    const dueDay = paymentSchedule.dueDay;
    const lateFee = paymentSchedule.lateFee;
    const gracePeriod = paymentSchedule.gracePeriod;
    
    const utilitiesIncluded = agreement.utilitiesIncluded ? 'Yes' : 'No';
    const utilitiesList = agreement.utilitiesList.length > 0 ? agreement.utilitiesList.join(', ') : 'None specified';
    
    const maintenanceIncluded = agreement.maintenanceIncluded ? 'Yes' : 'No';
    
    const protection = agreement.khayalamiProtection || {
      enabled: false,
      planType: 'basic',
      monthlyFee: 0,
      coverage: []
    };
    
    const khayalamiProtection = protection.enabled ? 
      `Yes (${protection.planType} plan - $${protection.monthlyFee}/month)` : 
      'No';
    
    const protectionCoverage = protection.coverage.length > 0 ? 
      protection.coverage.join(', ') : 
      'None specified';
    
    const terms = agreement.terms.length > 0 ? agreement.terms : [
      'Tenant shall pay rent on time',
      'Tenant shall maintain the property in good condition',
      'Tenant shall not sublet without written permission',
      'Landlord shall provide necessary maintenance'
    ];
    
    const specialConditions = agreement.specialConditions.length > 0 ? 
      agreement.specialConditions : 
      ['No special conditions specified'];
    
    const formattedAgreement = `
RENTAL AGREEMENT

This is a rental agreement between ${landlordName} (Landlord) and ${tenantName} (Tenant) for the property located at ${propertyAddress}.

AGREEMENT DETAILS:
- Property: ${propertyTitle}
- Address: ${propertyAddress}
- Agreement Type: ${agreement.type.charAt(0).toUpperCase() + agreement.type.slice(1)} Agreement
- Status: ${agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
- Created Date: ${createdDate}
- Start Date: ${startDate}
- End Date: ${endDate}
- Duration: ${Math.ceil((new Date(agreement.endDate).getTime() - new Date(agreement.startDate).getTime()) / (1000 * 60 * 60 * 24))} days

RENTAL TERMS:
- Monthly Rent: ${rentAmount}
- Deposit Amount: ${depositAmount}
- Zero Deposit Option: ${agreement.zeroDeposit ? 'Yes' : 'No'}
- Payment Frequency: ${paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1)}
- Payment Due Day: ${dueDay}${dueDay === 1 ? 'st' : dueDay === 2 ? 'nd' : dueDay === 3 ? 'rd' : 'th'} of each ${paymentFrequency.slice(0, -2)}
- Late Fee: $${lateFee}
- Grace Period: ${gracePeriod} days

UTILITIES AND SERVICES:
- Utilities Included: ${utilitiesIncluded}
- Utilities List: ${utilitiesList}
- Maintenance Included: ${maintenanceIncluded}

KHAYALAMI PROTECTION PLAN:
- Protection Plan: ${khayalamiProtection}
- Coverage: ${protectionCoverage}

LANDLORD INFORMATION:
- Name: ${landlordName}
- Email: ${landlord.email}
- Phone: ${landlord.phone || 'Not provided'}

TENANT INFORMATION:
- Name: ${tenantName}
- Email: ${tenant.email}
- Phone: ${tenant.phone || 'Not provided'}

STANDARD TERMS AND CONDITIONS:
${terms.map((term, index) => `${index + 1}. ${term}`).join('\n')}

SPECIAL CONDITIONS:
${specialConditions.map((condition, index) => `${index + 1}. ${condition}`).join('\n')}

SIGNATURES:
- Landlord Signature: ${agreement.landlordSignature?.signedAt ? 
    `Signed on ${new Date(agreement.landlordSignature.signedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}` : 
    'Not signed yet'}
- Tenant Signature: ${agreement.tenantSignature?.signedAt ? 
    `Signed on ${new Date(agreement.tenantSignature.signedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}` : 
    'Not signed yet'}

AGREEMENT STATUS:
- Current Status: ${agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
- Signed Date: ${agreement.signedAt ? new Date(agreement.signedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'Not signed yet'}
- Activated Date: ${agreement.activatedAt ? new Date(agreement.activatedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'Not activated yet'}

This agreement is legally binding once signed by both parties. Please review all terms and conditions carefully before signing.

Generated on ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })} by Khayalami Platform.
    `.trim();
    
    console.log('🔍 Generated formatted agreement preview:', formattedAgreement.substring(0, 200) + '...');
    console.log('🔍 Formatted agreement total length:', formattedAgreement.length);
    
    return formattedAgreement;
  }

  /**
   * When both parties have signed, mark agreement executed and create rental (fee may still be deferred).
   */
  private async completeAgreementIfBothSigned(
    agreement: IAgreement,
    agreementId: string
  ): Promise<void> {
    const { Signature } = await import("../models/Signature");
    const [landlordSig, tenantSig] = await Promise.all([
      Signature.findOne({ agreementId, userRole: "landlord", isActive: { $ne: false } }),
      Signature.findOne({ agreementId, userRole: "tenant", isActive: { $ne: false } }),
    ]);

    if (!landlordSig || !tenantSig) return;

    if (!agreement.landlordSignature?.signedAt) {
      agreement.landlordSignature = {
        signedAt: landlordSig.signedAt,
        signatureUrl: landlordSig.signatureUrl || undefined,
        ipAddress: landlordSig.ipAddress,
      } as any;
    }
    if (!agreement.tenantSignature?.signedAt) {
      agreement.tenantSignature = {
        signedAt: tenantSig.signedAt,
        signatureUrl: tenantSig.signatureUrl || undefined,
        ipAddress: tenantSig.ipAddress,
        paymentStatus: agreement.tenantSignature?.paymentStatus || "deferred",
      } as any;
    }

    const wasAlreadyExecuted =
      agreement.status === "signed" || agreement.status === "active";

    if (!wasAlreadyExecuted) {
      agreement.status = "signed";
      agreement.signedAt = new Date();
    }

    // Persist signatures + status before rental (createRentalFromAgreement re-reads from DB)
    await agreement.save();

    if (!wasAlreadyExecuted) {
      try {
        const { rentalService } = await import("./RentalService");
        await rentalService.createRentalFromAgreement(agreementId);
        console.log(`✅ Rental auto-created for agreement: ${agreementId}`);
      } catch (error: any) {
        console.error(`❌ Failed to auto-create rental: ${error.message}`);
      }

      const propertyIdStr = this.refIdString(agreement.propertyId);
      await this.notifyAgreementFullyExecuted(agreement, propertyIdStr);
    }
  }

  /**
   * Normalize Mongo ObjectId / populated doc → id string (safe for notify + User.findById).
   */
  private refIdString(ref: unknown): string {
    if (!ref) return "";
    if (typeof ref === "string") return ref;
    const doc = ref as { _id?: { toString(): string }; id?: string; toString?: () => string };
    if (doc._id) return doc._id.toString();
    if (doc.id) return doc.id;
    return String(ref);
  }

  /**
   * Landlord + tenant informed; admins notified when agreement is fully executed.
   */
  private async notifyAgreementFullyExecuted(
    agreement: IAgreement,
    propertyIdStr: string
  ): Promise<void> {
    const agreementId = agreement._id.toString();
    const title = agreement.title;
    const landlordIdStr = this.refIdString(agreement.landlordId);
    const tenantIdStr = this.refIdString(agreement.tenantId);
    const completionMessage = `All parties have signed "${title}".`;

    await this.sendAgreementNotification({
      type: "signed",
      signPhase: "completed",
      recipientId: landlordIdStr,
      recipientRole: "landlord",
      message: completionMessage,
      agreementId,
      propertyId: propertyIdStr,
    });

    await this.sendAgreementNotification({
      type: "signed",
      signPhase: "completed",
      recipientId: tenantIdStr,
      recipientRole: "tenant",
      message: completionMessage,
      agreementId,
      propertyId: propertyIdStr,
    });

    const { appNotificationService } = await import("./AppNotificationService");
    await appNotificationService.notifyAdmins(() => ({
      type: "agreement_completed",
      title: "Agreement fully executed",
      body: `${title} — landlord and tenant have both signed.`,
      data: { agreementId, propertyId: propertyIdStr },
    }));
  }

  /**
   * Send agreement notification (email + in-app + realtime socket)
   */
  private async sendAgreementNotification(notification: AgreementNotification): Promise<void> {
    try {
      const recipientUserId = this.refIdString(notification.recipientId);
      const propertyIdStr = this.refIdString(notification.propertyId);

      const user = await User.findById(recipientUserId);
      if (!user) {
        console.warn(`User ${recipientUserId} not found`);
        return;
      }

      const { emailNotificationService } = await import("./EmailNotificationService");
      const agreement = await Agreement.findById(notification.agreementId)
        .populate("propertyId", "title address")
        .populate("landlordId", "firstName lastName")
        .populate("tenantId", "firstName lastName");

      if (!agreement) {
        console.warn(`Agreement ${notification.agreementId} not found`);
        return;
      }

      const property = agreement.propertyId as any;
      const landlord = agreement.landlordId as any;
      const tenant = agreement.tenantId as any;

      if (user.email && notification.type === "created") {
        await emailNotificationService.sendAgreementCreated({
          recipientEmail: user.email,
          recipientName: `${user.firstName} ${user.lastName}`,
          recipientRole: notification.recipientRole,
          agreementTitle: agreement.title,
          propertyTitle: property?.title || property?.address || "Property",
          landlordName: landlord ? `${landlord.firstName} ${landlord.lastName}` : "Landlord",
          tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : "Tenant",
          agreementId: agreement._id.toString(),
          startDate: agreement.startDate,
          endDate: agreement.endDate,
          rentAmount: agreement.rentAmount
        });
      } else if (notification.type !== "created") {
        console.log(`Agreement Notification: ${notification.type}`, {
          recipientId: recipientUserId,
          recipientRole: notification.recipientRole,
          signPhase: notification.signPhase,
          message: notification.message,
          agreementId: notification.agreementId,
          propertyId: propertyIdStr
        });
      }

      const { appNotificationService } = await import("./AppNotificationService");

      let inAppType: "agreement_created" | "agreement_signed" | "agreement_completed";
      let title: string;

      if (notification.signPhase === "completed") {
        inAppType = "agreement_signed";
        title = "Agreement fully executed";
      } else if (notification.type === "signed" || notification.signPhase === "party") {
        inAppType = "agreement_signed";
        if (notification.signedByRole === "landlord") {
          title = "Landlord signed — your turn";
        } else if (notification.signedByRole === "tenant") {
          title = "Tenant signed — your turn";
        } else {
          title = "Agreement signed";
        }
      } else if (notification.type === "created" || notification.type === "sent_for_review") {
        inAppType = "agreement_created";
        title =
          notification.type === "sent_for_review"
            ? "Agreement ready for review"
            : "New agreement";
      } else {
        inAppType = "agreement_signed";
        title = "Agreement update";
      }

      await appNotificationService.notify({
        userId: recipientUserId,
        type: inAppType,
        title,
        body: notification.message,
        data: {
          agreementId: notification.agreementId,
          propertyId: propertyIdStr,
          senderId: notification.senderId,
          signedByRole: notification.signedByRole,
          signPhase: notification.signPhase,
        },
      });
    } catch (error: any) {
      console.error("Error sending agreement notification:", error);
      // Don't throw - notification failure shouldn't break agreement flows
    }
  }

  /**
   * Validate agreement data
   */
  validateAgreementData(data: CreateAgreementData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.propertyId) errors.push("Property ID is required");
    if (!data.tenantId) errors.push("Tenant ID is required");
    if (!data.title) errors.push("Title is required");
    if (!data.startDate) errors.push("Start date is required");
    if (!data.endDate) errors.push("End date is required");
    if (!data.rentAmount || data.rentAmount <= 0) errors.push("Valid rent amount is required");

    if (data.startDate && data.endDate && data.startDate >= data.endDate) {
      errors.push("Start date must be before end date");
    }

    if (data.rentAmount && data.rentAmount < 0) {
      errors.push("Rent amount cannot be negative");
    }

    if (data.depositAmount && data.depositAmount < 0) {
      errors.push("Deposit amount cannot be negative");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Activate agreement (system function)
   */
  async activateAgreement(agreementId: string): Promise<IAgreement> {
    const agreement = await Agreement.findById(agreementId);

    if (!agreement) {
      throw new Error("Agreement not found");
    }

    if (agreement.status !== "signed") {
      throw new Error("Only signed agreements can be activated");
    }

    const now = new Date();
    if (now < agreement.startDate) {
      throw new Error("Agreement cannot be activated before start date");
    }

    agreement.status = "active";
    agreement.activatedAt = now;
    await agreement.save();

    // Send notifications to both parties
    await this.sendAgreementNotification({
      type: "activated",
      recipientId: agreement.landlordId.toString(),
      recipientRole: "landlord",
      message: `Agreement activated: ${agreement.title}`,
      agreementId: agreement._id.toString(),
      propertyId: agreement.propertyId.toString()
    });

    await this.sendAgreementNotification({
      type: "activated",
      recipientId: agreement.tenantId.toString(),
      recipientRole: "tenant",
      message: `Agreement activated: ${agreement.title}`,
      agreementId: agreement._id.toString(),
      propertyId: agreement.propertyId.toString()
    });

    return agreement;
  }

  /**
   * Get pending agreements for user
   */
  async getPendingAgreements(userId: string, userRole: string): Promise<IAgreement[]> {
    const query: any = { status: "pending" };
    
    if (userRole === "landlord") {
      query.landlordId = userId;
    } else if (userRole === "tenant") {
      query.tenantId = userId;
    } else {
      throw new Error("Invalid user role");
    }

    const agreements = await Agreement.find(query)
      .populate("propertyId", "title address images")
      .populate("landlordId", "firstName lastName email phone")
      .populate("tenantId", "firstName lastName email phone")
      .sort({ createdAt: -1 });

    // Add formatted agreement to each agreement
    const agreementsWithFormatted = agreements.map(agreement => {
      try {
        const formattedAgreement = this.generateFormattedAgreement(agreement);
        const agreementObj = agreement.toObject();
        agreementObj.formattedAgreement = formattedAgreement;
        return agreementObj;
      } catch (error) {
        console.error('❌ Error generating formatted agreement for agreement:', agreement._id, error);
        const agreementObj = agreement.toObject();
        agreementObj.formattedAgreement = 'Error generating formatted agreement';
        return agreementObj;
      }
    });

    return agreementsWithFormatted;
  }

  /**
   * Get active agreements for user
   */
  async getActiveAgreements(userId: string, userRole: string): Promise<IAgreement[]> {
    const query: any = { status: "active" };
    
    if (userRole === "landlord") {
      query.landlordId = userId;
    } else if (userRole === "tenant") {
      query.tenantId = userId;
    } else {
      throw new Error("Invalid user role");
    }

    const agreements = await Agreement.find(query)
      .populate("propertyId", "title address images")
      .populate("landlordId", "firstName lastName email phone")
      .populate("tenantId", "firstName lastName email phone")
      .sort({ activatedAt: -1 });

    // Add formatted agreement to each agreement
    const agreementsWithFormatted = agreements.map(agreement => {
      try {
        const formattedAgreement = this.generateFormattedAgreement(agreement);
        const agreementObj = agreement.toObject();
        agreementObj.formattedAgreement = formattedAgreement;
        return agreementObj;
      } catch (error) {
        console.error('❌ Error generating formatted agreement for agreement:', agreement._id, error);
        const agreementObj = agreement.toObject();
        agreementObj.formattedAgreement = 'Error generating formatted agreement';
        return agreementObj;
      }
    });

    return agreementsWithFormatted;
  }

  /**
   * Admin: Get all agreements in the system
   */
  async getAllAgreements(
    filters?: {
      status?: string;
      landlordId?: string;
      tenantId?: string;
      propertyId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<IAgreement[]> {
    const query: any = {};
    
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.landlordId) {
      query.landlordId = new Types.ObjectId(filters.landlordId);
    }
    if (filters?.tenantId) {
      query.tenantId = new Types.ObjectId(filters.tenantId);
    }
    if (filters?.propertyId) {
      query.propertyId = new Types.ObjectId(filters.propertyId);
    }
    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }
    
    const agreements = await Agreement.find(query)
      .populate("landlordId", "firstName lastName email phoneNumber")
      .populate("tenantId", "firstName lastName email phoneNumber")
      .populate("propertyId", "title address")
      .sort({ createdAt: -1 });
    
    return agreements;
  }
}

export const agreementService = new AgreementService(); 
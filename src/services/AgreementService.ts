// @ts-nocheck
import { Agreement, IAgreement } from "../models/Agreement";
import { User } from "../models/User";
import { Property } from "../models/Property";
import { AgreementTemplate, IAgreementTemplate } from "../models/AgreementTemplate";
import { Signature, ISignature } from "../models/Signature";
import { Types } from "mongoose";
import crypto from "crypto";

export interface CreateAgreementData {
  propertyId: string;
  landlordId: string;
  tenantId: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  rentAmount: number;
  depositAmount?: number;
  zeroDeposit?: boolean;
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
}

export class AgreementService {
  
  /**
   * Create a new agreement (landlord only)
   */
  async createAgreement(data: CreateAgreementData): Promise<IAgreement> {
    // Validate that the creator is a landlord
    const landlord = await User.findById(data.landlordId);
    if (!landlord || landlord.role !== "landlord") {
      throw new Error("Only landlords can create agreements");
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

    // Create the agreement
    const agreement = new Agreement({
      ...data,
      status: "draft",
      type: "tenancy",
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

    // Send notification to tenant
    await this.sendAgreementNotification({
      type: "created",
      recipientId: data.tenantId,
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

    // Generate formatted rental agreement template
    console.log('🔍 Starting formatted agreement generation for agreement:', agreement._id);
    try {
      const formattedAgreement = this.generateFormattedAgreement(agreement);
      console.log('📝 Generated formatted agreement length:', formattedAgreement.length);
      
      // Convert Mongoose document to plain object and add formatted agreement
      const agreementObj = agreement.toObject();
      agreementObj.formattedAgreement = formattedAgreement;
      
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
        agreement.tenantSignature = {
          signedAt: existingSignature.signedAt,
          signatureUrl: existingSignature.signatureUrl || undefined,
          ipAddress: existingSignature.ipAddress
        } as any;
      }
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

    // Update agreement with signature (store URL when available)
    if (userRole === "landlord") {
      agreement.landlordSignature = {
        signedAt: signature.signedAt,
        signatureUrl: signature.signatureUrl || undefined,
        ipAddress: signature.ipAddress
      } as any;
    } else {
      agreement.tenantSignature = {
        signedAt: signature.signedAt,
        signatureUrl: signature.signatureUrl || undefined,
        ipAddress: signature.ipAddress
      } as any;
    }

    // Check if both parties have signed
    const landlordSignature = await Signature.findOne({ agreementId, userRole: "landlord" });
    const tenantSignature = await Signature.findOne({ agreementId, userRole: "tenant" });

    if (landlordSignature && tenantSignature) {
      agreement.status = "signed";
      agreement.signedAt = new Date();
      
      // Send notifications to both parties
      await this.sendAgreementNotification({
        type: "signed",
        recipientId: ((agreement.landlordId as any)?._id ?? agreement.landlordId)?.toString(),
        recipientRole: "landlord",
        message: `Agreement signed by tenant: ${agreement.title}`,
        agreementId: agreement._id.toString(),
        propertyId: ((agreement.propertyId as any)?._id ?? agreement.propertyId)?.toString()
      });

      await this.sendAgreementNotification({
        type: "signed",
        recipientId: ((agreement.tenantId as any)?._id ?? agreement.tenantId)?.toString(),
        recipientRole: "tenant",
        message: `Agreement signed by landlord: ${agreement.title}`,
        agreementId: agreement._id.toString(),
        propertyId: ((agreement.propertyId as any)?._id ?? agreement.propertyId)?.toString()
      });
    } else {
      // Send notification to the other party
      const otherPartyId = (userRole === "landlord"
        ? ((agreement.tenantId as any)?._id ?? agreement.tenantId)
        : ((agreement.landlordId as any)?._id ?? agreement.landlordId)
      )?.toString();
      const otherPartyRole = userRole === "landlord" ? "tenant" : "landlord";
      
      await this.sendAgreementNotification({
        type: "signed",
        recipientId: otherPartyId,
        recipientRole: otherPartyRole,
        message: `Agreement signed by ${userRole}: ${agreement.title}`,
        agreementId: agreement._id.toString(),
        propertyId: agreement.propertyId.toString()
      });
    }

    await agreement.save();
    return agreement;
  }

  /**
   * Terminate agreement (both landlord and tenant)
   */
  async terminateAgreement(agreementId: string, userId: string, userRole: string, reason: string): Promise<IAgreement> {
    const agreement = await Agreement.findById(agreementId)
      .populate("propertyId", "title")
      .populate("landlordId", "firstName lastName email")
      .populate("tenantId", "firstName lastName email");

    if (!agreement) {
      throw new Error("Agreement not found");
    }

    // Check if user is authorized to terminate
    if (userRole === "landlord" && agreement.landlordId.toString() !== userId) {
      throw new Error("Only the landlord can terminate this agreement");
    }
    if (userRole === "tenant" && agreement.tenantId.toString() !== userId) {
      throw new Error("Only the tenant can terminate this agreement");
    }

    if (agreement.status === "terminated") {
      throw new Error("Agreement is already terminated");
    }

    // Update agreement status
    agreement.status = "terminated";
    agreement.terminatedAt = new Date();
    agreement.terminationReason = reason;
    agreement.terminatedBy = userId;

    await agreement.save();

    // Send notification to the other party
    const otherPartyId = userRole === "landlord" ? agreement.tenantId.toString() : agreement.landlordId.toString();
    const otherPartyRole = userRole === "landlord" ? "tenant" : "landlord";

    await this.sendAgreementNotification({
      type: "terminated",
      recipientId: otherPartyId,
      recipientRole: otherPartyRole,
      message: `Agreement terminated by ${userRole}: ${agreement.title}`,
      agreementId: agreement._id.toString(),
      propertyId: agreement.propertyId.toString()
    });

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
   * Create agreement from template (landlord only)
   */
  async createAgreementFromTemplate(data: CreateAgreementFromTemplateData): Promise<IAgreement> {
    // Validate template
    const template = await this.getAgreementTemplate(data.templateId);
    
    // Validate landlord
    const landlord = await User.findById(data.landlordId);
    if (!landlord || landlord.role !== "landlord") {
      throw new Error("Only landlords can create agreements");
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
   * Send agreement notification
   */
  private async sendAgreementNotification(notification: AgreementNotification): Promise<void> {
    // This would integrate with a notification service (email, SMS, push)
    // For now, we'll just log the notification
    console.log(`Agreement Notification: ${notification.type}`, {
      recipientId: notification.recipientId,
      recipientRole: notification.recipientRole,
      message: notification.message,
      agreementId: notification.agreementId,
      propertyId: notification.propertyId
    });

    // TODO: Integrate with notification service
    // await notificationService.send(notification);
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
}

export const agreementService = new AgreementService(); 
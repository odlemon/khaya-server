// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { agreementService, CreateAgreementData, SignatureData } from "../services/AgreementService";
import { paymentGatewayService } from "../services/PaymentGatewayService";
import { buildGatewayPaymentFields } from "../utils/paymentGatewayFields";
import { Payment } from "../models/Payment";
import { Types } from "mongoose";

export class AgreementController {

  /**
   * Get connected landlords and tenants for agreement creation (admin only)
   * Returns structured data for frontend selection
   */
  async getConnectedParties(req: Request, res: Response, next: NextFunction) {
    try {
      const userRole = (req as any).user.role;

      if (userRole !== "admin") {
        return res.status(403).json({ 
          success: false, 
          message: "Only admins can access this endpoint" 
        });
      }

      const { Connection } = await import("../models/Connection");
      const { User } = await import("../models/User");
      const { Property } = await import("../models/Property");
      const { Types } = await import("mongoose");

      // Get all accepted connections
      const connections = await Connection.find({
        status: "accepted",
        isActive: true
      })
        .populate("landlordId", "firstName lastName email phone")
        .populate("tenantId", "firstName lastName email phone")
        .populate("propertyId", "title address")
        .sort({ createdAt: -1 });

      // Structure data: Group by landlord -> property -> tenants
      const structuredData: any = {
        landlords: [],
        tenants: [],
        connections: []
      };

      // Map to track unique landlords and tenants
      const landlordMap = new Map();
      const tenantMap = new Map();
      const propertyMap = new Map();

      connections.forEach((conn: any) => {
        const landlord = conn.landlordId;
        const tenant = conn.tenantId;
        const property = conn.propertyId;

        if (!landlord || !tenant || !property) return;

        const landlordId = landlord._id.toString();
        const tenantId = tenant._id.toString();
        const propertyId = property._id.toString();

        // Add landlord if not exists
        if (!landlordMap.has(landlordId)) {
          landlordMap.set(landlordId, {
            id: landlordId,
            firstName: landlord.firstName,
            lastName: landlord.lastName,
            fullName: `${landlord.firstName} ${landlord.lastName}`,
            email: landlord.email,
            phone: landlord.phone,
            properties: []
          });
        }

        // Add tenant if not exists
        if (!tenantMap.has(tenantId)) {
          tenantMap.set(tenantId, {
            id: tenantId,
            firstName: tenant.firstName,
            lastName: tenant.lastName,
            fullName: `${tenant.firstName} ${tenant.lastName}`,
            email: tenant.email,
            phone: tenant.phone
          });
        }

        // Add property to landlord if not exists
        const landlordData = landlordMap.get(landlordId);
        if (!propertyMap.has(`${landlordId}-${propertyId}`)) {
          propertyMap.set(`${landlordId}-${propertyId}`, true);
          landlordData.properties.push({
            id: propertyId,
            title: property.title || "Untitled Property",
            address: property.address || "No address",
            tenants: []
          });
        }

        // Add tenant to property
        const propertyData = landlordData.properties.find((p: any) => p.id === propertyId);
        if (propertyData && !propertyData.tenants.find((t: any) => t.id === tenantId)) {
          propertyData.tenants.push({
            id: tenantId,
            firstName: tenant.firstName,
            lastName: tenant.lastName,
            fullName: `${tenant.firstName} ${tenant.lastName}`,
            email: tenant.email,
            phone: tenant.phone
          });
        }

        // Add connection entry
        structuredData.connections.push({
          connectionId: conn._id.toString(),
          landlordId: landlordId,
          landlordName: `${landlord.firstName} ${landlord.lastName}`,
          tenantId: tenantId,
          tenantName: `${tenant.firstName} ${tenant.lastName}`,
          propertyId: propertyId,
          propertyTitle: property.title || "Untitled Property",
          connectedAt: conn.createdAt
        });
      });

      // Convert maps to arrays
      structuredData.landlords = Array.from(landlordMap.values());
      structuredData.tenants = Array.from(tenantMap.values());

      res.status(200).json({
        success: true,
        message: "Connected parties retrieved successfully",
        data: structuredData
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create a new agreement (admin only)
   */
  async createAgreement(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "admin") {
        return res.status(403).json({ 
          success: false, 
          message: "Only admins can create agreements" 
        });
      }

      // Admin creates agreement, but landlordId and tenantId must be provided in body
      if (!req.body.landlordId) {
        return res.status(400).json({
          success: false,
          message: "landlordId is required"
        });
      }

      if (!req.body.tenantId) {
        return res.status(400).json({
          success: false,
          message: "tenantId is required"
        });
      }

      const agreementData: CreateAgreementData = {
        ...req.body,
        // landlordId and tenantId come from request body, not from admin user
      };

      // Validate agreement data
      const validation = agreementService.validateAgreementData(agreementData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid agreement data",
          errors: validation.errors
        });
      }

      const agreement = await agreementService.createAgreement(agreementData);

      res.status(201).json({
        success: true,
        message: "Agreement created successfully",
        data: agreement
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get user's agreements
   */
  async getUserAgreements(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { status } = req.query;

      const agreements = await agreementService.getUserAgreements(
        userId, 
        userRole, 
        status as string
      );

      res.status(200).json({
        success: true,
        data: agreements
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get agreements for landlord
   */
  async getLandlordAgreements(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { status } = req.query;

      const agreements = await agreementService.getUserAgreements(
        userId,
        "landlord",
        status as string
      );

      res.status(200).json({
        success: true,
        data: agreements
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get agreements for tenant
   */
  async getTenantAgreements(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { status } = req.query;

      const agreements = await agreementService.getUserAgreements(
        userId,
        "tenant",
        status as string
      );

      res.status(200).json({
        success: true,
        data: agreements
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get pending agreements for user
   */
  async getPendingAgreements(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      const agreements = await agreementService.getPendingAgreements(userId, userRole);

      res.status(200).json({
        success: true,
        data: agreements
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get active agreements for user
   */
  async getActiveAgreements(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      const agreements = await agreementService.getActiveAgreements(userId, userRole);

      res.status(200).json({
        success: true,
        data: agreements
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get a specific agreement by ID
   */
  async getAgreementById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      const agreement = await agreementService.getAgreementById(id, userId, userRole);

      console.log('🔍 Controller - Agreement keys before sending response:', Object.keys(agreement.toObject ? agreement.toObject() : agreement));
      console.log('🔍 Controller - Has formattedAgreement field:', 'formattedAgreement' in agreement);

      res.status(200).json({
        success: true,
        data: agreement
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update agreement (landlord only)
   */
  async updateAgreement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "landlord") {
        return res.status(403).json({
          success: false,
          message: "Only landlords can update agreements"
        });
      }

      const agreement = await agreementService.updateAgreement(id, userId, req.body);

      res.status(200).json({
        success: true,
        message: "Agreement updated successfully",
        data: agreement
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete agreement (landlord only)
   */
  async deleteAgreement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "landlord") {
        return res.status(403).json({
          success: false,
          message: "Only landlords can delete agreements"
        });
      }

      await agreementService.deleteAgreement(id, userId);

      res.status(200).json({
        success: true,
        message: "Agreement deleted successfully"
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Send agreement for review (landlord only)
   */
  async sendForReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "landlord") {
        return res.status(403).json({
          success: false,
          message: "Only landlords can send agreements for review"
        });
      }

      const agreement = await agreementService.sendForReview(id, userId);

      res.status(200).json({
        success: true,
        message: "Agreement sent for review successfully",
        data: agreement
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Sign agreement (both landlord and tenant)
   */
  async signAgreement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      // Auto-capture IP and User-Agent; client only needs to send signatureUrl
      const ipHeader = (req.headers["x-forwarded-for"] as string) || "";
      const ipCandidate = ipHeader.split(",")[0].trim();
      const ipAddress = ipCandidate || (req as any).ip || (req.connection as any)?.remoteAddress || "0.0.0.0";
      const userAgent = req.get("user-agent") || "unknown";

      const signatureData: SignatureData = {
        ...req.body, // expect signatureUrl or legacy signatureData
        ipAddress,
        userAgent
      } as any;

      const agreement = await agreementService.signAgreement(id, userId, userRole, signatureData);

      res.status(200).json({
        success: true,
        message: "Agreement signed successfully",
        data: agreement
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Request termination (Step 1: First party requests termination)
   */
  async requestTermination(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { reason, terminationDate, notes } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "Termination reason is required"
        });
      }

      if (!terminationDate) {
        return res.status(400).json({
          success: false,
          message: "Termination date is required"
        });
      }

      const agreement = await agreementService.requestTermination(id, userId, userRole, {
        reason,
        terminationDate: new Date(terminationDate),
        notes
      });

      res.status(200).json({
        success: true,
        message: "Termination request sent successfully. Waiting for other party to confirm.",
        data: agreement
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Confirm termination (Step 2: Other party confirms termination)
   */
  async confirmTermination(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      const agreement = await agreementService.confirmTermination(id, userId, userRole);

      res.status(200).json({
        success: true,
        message: "Agreement terminated successfully",
        data: agreement
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Reject termination request
   */
  async rejectTermination(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { rejectionReason } = req.body;

      const agreement = await agreementService.rejectTermination(id, userId, userRole, rejectionReason);

      res.status(200).json({
        success: true,
        message: "Termination request rejected",
        data: agreement
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Cancel termination request (requester cancels their own request)
   */
  async cancelTerminationRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      const agreement = await agreementService.cancelTerminationRequest(id, userId, userRole);

      res.status(200).json({
        success: true,
        message: "Termination request cancelled",
        data: agreement
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Terminate agreement (both landlord and tenant) - DEPRECATED
   * @deprecated Use requestTermination and confirmTermination instead
   */
  async terminateAgreement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "Termination reason is required"
        });
      }

      const agreement = await agreementService.terminateAgreement(id, userId, userRole, reason);

      res.status(200).json({
        success: true,
        message: "Agreement terminated successfully",
        data: agreement
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Upload attachment to agreement (both landlord and tenant)
   */
  async uploadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { name, url, type } = req.body;

      if (!name || !url || !type) {
        return res.status(400).json({
          success: false,
          message: "Name, URL, and type are required for attachments"
        });
      }

      const agreement = await agreementService.uploadAttachment(id, userId, userRole, {
        name,
        url,
        type
      });

      res.status(200).json({
        success: true,
        message: "Attachment uploaded successfully",
        data: agreement
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get agreement statistics
   */
  async getAgreementStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      const stats = await agreementService.getAgreementStats(userId, userRole);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Download agreement PDF via public token (no auth).
   */
  async downloadPublicAgreementPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      const agreement = await agreementService.getAgreementByPublicPdfToken(token);
      const { buildAgreementPdfBuffer, getAgreementPdfFilename } = await import("../services/AgreementPdfService");
      const buffer = await buildAgreementPdfBuffer(agreement);
      const filename = getAgreementPdfFilename(agreement);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      if (error.message === "Agreement not found") {
        return res.status(404).json({ success: false, message: "Agreement not found" });
      }
      next(error);
    }
  }

  /**
   * Generate agreement PDF (authenticated — streams file)
   */
  async generateAgreementPDF(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      await agreementService.getAgreementById(id, userId, userRole);

      const { buffer, filename } = await agreementService.buildAgreementPdfBytes(id);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get agreement templates
   */
  async getAgreementTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const { category } = req.query;

      const templates = await agreementService.getAgreementTemplates(category as string);

      res.status(200).json({
        success: true,
        data: templates
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get specific agreement template
   */
  async getAgreementTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const template = await agreementService.getAgreementTemplate(id);

      res.status(200).json({
        success: true,
        data: template
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create agreement from template (admin only)
   */
  async createAgreementFromTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only admins can create agreements from templates"
        });
      }

      // Admin creates agreement, but landlordId and tenantId must be provided in body
      if (!req.body.landlordId) {
        return res.status(400).json({
          success: false,
          message: "landlordId is required"
        });
      }

      if (!req.body.tenantId) {
        return res.status(400).json({
          success: false,
          message: "tenantId is required"
        });
      }

      const agreementData = {
        ...req.body,
        // landlordId and tenantId come from request body, not from admin user
      };

      const agreement = await agreementService.createAgreementFromTemplate(agreementData);

      res.status(201).json({
        success: true,
        message: "Agreement created from template successfully",
        data: agreement
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Generate agreement Word document from template (admin only)
   */
  async generateAgreementWordDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const userRole = (req as any).user.role;
      
      if (userRole !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only admins can generate agreement documents"
        });
      }
      
      const { id } = req.params;
      const { templatePath, outputPath } = req.body;
      
      const { agreementWordTemplateService } = await import("../services/AgreementWordTemplateService");
      const { User } = await import("../models/User");
      const { Property } = await import("../models/Property");
      
      // Get agreement with populated fields
      const agreement = await agreementService.getAgreementById(id);
      if (!agreement) {
        return res.status(404).json({
          success: false,
          message: "Agreement not found"
        });
      }
      
      // Get landlord, tenant, and property
      const landlord = await User.findById(agreement.landlordId);
      const tenant = await User.findById(agreement.tenantId);
      const property = await Property.findById(agreement.propertyId);
      
      if (!landlord || !tenant || !property) {
        return res.status(404).json({
          success: false,
          message: "Landlord, tenant, or property not found"
        });
      }
      
      // Generate document
      const { buffer, filePath } = await agreementWordTemplateService.generateAndSave(
        agreement,
        landlord,
        tenant,
        property,
        templatePath,
        outputPath
      );
      
      // Return file or send as download
      if (req.query.download === 'true') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="agreement-${id}.docx"`);
        return res.send(buffer);
      }
      
      res.status(200).json({
        success: true,
        message: "Agreement document generated successfully",
        data: {
          agreementId: id,
          filePath: filePath,
          downloadUrl: `/api/agreements/${id}/document/download`
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get agreement signatures
   */
  async getAgreementSignatures(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      // Verify user has access to this agreement
      await agreementService.getAgreementById(id, userId, userRole);

      const signatures = await agreementService.getAgreementSignatures(id);

      res.status(200).json({
        success: true,
        data: signatures
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Verify signature
   */
  async verifySignature(req: Request, res: Response, next: NextFunction) {
    try {
      const { signatureId } = req.params;

      const result = await agreementService.verifySignature(signatureId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get agreement audit trail
   */
  async getAgreementAuditTrail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      // Verify user has access to this agreement
      await agreementService.getAgreementById(id, userId, userRole);

      const auditTrail = await agreementService.getAgreementAuditTrail(id);

      res.status(200).json({
        success: true,
        data: auditTrail
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Activate agreement (system function - for testing)
   */
  async activateAgreement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      // Only landlords can activate agreements
      if (userRole !== "landlord") {
        return res.status(403).json({
          success: false,
          message: "Only landlords can activate agreements"
        });
      }

      const agreement = await agreementService.activateAgreement(id);

      res.status(200).json({
        success: true,
        message: "Agreement activated successfully",
        data: agreement
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Admin: Get all agreements in the system
   */
  async getAllAgreements(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, landlordId, tenantId, propertyId, startDate, endDate } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status as string;
      if (landlordId) filters.landlordId = landlordId as string;
      if (tenantId) filters.tenantId = tenantId as string;
      if (propertyId) filters.propertyId = propertyId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const agreements = await agreementService.getAllAgreements(filters);
      
      res.json({
        success: true,
        data: agreements
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Pay agreement fee online (tenant only)
   */
  async payAgreementFee(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: agreementId } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      // Only tenants can pay agreement fees
      if (userRole !== "tenant") {
        return res.status(403).json({
          success: false,
          message: "Only tenants can pay agreement fees"
        });
      }

      const { amount, notes, phone, mobileMethod } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: "Valid payment amount is required" });
      }

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: "Phone number is required for EcoCash online payments",
        });
      }

      const { Agreement } = await import("../models/Agreement");
      const agreement = await Agreement.findById(agreementId);
      if (!agreement) {
        return res.status(404).json({ success: false, message: "Agreement not found" });
      }

      const reference = paymentGatewayService.generateReference("AFEE", userId.toString());
      const gatewayMeta = { paymentPurpose: "agreement_fee", agreementId };

      const pendingPayment = await Payment.create({
        rentalId: null,
        agreementId: new Types.ObjectId(agreementId),
        propertyId: agreement.propertyId,
        landlordId: agreement.landlordId,
        tenantId: new Types.ObjectId(userId),
        paymentType: "service",
        amount,
        totalAmount: amount,
        paymentMethod: "in_app",
        status: "pending",
        notes: notes || "Agreement fee",
        ...buildGatewayPaymentFields(reference, gatewayMeta),
      });

      const gatewayResult = await paymentGatewayService.initiateMobilePayment({
        reference,
        description: "Agreement fee payment",
        amount,
        phone,
        method: mobileMethod || "ecocash",
      });

      if (!gatewayResult.success) {
        pendingPayment.status = "cancelled";
        pendingPayment.rejectionReason = gatewayResult.error;
        await pendingPayment.save();
        return res.status(400).json({ success: false, message: gatewayResult.error || "Payment initiation failed" });
      }

      if (gatewayResult.pollUrl) {
        pendingPayment.pollUrl = gatewayResult.pollUrl;
        await pendingPayment.save();
      }

      return res.status(201).json({
        success: true,
        message: "Agreement fee payment initiated. Check your phone.",
        data: {
          paymentId: pendingPayment._id,
          reference,
          pollUrl: gatewayResult.pollUrl || null,
          instructions: gatewayResult.instructions,
          statusCheckUrl: `/api/webhooks/payment-status/${pendingPayment._id}`,
          gateway: paymentGatewayService.provider,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const agreementController = new AgreementController(); 
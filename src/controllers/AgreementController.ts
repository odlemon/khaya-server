// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { agreementService, CreateAgreementData, SignatureData } from "../services/AgreementService";

export class AgreementController {

  /**
   * Create a new agreement (landlord only)
   */
  async createAgreement(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "landlord") {
        return res.status(403).json({ 
          success: false, 
          message: "Only landlords can create agreements" 
        });
      }

      const agreementData: CreateAgreementData = {
        ...req.body,
        landlordId: userId
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
   * Terminate agreement (both landlord and tenant)
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
   * Generate agreement PDF
   */
  async generateAgreementPDF(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      // Verify user has access to this agreement
      await agreementService.getAgreementById(id, userId, userRole);

      const pdfUrl = await agreementService.generateAgreementPDF(id);

      res.status(200).json({
        success: true,
        data: { pdfUrl }
      });
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
   * Create agreement from template (landlord only)
   */
  async createAgreementFromTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (userRole !== "landlord") {
        return res.status(403).json({
          success: false,
          message: "Only landlords can create agreements from templates"
        });
      }

      const agreementData = {
        ...req.body,
        landlordId: userId
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
}

export const agreementController = new AgreementController(); 
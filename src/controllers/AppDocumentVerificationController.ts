// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { DocumentVerificationService } from "../services/DocumentVerificationService";
import { User } from "../models/User";

export class AppDocumentVerificationController {
  /**
   * Get user's verification status and documents
   */
  async getVerificationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      
      const status = await DocumentVerificationService.getUserDocumentStatus(userId);

      if (!status) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Verification status retrieved successfully",
        data: {
          userId: status.userId,
          name: status.name,
          email: status.email,
          role: status.role,
          status: status.status,
          documents: status.documents,
          adminFeedback: status.adminFeedback,
          verifiedAt: status.verifiedAt,
          rejectedAt: status.rejectedAt,
          rejectionReason: status.rejectionReason,
          canCreateListings: status.role === "landlord" && status.status === "verified",
          canSendRequests: status.role === "tenant" && status.status === "verified"
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get required documents for tenants
   * Note: employmentLetter is optional
   */
  async getTenantRequiredDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const requiredDocuments = ["idDocument", "payslips", "utilityBills", "bankStatements"];
      const optionalDocuments = ["employmentLetter"];
      const documentDescriptions = {
        idDocument: "Government-issued ID (Passport, National ID, or Driver's License)",
        payslips: "Recent payslips (last 3 months)",
        utilityBills: "Utility bills (electricity, water, internet) in your name",
        bankStatements: "Bank statements (last 3 months)",
        employmentLetter: "Employment verification letter from your employer (optional)"
      };

      res.status(200).json({
        success: true,
        message: "Tenant required documents retrieved successfully",
        data: {
          role: "tenant",
          requiredDocuments,
          optionalDocuments,
          allDocuments: [...requiredDocuments, ...optionalDocuments], // For backward compatibility
          documentDescriptions,
          tips: [
            "Upload clear, readable images of your documents",
            "Ensure all text is visible and not cut off",
            "Documents should be recent (within 3 months for financial documents)",
            "Make sure documents are in your name",
            "Employment letter is optional but recommended"
          ]
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get required documents for landlords
   */
  async getLandlordRequiredDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const requiredDocuments = ["idDocument", "propertyProof", "propertyDocuments"];
      const documentDescriptions = {
        idDocument: "Government-issued ID (Passport, National ID, or Driver's License)",
        propertyProof: "Property ownership documents (title deed, lease agreement, property registration)",
        propertyDocuments: "Additional property documents (insurance, permits, property tax receipts)"
      };

      res.status(200).json({
        success: true,
        message: "Landlord required documents retrieved successfully",
        data: {
          role: "landlord",
          requiredDocuments,
          documentDescriptions,
          tips: [
            "Upload clear, readable images of your documents",
            "Ensure property ownership is clearly documented",
            "Include all relevant property permits and licenses",
            "Documents should be current and valid"
          ]
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Upload tenant document
   */
  async uploadTenantDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { documentType, urls, documentSubType, selfieUrl, selfieWithIdUrl } = req.body;

      if (!documentType || !urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Document type and URLs are required"
        });
      }

      // Validate document type for tenants
      const validTenantDocuments = ["idDocument", "payslips", "utilityBills", "bankStatements", "employmentLetter"];
      
      if (!validTenantDocuments.includes(documentType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid document type for tenant. Allowed types: ${validTenantDocuments.join(", ")}`
        });
      }

      const result = await DocumentVerificationService.uploadDocuments({
        userId,
        documentType,
        urls,
        documentSubType,
        selfieUrl, // Pass selfieUrl to service
        selfieWithIdUrl // Pass selfieWithIdUrl to service
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            documentType,
            uploadedAt: new Date(),
            status: "pending_review",
            nextSteps: this.getTenantNextSteps(documentType)
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Upload landlord document
   */
  async uploadLandlordDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { documentType, urls, documentSubType, selfieUrl, selfieWithIdUrl } = req.body;

      if (!documentType || !urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Document type and URLs are required"
        });
      }

      // Validate document type for landlords
      const validLandlordDocuments = ["idDocument"];
      
      if (!validLandlordDocuments.includes(documentType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid document type for landlord. Allowed types: ${validLandlordDocuments.join(", ")}`
        });
      }

      const result = await DocumentVerificationService.uploadDocuments({
        userId,
        documentType,
        urls,
        documentSubType,
        selfieUrl, // Pass selfieUrl to service
        selfieWithIdUrl // Pass selfieWithIdUrl to service
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            documentType,
            uploadedAt: new Date(),
            status: "pending_review",
            nextSteps: this.getLandlordNextSteps(documentType)
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Check if user has uploaded all required documents
   */
  async checkDocumentCompletion(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      
      const result = await DocumentVerificationService.hasAllRequiredDocuments(userId);

      res.status(200).json({
        success: true,
        message: "Document completion check completed",
        data: {
          hasAllDocuments: result.hasAll,
          missingDocuments: result.missing,
          canSubmitForReview: true, // Always allow submission - admin will decide
          progress: this.calculateProgress(result.missing, (req as any).user.role),
          note: "You can submit for review with any number of documents. Admin will review manually."
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Submit documents for verification review
   */
  async submitForReview(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      
      // Check if already submitted
      const user = await User.findById(userId).select("documentVerification.status");
      if (user?.documentVerification.status === "verified") {
        return res.status(400).json({
          success: false,
          message: "Your documents are already verified"
        });
      }

      if (user?.documentVerification.status === "pending") {
        return res.status(400).json({
          success: false,
          message: "Your documents are already under review"
        });
      }

      // Update status from unverified/rejected to pending
      await User.findByIdAndUpdate(userId, {
        "documentVerification.status": "pending"
      });

      console.log(`✅ User ${userId} submitted documents for review - Admin can now see this request`);

      res.status(200).json({
        success: true,
        message: "Documents submitted for review successfully. Admin will review your submission.",
        data: {
          status: "pending",
          estimatedReviewTime: "24-48 hours",
          note: "Admin will review all submitted documents manually"
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get document upload progress
   */
  async getUploadProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      
      const requiredDocuments = DocumentVerificationService.getRequiredDocuments(userRole);
      const status = await DocumentVerificationService.getUserDocumentStatus(userId);
      
      // For tenants, also include optional documents in progress display
      const allDocumentTypes = userRole === "tenant" 
        ? [...requiredDocuments, "employmentLetter"]
        : requiredDocuments;
      
      const progress = allDocumentTypes.map(docType => {
        const doc = status?.documents[docType as keyof typeof status.documents];
        const isRequired = requiredDocuments.includes(docType);
        return {
          documentType: docType,
          isUploaded: !!doc,
          isRequired: isRequired,
          uploadedAt: doc?.uploadedAt || null,
          verified: doc?.verified || false,
          description: this.getDocumentDescription(docType)
        };
      });

      const completedRequiredCount = progress.filter(p => p.isRequired && p.isUploaded).length;
      const totalRequiredCount = requiredDocuments.length;
      const percentage = Math.round((completedRequiredCount / totalRequiredCount) * 100);

      res.status(200).json({
        success: true,
        message: "Upload progress retrieved successfully",
        data: {
          progress,
          summary: {
            completed: completedRequiredCount,
            total: totalRequiredCount,
            percentage,
            canSubmit: completedRequiredCount === totalRequiredCount // Only required documents needed
          }
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get valid document types for user role
   */
  private getValidDocumentTypes(role: string): string[] {
    if (role === "tenant") {
      return ["idDocument", "payslips", "utilityBills", "bankStatements", "employmentLetter"];
    } else if (role === "landlord") {
      return ["idDocument", "propertyProof", "propertyDocuments"];
    }
    return ["idDocument"];
  }

  /**
   * Get document descriptions
   */
  private getDocumentDescriptions(role: string): Record<string, string> {
    const descriptions: Record<string, Record<string, string>> = {
      tenant: {
        idDocument: "Government-issued ID (Passport, National ID, or Driver's License)",
        payslips: "Recent payslips (last 3 months)",
        utilityBills: "Utility bills (electricity, water, internet) in your name",
        bankStatements: "Bank statements (last 3 months)",
        employmentLetter: "Employment verification letter from your employer (optional)"
      },
      landlord: {
        idDocument: "Government-issued ID (Passport, National ID, or Driver's License)"
      }
    };

    return descriptions[role] || {};
  }

  /**
   * Get single document description
   */
  private getDocumentDescription(documentType: string): string {
    const descriptions: Record<string, string> = {
      idDocument: "Government-issued ID",
      payslips: "Recent payslips",
      utilityBills: "Utility bills",
      bankStatements: "Bank statements",
      employmentLetter: "Employment letter (optional)",
      propertyProof: "Property ownership proof",
      propertyDocuments: "Property documents"
    };

    return descriptions[documentType] || documentType;
  }

  /**
   * Calculate upload progress percentage
   */
  private calculateProgress(missing: string[], role: string): number {
    const requiredDocuments = DocumentVerificationService.getRequiredDocuments(role);
    const uploadedCount = requiredDocuments.length - missing.length;
    return Math.round((uploadedCount / requiredDocuments.length) * 100);
  }

  /**
   * Get next steps for tenant document upload
   */
  private getTenantNextSteps(documentType: string): string[] {
    const nextSteps: Record<string, string[]> = {
      idDocument: [
        "Upload your payslips to show income verification",
        "Add utility bills to prove address",
        "Include bank statements for financial verification"
      ],
      payslips: [
        "Upload utility bills in your name",
        "Add bank statements for financial verification",
        "Include employment letter from your employer"
      ],
      utilityBills: [
        "Upload bank statements for financial verification",
        "Add employment letter from your employer",
        "Ensure all documents are in your name"
      ],
      bankStatements: [
        "Upload employment letter from your employer",
        "Ensure all documents are recent (within 3 months)",
        "Verify all documents are in your name"
      ],
      employmentLetter: [
        "Upload any remaining financial documents",
        "Ensure all documents are recent and valid",
        "Submit for verification review"
      ]
    };

    return nextSteps[documentType] || ["Continue uploading required documents"];
  }

  /**
   * Get next steps for landlord document upload
   */
  private getLandlordNextSteps(documentType: string): string[] {
    const nextSteps: Record<string, string[]> = {
      idDocument: [
        "Review your uploaded ID document",
        "Ensure selfie and selfie with ID are clear",
        "Submit for verification review",
        "Note: Property ownership documents are uploaded per listing, not here"
      ]
    };

    return nextSteps[documentType] || ["Continue uploading required documents"];
  }

  /**
   * Delete/Remove a document
   */
  async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { documentType } = req.body;

      if (!documentType) {
        return res.status(400).json({
          success: false,
          message: "Document type is required"
        });
      }

      // Validate document type for user role
      const userRole = (req as any).user.role;
      const validDocumentTypes = this.getValidDocumentTypes(userRole);
      
      if (!validDocumentTypes.includes(documentType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid document type for ${userRole}. Allowed types: ${validDocumentTypes.join(", ")}`
        });
      }

      // Get user's current documents
      const user = await User.findById(userId).select("documentVerification");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Check if document exists
      const document = user.documentVerification.documents[documentType as keyof typeof user.documentVerification.documents];
      if (!document) {
        return res.status(404).json({
          success: false,
          message: "Document not found"
        });
      }

      // Check if verification is already verified
      if (user.documentVerification.status === "verified") {
        return res.status(400).json({
          success: false,
          message: "Cannot delete documents after verification is complete. Please contact support if you need to make changes."
        });
      }

      // Delete the document
      const updateData: any = {};
      updateData[`documentVerification.documents.${documentType}`] = null;

      await User.findByIdAndUpdate(userId, { $unset: updateData });

      console.log(`✅ Document deleted for user ${userId}: ${documentType}`);

      res.status(200).json({
        success: true,
        message: "Document deleted successfully",
        data: {
          documentType,
          deletedAt: new Date(),
          status: "deleted"
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get document details for a specific document type
   */
  async getDocumentDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { documentType } = req.params;

      if (!documentType) {
        return res.status(400).json({
          success: false,
          message: "Document type is required"
        });
      }

      // Validate document type for user role
      const userRole = (req as any).user.role;
      const validDocumentTypes = this.getValidDocumentTypes(userRole);
      
      if (!validDocumentTypes.includes(documentType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid document type for ${userRole}. Allowed types: ${validDocumentTypes.join(", ")}`
        });
      }

      const status = await DocumentVerificationService.getUserDocumentStatus(userId);

      if (!status) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const document = status.documents[documentType as keyof typeof status.documents];

      if (!document) {
        return res.status(404).json({
          success: false,
          message: "Document not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Document details retrieved successfully",
        data: {
          documentType,
          document,
          description: this.getDocumentDescription(documentType),
          canDelete: status.status !== "verified"
        }
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const appDocumentVerificationController = new AppDocumentVerificationController();

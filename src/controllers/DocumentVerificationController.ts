// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { DocumentVerificationService } from "../services/DocumentVerificationService";

export class DocumentVerificationController {
  /**
   * Upload documents for verification
   */
  async uploadDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { documentType, urls, documentSubType, selfieUrl, selfieWithIdUrl } = req.body;

      if (!documentType || !urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Document type and URLs are required"
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
          message: result.message
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
   * Get user's document verification status
   */
  async getUserDocumentStatus(req: Request, res: Response, next: NextFunction) {
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
        message: "Document status retrieved successfully",
        data: status
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get required documents for user's role
   */
  async getRequiredDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const userRole = (req as any).user.role;
      
      const requiredDocuments = DocumentVerificationService.getRequiredDocuments(userRole);

      res.status(200).json({
        success: true,
        message: "Required documents retrieved successfully",
        data: {
          role: userRole,
          requiredDocuments
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Check if user has all required documents
   */
  async checkRequiredDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      
      const result = await DocumentVerificationService.hasAllRequiredDocuments(userId);

      res.status(200).json({
        success: true,
        message: "Document check completed",
        data: result
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get all pending document verifications (Admin)
   */
  async getPendingVerifications(req: Request, res: Response, next: NextFunction) {
    try {
      const pendingVerifications = await DocumentVerificationService.getPendingVerifications();

      res.status(200).json({
        success: true,
        message: "Pending verifications retrieved successfully",
        data: pendingVerifications
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get all document verifications (Admin)
   */
  async getAllVerifications(req: Request, res: Response, next: NextFunction) {
    try {
      const allVerifications = await DocumentVerificationService.getAllVerifications();

      res.status(200).json({
        success: true,
        message: "All verifications retrieved successfully",
        data: allVerifications
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Verify user documents (Admin) - Approve
   */
  async verifyDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const { userId, adminFeedback } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required"
        });
      }

      const result = await DocumentVerificationService.verifyDocuments({
        userId,
        status: "verified",
        adminFeedback,
        rejectionReason: undefined,
        verifiedBy: adminId
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message
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
   * Reject user documents (Admin)
   */
  async rejectDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user._id;
      const { userId, rejectionReason, adminFeedback } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required"
        });
      }

      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required when rejecting documents"
        });
      }

      const result = await DocumentVerificationService.verifyDocuments({
        userId,
        status: "rejected",
        adminFeedback,
        rejectionReason,
        verifiedBy: adminId
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message
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
}

export const documentVerificationController = new DocumentVerificationController();

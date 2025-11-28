// @ts-nocheck
import { User } from "../models/User";
import { Types } from "mongoose";

export interface DocumentUploadData {
  userId: string;
  documentType: string;
  urls: string[];
  documentSubType?: string; // For ID document type
  selfieUrl?: string; // For ID document verification - selfie to compare with ID
}

export interface DocumentVerificationData {
  userId: string;
  status: "verified" | "rejected";
  adminFeedback?: string;
  rejectionReason?: string;
  verifiedBy: string;
}

export class DocumentVerificationService {
  /**
   * Upload documents for verification
   */
  static async uploadDocuments(data: DocumentUploadData): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findById(data.userId);
      if (!user) {
        return {
          success: false,
          message: "User not found"
        };
      }

      const updateData: any = {};
      const now = new Date();

      switch (data.documentType) {
        case "idDocument":
          updateData["documentVerification.documents.idDocument"] = {
            url: data.urls[0],
            type: data.documentSubType || "national_id",
            uploadedAt: now,
            verified: false,
            ...(data.selfieUrl && { selfieUrl: data.selfieUrl }) // Include selfie if provided
          };
          break;

        case "payslips":
          updateData["documentVerification.documents.payslips"] = {
            urls: data.urls,
            uploadedAt: now,
            verified: false
          };
          break;

        case "utilityBills":
          updateData["documentVerification.documents.utilityBills"] = {
            urls: data.urls,
            uploadedAt: now,
            verified: false
          };
          break;

        case "bankStatements":
          updateData["documentVerification.documents.bankStatements"] = {
            urls: data.urls,
            uploadedAt: now,
            verified: false
          };
          break;

        case "employmentLetter":
          updateData["documentVerification.documents.employmentLetter"] = {
            url: data.urls[0],
            uploadedAt: now,
            verified: false
          };
          break;

        case "propertyProof":
          updateData["documentVerification.documents.propertyProof"] = {
            urls: data.urls,
            uploadedAt: now,
            verified: false
          };
          break;

        case "propertyDocuments":
          updateData["documentVerification.documents.propertyDocuments"] = {
            urls: data.urls,
            uploadedAt: now,
            verified: false
          };
          break;

        default:
          return {
            success: false,
            message: "Invalid document type"
          };
      }

      // Set status to pending if not already verified
      if (user.documentVerification.status !== "verified") {
        updateData["documentVerification.status"] = "pending";
      }

      await User.findByIdAndUpdate(data.userId, { $set: updateData });

      console.log(`✅ Documents uploaded for user ${data.userId}: ${data.documentType}`);

      return {
        success: true,
        message: "Documents uploaded successfully. They will be reviewed by our team."
      };
    } catch (error) {
      console.error("❌ Error uploading documents:", error);
      throw error;
    }
  }

  /**
   * Get user's document verification status
   */
  static async getUserDocumentStatus(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId).select("documentVerification role firstName lastName email");
      if (!user) {
        return null;
      }

      return {
        userId: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        status: user.documentVerification.status,
        documents: user.documentVerification.documents,
        adminFeedback: user.documentVerification.adminFeedback,
        verifiedAt: user.documentVerification.verifiedAt,
        rejectedAt: user.documentVerification.rejectedAt,
        rejectionReason: user.documentVerification.rejectionReason
      };
    } catch (error) {
      console.error("❌ Error getting user document status:", error);
      throw error;
    }
  }

  /**
   * Get all pending document verifications (Admin)
   */
  static async getPendingVerifications(): Promise<any[]> {
    try {
      const users = await User.find({
        "documentVerification.status": "pending"
      }).select("firstName lastName email role documentVerification createdAt");

      return users.map(user => ({
        userId: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        status: user.documentVerification.status,
        documents: user.documentVerification.documents,
        submittedAt: user.createdAt
      }));
    } catch (error) {
      console.error("❌ Error getting pending verifications:", error);
      throw error;
    }
  }

  /**
   * Get all document verifications (Admin)
   */
  static async getAllVerifications(): Promise<any[]> {
    try {
      const users = await User.find({
        "documentVerification.status": { $in: ["pending", "verified", "rejected"] }
      })
      .select("firstName lastName email role documentVerification createdAt")
      .populate("documentVerification.verifiedBy", "firstName lastName")
      .populate("documentVerification.rejectedBy", "firstName lastName")
      .sort({ "documentVerification.verifiedAt": -1, "documentVerification.rejectedAt": -1, createdAt: -1 });

      return users.map(user => ({
        userId: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        status: user.documentVerification.status,
        documents: user.documentVerification.documents,
        adminFeedback: user.documentVerification.adminFeedback,
        verifiedAt: user.documentVerification.verifiedAt,
        verifiedBy: user.documentVerification.verifiedBy,
        rejectedAt: user.documentVerification.rejectedAt,
        rejectedBy: user.documentVerification.rejectedBy,
        rejectionReason: user.documentVerification.rejectionReason,
        submittedAt: user.createdAt
      }));
    } catch (error) {
      console.error("❌ Error getting all verifications:", error);
      throw error;
    }
  }

  /**
   * Verify user documents (Admin)
   */
  static async verifyDocuments(data: DocumentVerificationData): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findById(data.userId);
      if (!user) {
        return {
          success: false,
          message: "User not found"
        };
      }

      if (user.documentVerification.status === "verified") {
        return {
          success: false,
          message: "User is already verified"
        };
      }

      const updateData: any = {
        "documentVerification.status": data.status,
        "documentVerification.verifiedAt": new Date(),
        "documentVerification.verifiedBy": new Types.ObjectId(data.verifiedBy)
      };

      if (data.status === "verified") {
        updateData["documentVerification.adminFeedback"] = data.adminFeedback;
        updateData["isVerified"] = true; // Set user as verified
      } else {
        updateData["documentVerification.rejectedAt"] = new Date();
        updateData["documentVerification.rejectedBy"] = new Types.ObjectId(data.verifiedBy);
        updateData["documentVerification.rejectionReason"] = data.rejectionReason;
        updateData["documentVerification.adminFeedback"] = data.adminFeedback;
      }

      await User.findByIdAndUpdate(data.userId, { $set: updateData });

      console.log(`✅ Documents ${data.status} for user ${data.userId} by admin ${data.verifiedBy}`);

      return {
        success: true,
        message: `Documents ${data.status} successfully`
      };
    } catch (error) {
      console.error("❌ Error verifying documents:", error);
      throw error;
    }
  }

  /**
   * Check if user is document verified
   */
  static async isUserDocumentVerified(userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId).select("documentVerification.status");
      return user?.documentVerification.status === "verified";
    } catch (error) {
      console.error("❌ Error checking document verification:", error);
      return false;
    }
  }

  /**
   * Get required documents for role
   */
  static getRequiredDocuments(role: string): string[] {
    const commonDocuments = ["idDocument"];
    
    if (role === "tenant") {
      return [...commonDocuments, "payslips", "utilityBills", "bankStatements", "employmentLetter"];
    } else if (role === "landlord") {
      return [...commonDocuments, "propertyProof", "propertyDocuments"];
    }
    
    return commonDocuments;
  }

  /**
   * Check if user has uploaded all required documents
   */
  static async hasAllRequiredDocuments(userId: string): Promise<{ hasAll: boolean; missing: string[] }> {
    try {
      const user = await User.findById(userId).select("role documentVerification.documents");
      if (!user) {
        return { hasAll: false, missing: [] };
      }

      const requiredDocuments = this.getRequiredDocuments(user.role);
      const missing: string[] = [];

      for (const docType of requiredDocuments) {
        const doc = user.documentVerification.documents[docType as keyof typeof user.documentVerification.documents];
        if (!doc || (Array.isArray(doc) ? doc.length === 0 : !doc.url)) {
          missing.push(docType);
        }
      }

      return {
        hasAll: missing.length === 0,
        missing
      };
    } catch (error) {
      console.error("❌ Error checking required documents:", error);
      return { hasAll: false, missing: [] };
    }
  }
}

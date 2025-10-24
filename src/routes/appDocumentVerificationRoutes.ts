// @ts-nocheck
import express from "express";
import { appDocumentVerificationController } from "../controllers/AppDocumentVerificationController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Common verification routes
router.get("/status", authorize(["tenant", "landlord"]), appDocumentVerificationController.getVerificationStatus.bind(appDocumentVerificationController));
router.get("/completion", authorize(["tenant", "landlord"]), appDocumentVerificationController.checkDocumentCompletion.bind(appDocumentVerificationController));
router.post("/submit", authorize(["tenant", "landlord"]), appDocumentVerificationController.submitForReview.bind(appDocumentVerificationController));
router.get("/progress", authorize(["tenant", "landlord"]), appDocumentVerificationController.getUploadProgress.bind(appDocumentVerificationController));
router.delete("/document", authorize(["tenant", "landlord"]), appDocumentVerificationController.deleteDocument.bind(appDocumentVerificationController));
router.get("/document/:documentType", authorize(["tenant", "landlord"]), appDocumentVerificationController.getDocumentDetails.bind(appDocumentVerificationController));

// Tenant-specific routes
router.get("/tenant/required", authorize(["tenant"]), appDocumentVerificationController.getTenantRequiredDocuments.bind(appDocumentVerificationController));
router.post("/tenant/upload", authorize(["tenant"]), appDocumentVerificationController.uploadTenantDocument.bind(appDocumentVerificationController));

// Landlord-specific routes
router.get("/landlord/required", authorize(["landlord"]), appDocumentVerificationController.getLandlordRequiredDocuments.bind(appDocumentVerificationController));
router.post("/landlord/upload", authorize(["landlord"]), appDocumentVerificationController.uploadLandlordDocument.bind(appDocumentVerificationController));

export default router;

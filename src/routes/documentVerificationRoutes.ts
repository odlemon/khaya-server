import express from "express";
import { documentVerificationController } from "../controllers/DocumentVerificationController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// User document verification routes
router.post("/upload", authorize(["tenant", "landlord"]), documentVerificationController.uploadDocuments.bind(documentVerificationController));
router.get("/status", authorize(["tenant", "landlord"]), documentVerificationController.getUserDocumentStatus.bind(documentVerificationController));
router.get("/required", authorize(["tenant", "landlord"]), documentVerificationController.getRequiredDocuments.bind(documentVerificationController));
router.get("/check", authorize(["tenant", "landlord"]), documentVerificationController.checkRequiredDocuments.bind(documentVerificationController));

// Admin document verification routes
router.get("/admin/pending", authorize(["admin"]), documentVerificationController.getPendingVerifications.bind(documentVerificationController));
router.get("/admin/all", authorize(["admin"]), documentVerificationController.getAllVerifications.bind(documentVerificationController));
router.post("/admin/verify", authorize(["admin"]), documentVerificationController.verifyDocuments.bind(documentVerificationController));

export default router;

// @ts-nocheck
import express from "express";
import { documentVerificationController } from "../controllers/DocumentVerificationController";
import { authenticate, authorize } from "../middleware/authenticate";
import { requirePermission } from "../middleware/permissions";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// User document verification routes
router.post("/upload", authorize(["tenant", "landlord"]), documentVerificationController.uploadDocuments.bind(documentVerificationController));
router.get("/status", authorize(["tenant", "landlord"]), documentVerificationController.getUserDocumentStatus.bind(documentVerificationController));
router.get("/required", authorize(["tenant", "landlord"]), documentVerificationController.getRequiredDocuments.bind(documentVerificationController));
router.get("/check", authorize(["tenant", "landlord"]), documentVerificationController.checkRequiredDocuments.bind(documentVerificationController));

// Admin document verification routes
router.get("/admin/pending", authorize(["admin"]), requirePermission("khayalami.documents.view"), documentVerificationController.getPendingVerifications.bind(documentVerificationController));
router.get("/admin/all", authorize(["admin"]), requirePermission("khayalami.documents.view"), documentVerificationController.getAllVerifications.bind(documentVerificationController));
router.post("/admin/verify", authorize(["admin"]), requirePermission("khayalami.documents.verify"), documentVerificationController.verifyDocuments.bind(documentVerificationController));
router.post("/admin/reject", authorize(["admin"]), requirePermission("khayalami.documents.reject"), documentVerificationController.rejectDocuments.bind(documentVerificationController));

export default router;

// @ts-nocheck
import express from "express";
import { agreementController } from "../controllers/AgreementController";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authenticate";
import { requirePermission } from "../middleware/permissions";

const router = express.Router();

// All agreement routes require authentication
router.use(authenticate);

// Get connected landlords and tenants for agreement creation (admin only)
router.get("/connected-parties", 
  authorize(["admin"]),
  requirePermission("khayalami.agreements.view"),
  (req, res, next) => agreementController.getConnectedParties(req, res, next)
);

// Get agreement templates (public for authenticated users)
router.get("/templates", (req, res, next) => agreementController.getAgreementTemplates(req, res, next));
router.get("/templates/:id", (req, res, next) => agreementController.getAgreementTemplate(req, res, next));

// Get user's agreements (role-aware, legacy)
router.get("/", (req, res, next) => agreementController.getUserAgreements(req, res, next));

// Get agreements for landlord
router.get("/landlord", authorize(["landlord"]), (req, res, next) => agreementController.getLandlordAgreements(req, res, next));

// Get agreements for tenant
router.get("/tenant", authorize(["tenant"]), (req, res, next) => agreementController.getTenantAgreements(req, res, next));

// Get pending agreements for user
router.get("/pending", (req, res, next) => agreementController.getPendingAgreements(req, res, next));

// Get active agreements for user
router.get("/active", (req, res, next) => agreementController.getActiveAgreements(req, res, next));

// Get agreement statistics
router.get("/stats", (req, res, next) => agreementController.getAgreementStats(req, res, next));

// Get specific agreement by ID
router.get("/:id", (req, res, next) => agreementController.getAgreementById(req, res, next));

// Generate agreement PDF
router.get("/:id/pdf", (req, res, next) => agreementController.generateAgreementPDF(req, res, next));

// Generate agreement Word document from template (admin only)
router.post("/:id/generate-word", 
  authorize(["admin"]),
  requirePermission("khayalami.agreements.generate_word"),
  (req, res, next) => agreementController.generateAgreementWordDocument(req, res, next)
);

// Download generated agreement Word document
router.get("/:id/document/download", 
  authorize(["admin", "landlord", "tenant"]), 
  (req, res, next) => agreementController.generateAgreementWordDocument(req, res, next)
);

// Get agreement signatures
router.get("/:id/signatures", (req, res, next) => agreementController.getAgreementSignatures(req, res, next));

// Get agreement audit trail
router.get("/:id/audit-trail", (req, res, next) => agreementController.getAgreementAuditTrail(req, res, next));

// Create new agreement (admin only)
router.post("/", 
  authorize(["admin"]),
  requirePermission("khayalami.agreements.create"),
  (req, res, next) => agreementController.createAgreement(req, res, next)
);

router.post("/from-template", 
  authorize(["admin"]),
  requirePermission("khayalami.agreements.from_template"),
  (req, res, next) => agreementController.createAgreementFromTemplate(req, res, next)
);

// Update agreement (landlord only)
router.put("/:id", 
  authorize(["landlord"]), 
  (req, res, next) => agreementController.updateAgreement(req, res, next)
);

// Delete agreement (both landlord and tenant can delete draft/pending agreements)
router.delete("/:id", 
  authorize(["landlord", "tenant"]), 
  (req, res, next) => agreementController.deleteAgreement(req, res, next)
);

// Send agreement for review (landlord only)
router.post("/:id/review", 
  authorize(["landlord"]), 
  (req, res, next) => agreementController.sendForReview(req, res, next)
);

// Activate agreement (landlord only)
router.post("/:id/activate", 
  authorize(["landlord"]), 
  (req, res, next) => agreementController.activateAgreement(req, res, next)
);

// Sign agreement (both landlord and tenant)
router.post("/:id/sign", (req, res, next) => agreementController.signAgreement(req, res, next));

// Pay agreement fee online (tenant only)
router.post("/:id/pay-fee", 
  authorize(["tenant"]), 
  (req, res, next) => agreementController.payAgreementFee(req, res, next)
);

// Request termination (Step 1: Either party requests termination)
router.post("/:id/request-termination", (req, res, next) => agreementController.requestTermination(req, res, next));

// Confirm termination (Step 2: Other party confirms termination)
router.post("/:id/confirm-termination", (req, res, next) => agreementController.confirmTermination(req, res, next));

// Reject termination request
router.post("/:id/reject-termination", (req, res, next) => agreementController.rejectTermination(req, res, next));

// Cancel termination request (requester cancels their own request)
router.post("/:id/cancel-termination", (req, res, next) => agreementController.cancelTerminationRequest(req, res, next));

// Terminate agreement (both landlord and tenant) - DEPRECATED
router.post("/:id/terminate", (req, res, next) => agreementController.terminateAgreement(req, res, next));

// Upload attachment to agreement (both landlord and tenant)
router.post("/:id/attachments", (req, res, next) => agreementController.uploadAttachment(req, res, next));

// Verify signature (public for authenticated users)
router.get("/signatures/:signatureId/verify", (req, res, next) => agreementController.verifySignature(req, res, next));

// Admin: Get all agreements in the system
router.get("/admin/all", 
  authorize(["admin"]),
  requirePermission("khayalami.agreements.view"),
  (req, res, next) => agreementController.getAllAgreements(req, res, next)
);

export default router; 
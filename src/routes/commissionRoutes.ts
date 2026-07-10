//@ts-nocheck
import express from "express";
import { CommissionController } from "../controllers/CommissionController";
import { authenticate, authorize } from "../middleware/authenticate";
import { requirePermission } from "../middleware/permissions";

const router = express.Router();
const commissionController = new CommissionController();

// Commission recording endpoints (for payment system integration)
router.post("/online", 
  authenticate,
  (req, res, next) => commissionController.recordOnlineCommission(req, res, next)
);

router.post("/cash", 
  authenticate,
  (req, res, next) => commissionController.recordCashCommission(req, res, next)
);

// Landlord debt management
router.get("/landlord/:landlordId/debt",
  authenticate,
  authorize(["landlord", "admin"]),
  (req, res, next) => commissionController.getLandlordDebt(req, res, next)
);

router.get("/landlord/:landlordId/debt-breakdown",
  authenticate,
  authorize(["landlord", "admin"]),
  (req, res, next) => commissionController.getLandlordDebtBreakdown(req, res, next)
);

router.post("/landlord/:landlordId/collect-debt",
  authenticate,
  authorize(["landlord", "admin"]),
  (req, res, next) => commissionController.collectDebt(req, res, next)
);

// Admin endpoints for Khayalami earnings and management
router.get("/admin/earnings",
  authenticate,
  authorize(["admin"]),
  requirePermission("khayalami.commissions.view"),
  (req, res, next) => commissionController.getKhayalamiEarnings(req, res, next)
);

router.get("/admin/summary",
  authenticate,
  authorize(["admin"]),
  requirePermission("khayalami.commissions.view"),
  (req, res, next) => commissionController.getCommissionSummary(req, res, next)
);

router.get("/admin/all",
  authenticate,
  authorize(["admin"]),
  requirePermission("khayalami.commissions.view"),
  (req, res, next) => commissionController.getAllCommissions(req, res, next)
);

export default router;

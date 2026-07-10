// @ts-nocheck
import express from "express";
import { bankAdminController } from "../controllers/BankAdminController";
import { authenticate, authorize } from "../middleware/authenticate";
import { requirePermission } from "../middleware/permissions";

const router = express.Router();

router.use(authenticate);
router.use(authorize(["bank_admin"]));

router.get(
  "/summary",
  requirePermission("bank.dashboard.view"),
  (req, res, next) => bankAdminController.getSummary(req, res, next)
);

router.get(
  "/escrow/held-by-landlord",
  requirePermission("bank.escrow.view"),
  (req, res, next) => bankAdminController.getHeldLandlordBreakdown(req, res, next)
);

router.get(
  "/insurance-payouts",
  requirePermission("bank.insurance_payouts.view"),
  (req, res, next) => bankAdminController.listInsurancePartnerPayouts(req, res, next)
);

router.get(
  "/insurance-payouts/:payoutId",
  requirePermission("bank.insurance_payouts.view"),
  (req, res, next) => bankAdminController.getInsurancePartnerPayout(req, res, next)
);

router.post(
  "/insurance-payouts/:payoutId/mark-paid",
  requirePermission("bank.insurance_payouts.mark_paid"),
  (req, res, next) => bankAdminController.markInsurancePartnerPayoutPaid(req, res, next)
);

router.get(
  "/payouts",
  requirePermission("bank.payouts.view"),
  (req, res, next) => bankAdminController.listLandlordPayouts(req, res, next)
);

router.get(
  "/payouts/:payoutId",
  requirePermission("bank.payouts.view"),
  (req, res, next) => bankAdminController.getLandlordPayout(req, res, next)
);

router.post(
  "/payouts/:payoutId/mark-paid",
  requirePermission("bank.payouts.mark_paid"),
  (req, res, next) => bankAdminController.markLandlordPayoutPaid(req, res, next)
);

export default router;

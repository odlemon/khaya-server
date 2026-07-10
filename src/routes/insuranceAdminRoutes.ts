// @ts-nocheck
import express from "express";
import { insuranceAdminController } from "../controllers/InsuranceAdminController";
import { authenticate, authorize } from "../middleware/authenticate";
import { requirePermission } from "../middleware/permissions";

const router = express.Router();

router.use(authenticate);
router.use(authorize(["insurance_admin"]));

router.get(
  "/summary",
  requirePermission("insurance.dashboard.view"),
  (req, res, next) => insuranceAdminController.getSummary(req, res, next)
);

router.get(
  "/policies",
  requirePermission("insurance.policies.view"),
  (req, res, next) => insuranceAdminController.listPolicies(req, res, next)
);

router.get(
  "/policies/property/:propertyId",
  requirePermission("insurance.policies.view"),
  (req, res, next) => insuranceAdminController.getPolicyByPropertyId(req, res, next)
);

export default router;

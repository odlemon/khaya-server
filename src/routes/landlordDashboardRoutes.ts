// @ts-nocheck
import express from "express";
import { landlordDashboardController } from "../controllers/LandlordDashboardController";
import { landlordPaymentController } from "../controllers/LandlordPaymentController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = express.Router();

// Get landlord dashboard
router.get("/dashboard",
  authenticate,
  authorize(["landlord"]),
  (req, res, next) => landlordDashboardController.getLandlordDashboard(req, res, next)
);

// Get landlord payments with commission details
router.get("/payments",
  authenticate,
  authorize(["landlord"]),
  (req, res, next) => landlordPaymentController.getLandlordPayments(req, res, next)
);

// Get landlord payment statistics
router.get("/payments/stats",
  authenticate,
  authorize(["landlord"]),
  (req, res, next) => landlordPaymentController.getLandlordPaymentStats(req, res, next)
);

// Get landlord balance
router.get("/balance",
  authenticate,
  authorize(["landlord"]),
  (req, res, next) => landlordPaymentController.getLandlordBalance(req, res, next)
);

// Get earnings breakdown by property
router.get("/earnings/by-property",
  authenticate,
  authorize(["landlord"]),
  (req, res, next) => landlordDashboardController.getEarningsByProperty(req, res, next)
);

// Get zero deposit protection package data
router.get("/protection-package",
  authenticate,
  authorize(["landlord"]),
  (req, res, next) => landlordDashboardController.getProtectionPackageData(req, res, next)
);

export default router;

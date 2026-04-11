// @ts-nocheck
import express from "express";
import { bankAdminController } from "../controllers/BankAdminController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = express.Router();

router.use(authenticate);
router.use(authorize(["bank_admin"]));

router.get("/summary", (req, res, next) =>
  bankAdminController.getSummary(req, res, next),
);

router.get("/escrow/held-by-landlord", (req, res, next) =>
  bankAdminController.getHeldLandlordBreakdown(req, res, next),
);

router.get("/payouts", (req, res, next) =>
  bankAdminController.listLandlordPayouts(req, res, next),
);

router.get("/payouts/:payoutId", (req, res, next) =>
  bankAdminController.getLandlordPayout(req, res, next),
);

router.post("/payouts/:payoutId/mark-paid", (req, res, next) =>
  bankAdminController.markLandlordPayoutPaid(req, res, next),
);

export default router;

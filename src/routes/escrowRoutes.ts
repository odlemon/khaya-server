// @ts-nocheck
import { Router } from "express";
import { escrowController } from "../controllers/EscrowController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get escrow summary (Admin only)
router.get("/summary",
  authorize(["admin"]),
  (req, res, next) => escrowController.getEscrowSummary(req, res, next)
);

// Get landlord's escrow transactions (Landlord only)
router.get("/landlord/transactions",
  authorize(["landlord"]),
  (req, res, next) => escrowController.getLandlordEscrowTransactions(req, res, next)
);

// Manual distribution (Admin only)
router.post("/distribute",
  authorize(["admin"]),
  (req, res, next) => escrowController.distributeEscrow(req, res, next)
);

// Get distribution statistics (Admin only)
router.get("/stats",
  authorize(["admin"]),
  (req, res, next) => escrowController.getDistributionStats(req, res, next)
);

// Get all escrow transactions (Admin only)
router.get("/transactions",
  authorize(["admin"]),
  (req, res, next) => escrowController.getAllEscrowTransactions(req, res, next)
);

export default router;


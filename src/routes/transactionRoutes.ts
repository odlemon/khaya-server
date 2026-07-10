// @ts-nocheck
import { Router } from "express";
import { transactionController } from "../controllers/TransactionController";
import { authenticate, authorize } from "../middleware/authenticate";
import { requirePermission } from "../middleware/permissions";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all transactions (Admin only)
router.get("/",
  authorize(["admin"]),
  requirePermission("khayalami.transactions.view"),
  (req, res, next) => transactionController.getAllTransactions(req, res, next)
);

router.get("/summary",
  authorize(["admin"]),
  requirePermission("khayalami.transactions.view"),
  (req, res, next) => transactionController.getTransactionSummary(req, res, next)
);

export default router;








// @ts-nocheck
import { Router } from "express";
import { transactionController } from "../controllers/TransactionController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all transactions (Admin only)
router.get("/",
  authorize(["admin"]),
  (req, res, next) => transactionController.getAllTransactions(req, res, next)
);

// Get transaction summary (Admin only)
router.get("/summary",
  authorize(["admin"]),
  (req, res, next) => transactionController.getTransactionSummary(req, res, next)
);

export default router;








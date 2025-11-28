// @ts-nocheck
import { Router } from "express";
import { paymentController } from "../controllers/PaymentController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Tenant: Create new payment (for multiple payments)
router.post("/rental/:rentalId/create", 
  authorize(["tenant"]),
  (req, res, next) => paymentController.createNewPayment(req, res, next)
);

// Tenant: Submit payment
router.post("/:paymentId/submit", 
  authorize(["tenant"]),
  (req, res, next) => paymentController.submitPayment(req, res, next)
);

// Landlord: Verify payment
router.post("/:paymentId/verify", 
  authorize(["landlord"]),
  (req, res, next) => paymentController.verifyPayment(req, res, next)
);

// Landlord: Reject payment
router.post("/:paymentId/reject", 
  authorize(["landlord"]),
  (req, res, next) => paymentController.rejectPayment(req, res, next)
);

// Landlord: Get balance
router.get("/balance", 
  authorize(["landlord"]),
  (req, res, next) => paymentController.getLandlordBalance(req, res, next)
);

// Landlord: Update bank details
router.post("/balance/bank-details", 
  authorize(["landlord"]),
  (req, res, next) => paymentController.updateBankDetails(req, res, next)
);

// Landlord: Update mobile money details
router.post("/balance/mobile-money", 
  authorize(["landlord"]),
  (req, res, next) => paymentController.updateMobileMoneyDetails(req, res, next)
);

// Landlord: Request withdrawal
router.post("/withdrawals", 
  authorize(["landlord"]),
  (req, res, next) => paymentController.requestWithdrawal(req, res, next)
);

// Landlord: Get withdrawal history
router.get("/withdrawals", 
  authorize(["landlord"]),
  (req, res, next) => paymentController.getWithdrawalHistory(req, res, next)
);

// Landlord: Get transaction history
router.get("/transactions", 
  authorize(["landlord"]),
  (req, res, next) => paymentController.getTransactionHistory(req, res, next)
);

// Landlord: Get transactions + status summary
router.get("/transactions/status",
  authorize(["landlord"]),
  (req, res, next) => paymentController.getLandlordTransactionsWithStatus(req, res, next)
);

// Admin: Get all payments in the system
router.get("/admin/all", 
  authorize(["admin"]),
  (req, res, next) => paymentController.getAllPayments(req, res, next)
);

// Admin: Get all payments with commission data (earnings table)
router.get("/admin/earnings", 
  authorize(["admin"]),
  (req, res, next) => paymentController.getAllPaymentsWithCommissions(req, res, next)
);

export default router;


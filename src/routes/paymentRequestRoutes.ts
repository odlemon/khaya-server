// @ts-nocheck
import { Router } from "express";
import { paymentRequestController } from "../controllers/PaymentRequestController";
import { authenticate, authorize } from "../middleware/authenticate";
import { requirePermission } from "../middleware/permissions";

const router = Router();

// Create payment request (tenant)
router.post(
  "/",
  authenticate,
  paymentRequestController.createPaymentRequest.bind(paymentRequestController)
);

// Get pending requests (admin)
router.get(
  "/pending",
  authenticate,
  authorize(["admin"]),
  requirePermission("khayalami.payment_requests.view"),
  paymentRequestController.getPendingRequests.bind(paymentRequestController)
);

router.post(
  "/:id/approve",
  authenticate,
  authorize(["admin"]),
  requirePermission("khayalami.payment_requests.approve"),
  paymentRequestController.approvePaymentRequest.bind(paymentRequestController)
);

router.post(
  "/:id/reject",
  authenticate,
  authorize(["admin"]),
  requirePermission("khayalami.payment_requests.reject"),
  paymentRequestController.rejectPaymentRequest.bind(paymentRequestController)
);

// Get payment request by ID
router.get(
  "/:id",
  authenticate,
  paymentRequestController.getPaymentRequest.bind(paymentRequestController)
);

export default router;








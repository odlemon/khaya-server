// @ts-nocheck
import { Router } from "express";
import { paymentRequestController } from "../controllers/PaymentRequestController";
import { authenticate, authorize } from "../middleware/authenticate";

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
  paymentRequestController.getPendingRequests.bind(paymentRequestController)
);

// Approve payment request (admin)
router.post(
  "/:id/approve",
  authenticate,
  authorize(["admin"]),
  paymentRequestController.approvePaymentRequest.bind(paymentRequestController)
);

// Reject payment request (admin)
router.post(
  "/:id/reject",
  authenticate,
  authorize(["admin"]),
  paymentRequestController.rejectPaymentRequest.bind(paymentRequestController)
);

// Get payment request by ID
router.get(
  "/:id",
  authenticate,
  paymentRequestController.getPaymentRequest.bind(paymentRequestController)
);

export default router;





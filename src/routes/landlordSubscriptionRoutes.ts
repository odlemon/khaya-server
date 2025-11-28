// @ts-nocheck
import { Router } from "express";
import { landlordSubscriptionController } from "../controllers/LandlordSubscriptionController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = Router();

// All routes require authentication and landlord role
router.use(authenticate);
router.use(authorize(["landlord"]));

// Subscribe (in-app payment)
router.post(
  "/subscribe",
  landlordSubscriptionController.subscribe.bind(landlordSubscriptionController)
);

// Create subscription payment request (external payment)
router.post(
  "/request",
  landlordSubscriptionController.createSubscriptionRequest.bind(landlordSubscriptionController)
);

// Get subscription status
router.get(
  "/status",
  landlordSubscriptionController.getSubscriptionStatus.bind(landlordSubscriptionController)
);

// Cancel subscription
router.post(
  "/cancel",
  landlordSubscriptionController.cancelSubscription.bind(landlordSubscriptionController)
);

// Zero Deposit Protection - Subscribe (in-app payment)
router.post(
  "/zero-deposit-protection",
  landlordSubscriptionController.subscribeToZeroDepositProtection.bind(landlordSubscriptionController)
);

// Zero Deposit Protection - Create payment request (external payment)
router.post(
  "/zero-deposit-protection/request",
  landlordSubscriptionController.createZeroDepositProtectionRequest.bind(landlordSubscriptionController)
);

// Zero Deposit Protection - Get status
router.get(
  "/zero-deposit-protection/status",
  landlordSubscriptionController.getZeroDepositProtectionStatus.bind(landlordSubscriptionController)
);

// Zero Deposit Protection - Cancel
router.post(
  "/zero-deposit-protection/cancel",
  landlordSubscriptionController.cancelZeroDepositProtection.bind(landlordSubscriptionController)
);

export default router;


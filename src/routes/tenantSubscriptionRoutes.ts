// @ts-nocheck
import { Router } from "express";
import { tenantSubscriptionController } from "../controllers/TenantSubscriptionController";
import { authenticate, authorize } from "../middleware/authenticate";

const router = Router();

// All routes require authentication and tenant role
router.use(authenticate);
router.use(authorize(["tenant"]));

// Subscribe to zero-deposit access (in-app payment)
router.post(
  "/subscribe",
  tenantSubscriptionController.subscribe.bind(tenantSubscriptionController)
);

// Create subscription payment request (external payment)
router.post(
  "/request",
  tenantSubscriptionController.createSubscriptionRequest.bind(tenantSubscriptionController)
);

// Get subscription status
router.get(
  "/status",
  tenantSubscriptionController.getSubscriptionStatus.bind(tenantSubscriptionController)
);

// Get subscription history
router.get(
  "/history",
  tenantSubscriptionController.getSubscriptionHistory.bind(tenantSubscriptionController)
);

// Cancel subscription
router.post(
  "/cancel",
  tenantSubscriptionController.cancelSubscription.bind(tenantSubscriptionController)
);

export default router;







